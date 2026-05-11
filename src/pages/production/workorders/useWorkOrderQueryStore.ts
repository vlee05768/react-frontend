import { create } from 'zustand';
import { DEFAULT_PAGE_SIZE } from '@/constants/ui';

interface WorkOrderQueryState {
  searchParams: any;
  pagination: {
    page: number;
    pageSize: number;
  };
  setSearchParams: (params: any) => void;
  setPagination: (page: number, pageSize: number) => void;
  reset: () => void;
}

const initialState = {
  searchParams: {},
  pagination: {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  },
};

export const useWorkOrderQueryStore = create<WorkOrderQueryState>((set) => ({
  ...initialState,
  setSearchParams: (params) => set({ searchParams: params, pagination: { ...initialState.pagination } }),
  setPagination: (page, pageSize) => set((state) => ({ pagination: { ...state.pagination, page, pageSize } })),
  reset: () => set(initialState),
}));
