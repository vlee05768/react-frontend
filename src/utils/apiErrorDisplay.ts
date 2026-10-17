import { getApiErrorDetails, getApiErrorMessage } from './apiError';

const SENSITIVE_AUTH_ERROR = /(?:token|bearer|password|secret|identity|user\s*(?:not\s+found|does\s+not\s+exist)|account\s*(?:not\s+found|does\s+not\s+exist)|使用者|帳號|身分|識別)/i;

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

export const MATERIAL_DELETE_BLOCKED_MESSAGES: Record<string, string> = {
  MATERIAL_REFERENCED_BY_PURCHASE_ORDER: '該原料已被採購單引用，無法刪除。',
  MATERIAL_REFERENCED_BY_PURCHASE_RECEIPT: '該原料已被進貨單引用，無法刪除。',
  MATERIAL_REFERENCED_BY_BOM: '該原料已被 BOM 配方引用，無法刪除。',
  MATERIAL_REFERENCED_BY_WORK_ORDER: '該原料已被生產工單用料引用，無法刪除。',
  MATERIAL_HAS_ROLL: '該原料已存在實體 LPN 捲卡/片包庫存記錄，無法刪除。',
  MATERIAL_HAS_LOT: '該原料已存在實體庫存批次記錄，無法刪除。',
};

export function isMaterialDeleteBlockedCode(errorCode?: string): boolean {
  if (!errorCode) return false;
  return errorCode in MATERIAL_DELETE_BLOCKED_MESSAGES;
}

export interface MaterialDeleteNotice {
  isBlocked: boolean;
  title: string;
  content: string;
}

/** 針對原料刪除進行業務規則阻擋分析，區分業務警示與一般系統錯誤 */
export function getMaterialDeleteNotice(error: unknown): MaterialDeleteNotice {
  const details = getApiErrorDetails(error);
  const code = details.errorCode;

  if (code && isMaterialDeleteBlockedCode(code)) {
    const defaultMsg = MATERIAL_DELETE_BLOCKED_MESSAGES[code];
    const safeReason = details.message && details.message !== '系統發生錯誤' ? details.message : defaultMsg;
    const lines = [
      `原因：${safeReason}`,
      `錯誤代碼：${code}`,
      details.correlationId ? `關聯識別碼：${details.correlationId}` : undefined,
    ].filter(Boolean) as string[];

    return {
      isBlocked: true,
      title: '無法刪除原料（業務規則限制）',
      content: lines.join('\n'),
    };
  }

  return {
    isBlocked: false,
    title: '錯誤提示',
    content: getApiMutationErrorMessage(error, '刪除失敗'),
  };
}

export function getApiMutationErrorContent(error: unknown, operation: string, operationFallback = `${operation}失敗`): string {
  return [`操作失敗：${operation}`, getApiMutationErrorMessage(error, operationFallback)].join('\n');
}

/** Build an auth error message with account-enumeration and credential masking. */
export function getAuthErrorMessage(
  error: unknown,
  fallback: string,
  options: { hideReason?: boolean } = {},
): string {
  const details = getApiErrorDetails(error);
  const reason = !options.hideReason
    && details.message
    && details.message !== '系統發生錯誤'
    && !SENSITIVE_AUTH_ERROR.test(details.message)
    ? details.message
    : fallback;
  const lines = [
    reason,
    details.errorCode ? `錯誤代碼：${details.errorCode}` : undefined,
    details.correlationId ? `關聯識別碼：${details.correlationId}` : undefined,
  ];

  return lines.filter((line): line is string => Boolean(line)).join('\n');
}
