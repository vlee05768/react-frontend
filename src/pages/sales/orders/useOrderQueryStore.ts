import { create } from 'zustand';

interface OrderQueryState {
  params: Record<string, any>;
  setParams: (newParams: Record<string, any>) => void;
  resetParams: () => void;
}

const defaultParams = {
  page: 1,
  pageSize: 10,
};

const useOrderQueryStore = create<OrderQueryState>((set) => ({
  params: defaultParams,
  setParams: (newParams) =>
    set((state) => ({ params: { ...state.params, ...newParams } })),
  resetParams: () => set({ params: defaultParams }),
}));

export default useOrderQueryStore;
