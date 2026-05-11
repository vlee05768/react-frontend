import { createListQueryStore, BaseQueryParams } from '@/stores/useListQueryStore';

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
