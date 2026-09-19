import { useAuthStore } from '@/stores/useAuthStore';

export type UploadChecksum = { algorithm: 'sha256'; value: string };

export type UploadSession = {
  uploadSessionId: string;
  method: 'PUT';
  uploadUrl: string;
  signedHeaders: Record<string, string>;
  expiresAt: string;
  /** Object key assigned by the backend; the client must not derive it. */
  objectKey: string;
  checksum?: UploadChecksum | null;
};

export type CreateUploadSessionRequest = {
  fileName: string;
  contentType: string;
  contentLength: number;
  referenceType: string;
  referenceId: string;
  checksum?: UploadChecksum;
};

export type CompleteUploadRequest = {
  etag: string;
  checksum?: UploadChecksum;
};

export type UploadErrorKind = 'cancelled' | 'network' | 'http' | 'expired';

export class FileAttachmentUploadError extends Error {
  readonly kind: UploadErrorKind;
  readonly status?: number;

  constructor(kind: UploadErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'FileAttachmentUploadError';
    this.kind = kind;
    this.status = status;
  }
}

export type UploadHttpClient = {
  createSession: (request: CreateUploadSessionRequest, signal?: AbortSignal) => Promise<UploadSession>;
  completeSession: (sessionId: string, body: CompleteUploadRequest, signal?: AbortSignal) => Promise<unknown>;
};

export type UploadPutClient = {
  put: (
    uploadUrl: string,
    file: Blob,
    signedHeaders: Record<string, string>,
    signal: AbortSignal | undefined,
    onProgress?: (percent: number) => void,
  ) => Promise<string>;
};

export type UploadAttachmentOptions = {
  tenantId: string;
  /** Kept for the existing JWT-compatible API route; it is not part of objectKey. */
  userId: number;
  referenceType: string;
  referenceId: string;
  checksum?: UploadChecksum;
  signal?: AbortSignal;
  maxAttempts?: number;
  http?: UploadHttpClient;
  put?: UploadPutClient;
  onProgress?: (percent: number) => void;
};

function uploadSessionPath(tenantId: string, userId: number): string {
  return `/api/v1/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(String(userId))}/file-attachments/upload-sessions`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new FileAttachmentUploadError('cancelled', 'Upload cancelled');
  }
}

function ensureNotExpired(expiresAt: string): void {
  if (Date.now() >= Date.parse(expiresAt)) {
    throw new FileAttachmentUploadError('expired', 'Upload session expired');
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function createDefaultHttpClient(tenantId: string, userId: number): UploadHttpClient {
  const sessionPath = uploadSessionPath(tenantId, userId);
  return {
    async createSession(request, signal) {
      let response: Response;
      try {
        response = await fetch(sessionPath, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal,
        });
      } catch (error) {
        if (isAbortError(error)) throw new FileAttachmentUploadError('cancelled', 'Upload cancelled');
        throw new FileAttachmentUploadError('network', 'Unable to create upload session');
      }
      if (!response.ok) {
        throw new FileAttachmentUploadError('http', `Upload session request failed (${response.status})`, response.status);
      }
      const payload = await readJson(response) as { data?: UploadSession } | UploadSession;
      const session = 'data' in payload && payload.data ? payload.data : payload;
      return session as UploadSession;
    },
    async completeSession(sessionId, body, signal) {
      let response: Response;
      try {
        response = await fetch(`${sessionPath}/${encodeURIComponent(sessionId)}/complete`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });
      } catch (error) {
        if (isAbortError(error)) throw new FileAttachmentUploadError('cancelled', 'Upload cancelled');
        throw new FileAttachmentUploadError('network', 'Unable to complete upload');
      }
      if (!response.ok) {
        throw new FileAttachmentUploadError('http', `Upload completion failed (${response.status})`, response.status);
      }
      return readJson(response);
    },
  };
}

function createDefaultPutClient(): UploadPutClient {
  return {
    put(uploadUrl, file, signedHeaders, signal, onProgress) {
      return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('PUT', uploadUrl);
        Object.entries(signedHeaders).forEach(([name, value]) => request.setRequestHeader(name, value));
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
        };
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) {
            const etag = request.getResponseHeader('ETag');
            if (!etag) {
              reject(new FileAttachmentUploadError('http', 'Upload response did not include ETag', request.status));
              return;
            }
            resolve(etag);
            return;
          }
          reject(new FileAttachmentUploadError('http', `Direct upload failed (${request.status})`, request.status));
        };
        request.onerror = () => reject(new FileAttachmentUploadError('network', 'Direct upload failed'));
        request.onabort = () => reject(new FileAttachmentUploadError('cancelled', 'Upload cancelled'));
        if (signal) {
          signal.addEventListener('abort', () => request.abort(), { once: true });
        }
        request.send(file);
      });
    },
  };
}

function canRetry(error: unknown, expiresAt: string | undefined): boolean {
  if (!(error instanceof FileAttachmentUploadError) || !['network', 'http'].includes(error.kind)) return false;
  if (error.kind === 'http' && (error.status === undefined || error.status < 500)) return false;
  return !expiresAt || Date.now() < Date.parse(expiresAt);
}

export async function uploadAttachment(file: Blob, options: UploadAttachmentOptions): Promise<UploadSession> {
  const http = options.http ?? createDefaultHttpClient(options.tenantId, options.userId);
  const put = options.put ?? createDefaultPutClient();
  const maxAttempts = Math.max(1, options.maxAttempts ?? 1);
  let lastExpiresAt: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    ensureNotAborted(options.signal);
    let session: UploadSession | undefined;
    try {
      session = await http.createSession({
        fileName: file instanceof File ? file.name : 'attachment',
        contentType: file.type || 'application/octet-stream',
        contentLength: file.size,
        referenceType: options.referenceType,
        referenceId: options.referenceId,
        checksum: options.checksum,
      }, options.signal);
      lastExpiresAt = session.expiresAt;
      if (session.method !== 'PUT') throw new FileAttachmentUploadError('http', 'Unsupported upload method');
      ensureNotExpired(session.expiresAt);
      options.onProgress?.(0);
      const etag = await put.put(session.uploadUrl, file, session.signedHeaders, options.signal, options.onProgress);
      ensureNotAborted(options.signal);
      ensureNotExpired(session.expiresAt);
      await http.completeSession(session.uploadSessionId, { etag, checksum: options.checksum }, options.signal);
      options.onProgress?.(100);
      return session;
    } catch (error) {
      if (isAbortError(error) || (error instanceof FileAttachmentUploadError && error.kind === 'cancelled')) {
        throw new FileAttachmentUploadError('cancelled', 'Upload cancelled');
      }
      const normalized = error instanceof FileAttachmentUploadError
        ? error
        : new FileAttachmentUploadError('network', 'Upload failed');
      if (attempt < maxAttempts && canRetry(normalized, session?.expiresAt ?? lastExpiresAt)) continue;
      throw normalized;
    }
  }
  throw new FileAttachmentUploadError('network', 'Upload failed');
}
