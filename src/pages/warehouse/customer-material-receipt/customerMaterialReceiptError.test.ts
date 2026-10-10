import { describe, expect, it } from 'vitest';
import { getApiMutationErrorMessage } from '@/utils/apiErrorDisplay';

describe('customer material receipt mutation errors', () => {
  it('shows the safe reason, error code, and correlation id', () => {
    expect(getApiMutationErrorMessage({
      response: {
        data: {
          message: '入庫單已確認，無法修改',
          errorCode: 'RECEIPT_LOCKED',
          correlationId: 'corr-cmr-123',
        },
      },
    }, '更新失敗')).toBe('原因：入庫單已確認，無法修改\n錯誤代碼：RECEIPT_LOCKED\n關聯識別碼：corr-cmr-123');
  });

  it('uses the operation fallback when no safe API reason exists', () => {
    expect(getApiMutationErrorMessage({ response: { data: {} } }, '更新失敗'))
      .toBe('原因：更新失敗');
    expect(getApiMutationErrorMessage({ response: { data: { message: 'SQL connection failed at server=prod' } } }, '更新失敗'))
      .toBe('原因：更新失敗');
  });
});
