import { describe, expect, it } from 'vitest';
import { getApiMutationErrorMessage } from '@/utils/apiErrorDisplay';

describe('IQC mutation errors', () => {
  it('renders safe diagnostic fields returned by the API', () => {
    expect(getApiMutationErrorMessage({
      response: {
        data: {
          message: '尚有未完成的檢驗卷卡',
          errorCode: 'IQC_INCOMPLETE_ROLLS',
          correlationId: 'corr-iqc-456',
        },
      },
    }, '過帳失敗')).toContain('原因：尚有未完成的檢驗卷卡');
    expect(getApiMutationErrorMessage({
      response: {
        data: {
          message: '尚有未完成的檢驗卷卡',
          errorCode: 'IQC_INCOMPLETE_ROLLS',
          correlationId: 'corr-iqc-456',
        },
      },
    }, '過帳失敗')).toContain('錯誤代碼：IQC_INCOMPLETE_ROLLS');
    expect(getApiMutationErrorMessage({
      response: {
        data: {
          message: '尚有未完成的檢驗卷卡',
          errorCode: 'IQC_INCOMPLETE_ROLLS',
          correlationId: 'corr-iqc-456',
        },
      },
    }, '過帳失敗')).toContain('關聯識別碼：corr-iqc-456');
  });

  it('does not display raw Error text when it is absent and falls back to the operation', () => {
    expect(getApiMutationErrorMessage(new Error(''), '儲存草稿失敗'))
      .toBe('原因：儲存草稿失敗');
  });
});
