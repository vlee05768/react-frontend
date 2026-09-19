import { describe, expect, it, vi } from 'vitest';

import {
  FileAttachmentUploadError,
  uploadAttachment,
  type UploadHttpClient,
  type UploadPutClient,
} from './fileAttachmentUpload';

const session = {
  uploadSessionId: 'session-1',
  method: 'PUT' as const,
  uploadUrl: 'https://storage.example/upload',
  signedHeaders: {
    'x-amz-content-sha256': 'signed-value',
    'x-custom-header': 'keep-this-order-and-value',
  },
  expiresAt: '2099-01-01T00:00:00.000Z',
  objectKey: 'attachments/object-key',
};

function createHttpClient(overrides: Partial<UploadHttpClient> = {}): UploadHttpClient {
  return {
    createSession: vi.fn().mockResolvedValue(session),
    completeSession: vi.fn().mockResolvedValue({ status: 'completed' }),
    ...overrides,
  };
}

function createPutClient(overrides: Partial<UploadPutClient> = {}): UploadPutClient {
  return {
    put: vi.fn().mockResolvedValue('"etag-from-storage"'),
    ...overrides,
  };
}

describe('uploadAttachment', () => {
  it('uses the tenant and authenticated user route parameters for session APIs', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: session }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { status: 'completed' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await uploadAttachment(new File(['contents'], 'a.txt', { type: 'text/plain' }), {
      tenantId: 'tenant-1',
      userId: 7,
      referenceType: 'Material',
      referenceId: 'M-1',
      put: createPutClient(),
    });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/tenants/tenant-1/users/7/file-attachments/upload-sessions');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/tenants/tenant-1/users/7/file-attachments/upload-sessions/session-1/complete');
    vi.unstubAllGlobals();
  });

  it('applies signed headers verbatim and calls create, PUT, complete in order', async () => {
    const order: string[] = [];
    const http = createHttpClient({
      createSession: vi.fn(async () => {
        order.push('create');
        return session;
      }),
      completeSession: vi.fn(async (_id, body) => {
        order.push('complete');
        expect(body.etag).toBe('"etag-from-storage"');
        return { status: 'completed' };
      }),
    });
    const put = createPutClient({
      put: vi.fn(async (_url, _file, headers) => {
        order.push('put');
        expect(headers).toEqual(session.signedHeaders);
        return '"etag-from-storage"';
      }),
    });

    await uploadAttachment(new File(['contents'], 'a.txt', { type: 'text/plain' }), {
      tenantId: '1',
      userId: 7,
      referenceType: 'Material',
      referenceId: 'M-1',
      http,
      put,
    });

    expect(order).toEqual(['create', 'put', 'complete']);
  });

  it('does not report a user cancellation as an upload error', async () => {
    const controller = new AbortController();
    controller.abort();
    const http = createHttpClient();
    const put = createPutClient({
      put: vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError')),
    });

    await expect(uploadAttachment(new File(['contents'], 'a.txt'), {
      tenantId: '1',
      userId: 7,
      referenceType: 'Material',
      referenceId: 'M-1',
      http,
      put,
      signal: controller.signal,
    })).rejects.toMatchObject({ kind: 'cancelled' });
  });

  it('does not retry after the session expires', async () => {
    const expiredSession = { ...session, expiresAt: '2020-01-01T00:00:00.000Z' };
    const http = createHttpClient({ createSession: vi.fn().mockResolvedValue(expiredSession) });
    const put = createPutClient();

    await expect(uploadAttachment(new File(['contents'], 'a.txt'), {
      tenantId: '1',
      userId: 7,
      referenceType: 'Material',
      referenceId: 'M-1',
      http,
      put,
      maxAttempts: 3,
    })).rejects.toMatchObject({ kind: 'expired' });
    expect(put.put).not.toHaveBeenCalled();
    expect(http.createSession).toHaveBeenCalledTimes(1);
  });

  it('sends the exact ETag returned by PUT to complete', async () => {
    const http = createHttpClient();
    const put = createPutClient({ put: vi.fn().mockResolvedValue('W/"raw-etag"') });

    await uploadAttachment(new File(['contents'], 'a.txt'), {
      tenantId: '1',
      userId: 7,
      referenceType: 'Product',
      referenceId: 'P-1',
      http,
      put,
    });

    expect(http.completeSession).toHaveBeenCalledWith('session-1', {
      etag: 'W/"raw-etag"',
      checksum: undefined,
    }, undefined);
  });

  it('classifies HTTP failures separately from network failures', async () => {
    const http = createHttpClient({
      createSession: vi.fn().mockRejectedValue(new FileAttachmentUploadError('http', 'HTTP 409')),
    });

    await expect(uploadAttachment(new File(['contents'], 'a.txt'), {
      tenantId: '1',
      userId: 7,
      referenceType: 'Product',
      referenceId: 'P-1',
      http,
      put: createPutClient(),
    })).rejects.toMatchObject({ kind: 'http' });
  });
});
