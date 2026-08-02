import { create } from 'zustand';
import type { DocumentSubscriptionDto } from '@/api/generated/types.gen';
import {
  postApiV1DocumentSubscriptionToggle,
  getApiV1DocumentSubscriptionMy,
} from '@/api/generated/sdk.gen';
import { antdGlobal } from '@/utils/antdGlobal';

interface DocumentSubscriptionStore {
  subscriptions: DocumentSubscriptionDto[];
  isLoading: boolean;
  hasInitialized: boolean;
  fetchMySubscriptions: (force?: boolean) => Promise<void>;
  toggleSubscription: (documentType: string, documentKey: string) => Promise<boolean>;
  checkSubscriptionStatus: (documentType: string, documentKey: string) => Promise<boolean>;
}

export const useDocumentSubscriptionStore = create<DocumentSubscriptionStore>((set, get) => ({
  subscriptions: [],
  isLoading: false,
  hasInitialized: false,

  fetchMySubscriptions: async (force = false) => {
    if (get().hasInitialized && !force) {
      return;
    }

    // 如果目前已經在載入中，直接返回，避免併發/重複呼叫造成的重複發送網路請求
    if (get().isLoading) {
      return;
    }

    set({ isLoading: true });
    try {
      const response = await getApiV1DocumentSubscriptionMy();
      if (response.data?.success) {
        set({ subscriptions: response.data.data || [], hasInitialized: true });
      } else {
        console.error('Failed to fetch subscriptions:', response.data?.message);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  toggleSubscription: async (documentType: string, documentKey: string) => {
    set({ isLoading: true });
    try {
      const response = await postApiV1DocumentSubscriptionToggle({
        body: { documentType, documentKey },
      });
      if (response.data?.success) {
        const isSubscribedNow = response.data.data;
        
        // 1. 立即進行樂觀更新 (Optimistic Update)，確保 UI 能在一瞬間 (0ms 延遲) 反應最新的關注狀態
        set(state => {
          let updated = [...state.subscriptions];
          if (isSubscribedNow) {
            const exists = updated.some(
              sub => sub.documentType === documentType && sub.documentKey === documentKey
            );
            if (!exists) {
              updated.push({
                documentType,
                documentKey,
                subscribedAt: new Date().toISOString()
              });
            }
          } else {
            updated = updated.filter(
              sub => !(sub.documentType === documentType && sub.documentKey === documentKey)
            );
          }
          return { subscriptions: updated };
        });

        // 2. 解除自身的 isLoading 鎖，讓 fetchMySubscriptions(true) 能夠順利呼叫 API 與後端進行最終狀態同步
        set({ isLoading: false });
        await get().fetchMySubscriptions(true);
        
        if (isSubscribedNow) {
          antdGlobal.message?.success(`成功關注單據 ${documentKey}！相關異動將會發送郵件通知。`);
        } else {
          antdGlobal.message?.info(`已取消關注單據 ${documentKey}。`);
        }
        return !!isSubscribedNow;
      } else {
        antdGlobal.message?.error(`關注設定失敗: ${response.data?.message || '未知錯誤'}`);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to toggle subscription:', error);
      antdGlobal.message?.error(`操作失敗: ${error.message || '連線錯誤'}`);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  checkSubscriptionStatus: async (documentType: string, documentKey: string) => {
    // 優先從本地記憶體比對，避免重複發送 API 請求
    const isSubscribed = get().subscriptions.some(
      sub => sub.documentType === documentType && sub.documentKey === documentKey
    );
    if (isSubscribed) return true;

    // 若尚未載入過訂閱清單，則進行第一次載入
    if (!get().hasInitialized) {
      await get().fetchMySubscriptions();
      return get().subscriptions.some(
        sub => sub.documentType === documentType && sub.documentKey === documentKey
      );
    }

    return false;
  },
}));
