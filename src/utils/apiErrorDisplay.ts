import { getApiErrorDetails, getApiErrorMessage } from './apiError';

/** Build one safe mutation error notification without leaking raw transport errors. */
export function getApiMutationErrorMessage(error: unknown, operationFallback: string): string {
  const details = getApiErrorDetails(error);
  const parsedMessage = getApiErrorMessage(error, operationFallback);
  const hasSafeReason = Boolean(details.message && details.message !== '系統發生錯誤');
  const lines = [
    `原因：${hasSafeReason ? parsedMessage : operationFallback}`,
    details.errorCode ? `錯誤代碼：${details.errorCode}` : undefined,
    details.correlationId ? `關聯識別碼：${details.correlationId}` : undefined,
  ];

  return lines.filter((line): line is string => Boolean(line)).join('\n');
}

export function getApiMutationErrorContent(error: unknown, operation: string, operationFallback = `${operation}失敗`): string {
  return [`操作失敗：${operation}`, getApiMutationErrorMessage(error, operationFallback)].join('\n');
}
