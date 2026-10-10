export type ApiErrorDetails = {
  message?: string;
  errorCode?: string;
  correlationId?: string;
};

type UnknownRecord = Record<string, unknown>;
const SAFE_FALLBACK = '系統發生錯誤';
const MAX_ERROR_CODE_LENGTH = 64;
const MAX_CORRELATION_ID_LENGTH = 128;
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9]*(?:[_-][A-Z0-9]+)*$/;
const SAFE_CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

const SENSITIVE_CONTENT = [
  /(?:select|insert|update|delete|from|where|join)\s+.+(?:\bfrom\b|\binto\b|\bwhere\b|\bvalues\b)/i,
  /(?:sql|sqlite|postgres(?:ql)?|mysql|mssql|ora-\d+)/i,
  /(?:stack\s*trace|traceback|at\s+.+\(.+\)|system\.[a-z]+(?:exception|reflection))/i,
  /(?:connection\s*string|server=|data\s*source=|host=|initial\s+catalog=|user\s*id=|password=)/i,
  /(?:bearer\s+|access[_-]?token|refresh[_-]?token|api[_-]?key|client_secret|password\s*[:=])/i,
  /https?:\/\/[^\s]+[?&](?:sig|se|sp|sv|sr|st|skoid|sktid|se)=/i,
];

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null
);

const safeString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const isSensitive = (value: string): boolean => SENSITIVE_CONTENT.some((pattern) => pattern.test(value));

const safeDiagnosticId = (
  value: unknown,
  pattern: RegExp,
  maxLength: number,
): string | undefined => {
  const text = safeString(value);
  if (!text || text.length > maxLength || !pattern.test(text) || isSensitive(text) || /(?:token|password|secret|bearer)/i.test(text)) return undefined;
  return text;
};

type SafeText = { value?: string; unsafe: boolean };

const safeText = (value: unknown): SafeText => {
  const text = safeString(value);
  if (!text) return { unsafe: false };
  return isSensitive(text) ? { unsafe: true } : { value: text, unsafe: false };
};

function getValidationMessage(errors: unknown): SafeText {
  if (!isRecord(errors)) return { unsafe: false };

  const messages: string[] = [];
  let unsafe = false;
  Object.values(errors).forEach((value) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      const result = safeText(item);
      unsafe ||= result.unsafe;
      if (result.value) messages.push(result.value);
    });
  });

  return { value: messages.length > 0 ? messages.join('\n') : undefined, unsafe };
}

function getPayloadDetails(payload: unknown): ApiErrorDetails {
  if (!isRecord(payload)) return {};

  const validationMessage = getValidationMessage(payload.errors);
  const messageCandidates = [payload.message, payload.detail, payload.title];
  const selectedMessage = messageCandidates.map(safeText).find((result) => result.value || result.unsafe);
  const message = validationMessage.unsafe
    ? SAFE_FALLBACK
    : (validationMessage.value || (selectedMessage?.unsafe ? SAFE_FALLBACK : selectedMessage?.value));

  return {
    ...(message ? { message } : {}),
    ...(safeDiagnosticId(payload.errorCode, SAFE_ERROR_CODE, MAX_ERROR_CODE_LENGTH)
      ? { errorCode: safeDiagnosticId(payload.errorCode, SAFE_ERROR_CODE, MAX_ERROR_CODE_LENGTH) } : {}),
    ...(safeDiagnosticId(payload.correlationId, SAFE_CORRELATION_ID, MAX_CORRELATION_ID_LENGTH)
      ? { correlationId: safeDiagnosticId(payload.correlationId, SAFE_CORRELATION_ID, MAX_CORRELATION_ID_LENGTH) } : {}),
  };
}

/** Extracts only safe, user-facing fields from common API error shapes. */
export function getApiErrorDetails(err: unknown): ApiErrorDetails {
  if (typeof err === 'string') return {};
  if (!isRecord(err)) return {};

  const response = isRecord(err.response) ? err.response : undefined;
  const responseData = response?.data;
  const heyApiError = err.error;
  const candidates = [responseData, heyApiError, err instanceof Error ? undefined : err];

  const details = candidates.reduce<ApiErrorDetails>((current, candidate) => {
    const next = getPayloadDetails(candidate);
    return {
      message: current.message || next.message,
      errorCode: current.errorCode || next.errorCode,
      correlationId: current.correlationId || next.correlationId,
    };
  }, {});

  const responseHeaders = isRecord(response?.headers) ? response.headers : undefined;
  const headerCorrelationId = responseHeaders
    ? safeString(responseHeaders['x-correlation-id']) || safeString(responseHeaders['X-Correlation-ID'])
    : undefined;

  return {
    ...details,
    correlationId: details.correlationId || safeDiagnosticId(headerCorrelationId, SAFE_CORRELATION_ID, MAX_CORRELATION_ID_LENGTH),
    message: details.message,
  };
}

export function getApiErrorMessage(err: unknown, defaultMessage = '未知錯誤'): string {
  return getApiErrorDetails(err).message || defaultMessage;
}
