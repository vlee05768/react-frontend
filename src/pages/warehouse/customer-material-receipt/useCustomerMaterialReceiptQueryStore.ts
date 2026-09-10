import { createListQueryStore } from '@/stores/useListQueryStore';
import { type BaseQueryParams } from '@/stores/useListQueryStore';

export interface CustomerMaterialReceiptQueryParams extends BaseQueryParams {
  subType?: string;
  documentNumber?: string;
  businessPartnerCode?: string;
  dateRange?: [string, string] | null;
  status?: string;
}

export const useCustomerMaterialReceiptQueryStore = createListQueryStore<CustomerMaterialReceiptQueryParams>('customerMaterialReceipt', {
  subType: undefined,
  documentNumber: undefined,
  businessPartnerCode: undefined,
  dateRange: null,
  status: undefined,
});
