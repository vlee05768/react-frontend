import { describe, expect, it } from 'vitest';

import { unwrapAttachmentData } from './FileAttachmentZone';
import { getApiMutationErrorMessage } from '@/utils/apiErrorDisplay';

describe('FileAttachmentZone API response contract', () => {
  it('unwraps the ApiResponse data array used by Get and BatchUpload', () => {
    const attachments = [{ id: 7, fileName: 'spec.pdf' }];

    expect(unwrapAttachmentData<{ id: number; fileName: string }[]>({ data: attachments })).toEqual(attachments);
  });

  it('unwraps a single ApiResponse data object used by GetById', () => {
    const attachment = { id: 7, fileName: 'spec.pdf' };

    expect(unwrapAttachmentData<{ id: number; fileName: string }>({ data: attachment })).toEqual(attachment);
  });

  it('keeps compatibility with the previous raw array response without accepting invalid shapes', () => {
    const attachments = [{ id: 7, fileName: 'spec.pdf' }];

    expect(unwrapAttachmentData<{ id: number; fileName: string }[]>(attachments)).toEqual(attachments);
    expect(unwrapAttachmentData<{ id: number; fileName: string }[]>({ data: null })).toBeUndefined();
    expect(unwrapAttachmentData<{ id: number; fileName: string }[]>({ error: 'not safe to render' })).toBeUndefined();
  });

  it('uses the shared safe error parser and never exposes raw exceptions', () => {
    expect(getApiMutationErrorMessage({
      response: {
        data: {
          message: '附件查詢失敗',
          errorCode: 'INTERNAL_ERROR',
          correlationId: 'corr-attachment-1',
        },
      },
    }, '取得附件失敗')).toBe('原因：附件查詢失敗\n錯誤代碼：INTERNAL_ERROR\n關聯識別碼：corr-attachment-1');

    expect(getApiMutationErrorMessage({
      response: { data: { message: 'SQL connection string server=prod' } },
      stack: 'Error: sensitive raw exception',
    }, '取得附件失敗')).toBe('原因：取得附件失敗');
  });
});
