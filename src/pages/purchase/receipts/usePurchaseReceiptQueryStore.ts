import { createListQueryStore } from '@/stores/useListQueryStore';
import { type BaseQueryParams } from '@/stores/useListQueryStore';

export interface PurchaseReceiptQueryParams extends BaseQueryParams {
  documentNumber?: string;
  purchaseOrderNumber?: string;
  dateRange?: [string, string] | null;
  status?: string;
}

export const usePurchaseReceiptQueryStore = createListQueryStore<PurchaseReceiptQueryParams>('purchaseReceipt', {
  documentNumber: undefined,
  purchaseOrderNumber: undefined,
  dateRange: null,
  status: undefined,
});
