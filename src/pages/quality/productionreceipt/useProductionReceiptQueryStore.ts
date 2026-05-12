import { createListQueryStore } from '@/stores/useListQueryStore';
import { type BaseQueryParams } from '@/stores/useListQueryStore';

export interface ProductionReceiptQueryParams extends BaseQueryParams {
  documentNumber?: string;
  status?: string;
  dateRange?: [string, string] | null;
}

export const useProductionReceiptQueryStore = createListQueryStore<ProductionReceiptQueryParams>('productionReceipt', {
  documentNumber: undefined,
  status: undefined,
  dateRange: null,
});
