import { createListQueryStore } from '@/stores/useListQueryStore';
import { type BaseQueryParams } from '@/stores/useListQueryStore';

export interface ProductionReceiptQueryParams extends BaseQueryParams {
  documentNumber?: string;
  dateRange?: [string, string] | null;
}

export const useProductionReceiptQueryStore = createListQueryStore<ProductionReceiptQueryParams>('productionReceipt', {
  documentNumber: undefined,
  dateRange: null,
});
