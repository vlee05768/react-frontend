import { create } from 'zustand';

interface LoadingStore {
  requestCount: number;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  requestCount: 0,
  loadingMessage: '處理中，請稍候...',
  setLoadingMessage: (message: string) => set({ loadingMessage: message }),
  showLoading: (message?: string) => set((state) => ({ 
    requestCount: state.requestCount + 1,
    loadingMessage: message || (state.requestCount === 0 ? '處理中，請稍候...' : state.loadingMessage)
  })),
  hideLoading: () => set((state) => ({ 
    requestCount: Math.max(0, state.requestCount - 1),
    loadingMessage: state.requestCount - 1 <= 0 ? '處理中，請稍候...' : state.loadingMessage
  })),
}));
