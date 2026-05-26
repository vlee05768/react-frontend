import { create } from 'zustand';
import type { DocumentSubscriptionDto } from '@/api/generated/types.gen';
import {
  postApiV1DocumentSubscriptionToggle,
  getApiV1DocumentSubscriptionStatus,
  getApiV1DocumentSubscriptionMy,
} from '@/api/generated/sdk.gen';
import { message } from 'antd';

interface DocumentSubscriptionStore {
  subscriptions: DocumentSubscriptionDto[];
  isLoading: boolean;
  fetchMySubscriptions: () => Promise<void>;
  toggleSubscription: (documentType: string, documentKey: string) => Promise<boolean>;
  checkSubscriptionStatus: (documentType: string, documentKey: string) => Promise<boolean>;
}

export const useDocumentSubscriptionStore = create<DocumentSubscriptionStore>((set, get) => ({
  subscriptions: [],
  isLoading: false,

  fetchMySubscriptions: async () => {
    set({ isLoading: true });
    try {
      const response = await getApiV1DocumentSubscriptionMy();
      if (response.data?.success) {
        set({ subscriptions: response.data.data || [] });
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
        // 成功切換後，重新整理我的關注清單
        await get().fetchMySubscriptions();
        
        if (isSubscribedNow) {
          message.success(`成功關注單據 ${documentKey}！相關異動將會發送郵件通知。`);
        } else {
          message.info(`已取消關注單據 ${documentKey}。`);
        }
        return !!isSubscribedNow;
      } else {
        message.error(`關注設定失敗: ${response.data?.message || '未知錯誤'}`);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to toggle subscription:', error);
      message.error(`操作失敗: ${error.message || '連線錯誤'}`);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  checkSubscriptionStatus: async (documentType: string, documentKey: string) => {
    try {
      const response = await getApiV1DocumentSubscriptionStatus({
        query: { documentType, documentKey },
      });
      if (response.data?.success) {
        return !!response.data.data;
      }
      return false;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  },
}));
