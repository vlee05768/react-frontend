import { create } from 'zustand';
import dayjs from 'dayjs';

interface CustomerStatementQueryParams {
  customerCode?: string;
  dateRange?: [string, string] | null;
  pageNumber: number;
  pageSize: number;
}

interface CustomerStatementQueryState {
  params: CustomerStatementQueryParams;
  setParams: (params: Partial<CustomerStatementQueryParams>) => void;
  resetParams: () => void;
}

const defaultParams: CustomerStatementQueryParams = {
  customerCode: undefined,
  dateRange: [
    dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
    dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
  ],
  pageNumber: 1,
  pageSize: 20,
};

const useCustomerStatementQueryStore = create<CustomerStatementQueryState>((set) => ({
  params: defaultParams,
  setParams: (newParams) => set((state) => ({ params: { ...state.params, ...newParams } })),
  resetParams: () => set({ params: defaultParams }),
}));

export default useCustomerStatementQueryStore;
