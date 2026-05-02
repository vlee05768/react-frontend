import { create } from 'zustand';

// 基礎查詢條件介面
export interface BaseQueryParams {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  isActive?: boolean | null;
  [key: string]: any;
}

// 單一 Store 的狀態介面
export interface ListQueryState<T extends BaseQueryParams = BaseQueryParams> {
  params: T;
  setParams: (newParams: Partial<T>) => void;
  resetParams: () => void;
}

// 預設參數
const defaultParams: BaseQueryParams = {
  pageNumber: 1,
  pageSize: 20, // 企業內部常見預設 20
  keyword: '',
  isActive: null,
};

// Zustand 工廠函數：產生獨立模組的 Store
export function createListQueryStore<T extends BaseQueryParams = BaseQueryParams>(
  _storeName: string,
  initialParams: Partial<T> = {}
) {
  const initialState = { ...defaultParams, ...initialParams } as T;
  return create<ListQueryState<T>>((set) => ({
    params: initialState,
    setParams: (newParams) => 
      set((state) => ({ params: { ...state.params, ...newParams, pageNumber: newParams.pageNumber || 1 } })), // 變更條件預設回第一頁
    resetParams: () => set({ params: initialState }),
  }));
}
