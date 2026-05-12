import { createListQueryStore } from '@/stores/useListQueryStore';
import { type BaseQueryParams } from '@/stores/useListQueryStore';

export interface QcReceiptQueryParams extends BaseQueryParams {
  documentNumber?: string;
  dateRange?: [string, string] | null;
}

export const useQcReceiptQueryStore = createListQueryStore<QcReceiptQueryParams>('qcReceipt', {
  documentNumber: undefined,
  dateRange: null,
});
