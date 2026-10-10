import { describe, expect, it } from 'vitest';
import { getApiMutationErrorContent } from './apiErrorDisplay';

describe('getApiMutationErrorContent', () => {
  it('renders operation and safe diagnostic fields', () => {
    expect(getApiMutationErrorContent({
      response: { data: {
        message: '訂單尚未建立 BOM', errorCode: 'BUSINESS_RULE_ERROR', correlationId: 'corr-order-123',
      } },
    }, '確認訂單')).toBe(
      '操作失敗：確認訂單\n原因：訂單尚未建立 BOM\n錯誤代碼：BUSINESS_RULE_ERROR\n關聯識別碼：corr-order-123',
    );
  });

  it('uses the caller fallback instead of a raw Error.message', () => {
    expect(getApiMutationErrorContent(new Error('raw internal exception'), '結案訂單'))
      .toBe('操作失敗：結案訂單\n原因：結案訂單失敗');
  });
});