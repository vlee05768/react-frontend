import { createListQueryStore } from '@/stores/useListQueryStore';
import { type BaseQueryParams } from '@/stores/useListQueryStore';

export interface CustomerMaterialReceiptQueryParams extends BaseQueryParams {
  documentNumber?: string;
  businessPartnerCode?: string;
  dateRange?: [string, string] | null;
  status?: string;
}

export const useCustomerMaterialReceiptQueryStore = createListQueryStore<CustomerMaterialReceiptQueryParams>('customerMaterialReceipt', {
  documentNumber: undefined,
  businessPartnerCode: undefined,
  dateRange: null,
  status: undefined,
});
