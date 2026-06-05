import { create } from 'zustand';
import { DEFAULT_PAGE_SIZE } from '@/constants/ui';

interface PurchaseOrderQueryState {
  params: Record<string, any>;
  setParams: (newParams: Record<string, any>) => void;
  resetParams: () => void;
}

const defaultParams = {
  pageNumber: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const usePurchaseOrderQueryStore = create<PurchaseOrderQueryState>((set) => ({
  params: defaultParams,
  setParams: (newParams) =>
    set((state) => ({ params: { ...state.params, ...newParams } })),
  resetParams: () => set({ params: defaultParams }),
}));

export default usePurchaseOrderQueryStore;
