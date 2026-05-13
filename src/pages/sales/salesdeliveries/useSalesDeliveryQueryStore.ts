import { create } from 'zustand';
import { DEFAULT_PAGE_SIZE } from '@/constants/ui';

interface SalesDeliveryQueryState {
  params: Record<string, any>;
  setParams: (newParams: Record<string, any>) => void;
  resetParams: () => void;
}

const defaultParams = {
  pageNumber: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const useSalesDeliveryQueryStore = create<SalesDeliveryQueryState>((set) => ({
  params: defaultParams,
  setParams: (newParams) =>
    set((state) => ({ params: { ...state.params, ...newParams } })),
  resetParams: () => set({ params: defaultParams }),
}));

export default useSalesDeliveryQueryStore;
