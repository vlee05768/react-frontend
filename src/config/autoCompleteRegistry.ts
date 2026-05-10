import { getApiV1BusinessPartners, getApiV1BusinessPartnersByCode, getApiV1Material, getApiV1MaterialByCode, getApiV1Product, getApiV1ProductByCode } from '@/api/generated/sdk.gen';

export interface AutoCompleteConfig {
  /** 搜尋用的 API 呼叫 (依特性: 會有固定條件、預設 pageSize=100) */
  queryFn: (keyword: string, additionalParams?: any) => Promise<any[]>;
  /** 若編輯表單需要顯示初始值的對應名稱，可定義此函數以單獨撈取 (可選) */
  fetchByValue?: (value: any) => Promise<any>;
  /** 選項的鍵值對映 (支援函數組合) */
  fieldNames: { label: string | ((item: any) => string); value: string };
  /** 至少輸入幾個字才觸發 API 呼叫 (預設 1) */
  triggerLength?: number; 
}

export const AUTO_COMPLETE_REGISTRY: Record<string, AutoCompleteConfig> = {
  // 客戶 (Business Partner, 類型為 'C')
  CUSTOMER: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1BusinessPartners({
        query: {
          CodeOrName: keyword || undefined,
          Types: ['C'], // 固定條件：只搜尋客戶
          pageSize: 100 // 特性：最大分頁限制一律傳入 100
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      const res = await getApiV1BusinessPartnersByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: 'name',
      value: 'code'
    },
    triggerLength: 1
  },
  
  // 原料 (Material)
  CUSTOMER_CONTACT: {
    queryFn: async (keyword: string, additionalParams?: any) => {
      const bpCode = additionalParams?.businessPartnerCode;
      if (!bpCode) return [];
      const { getApiV1BusinessPartnersByBusinessPartnerCodeContacts } = await import('@/api/generated/sdk.gen');
      const res = await getApiV1BusinessPartnersByBusinessPartnerCodeContacts({
        path: { businessPartnerCode: String(bpCode) },
        query: { page: 1, pageSize: 100, keyword: keyword || undefined } as any
      });
      return (res.data as any)?.data || res.data || [];
    },
    fetchByValue: async (_id: number) => {
       // You'd ideally fetch a single contact here if an API exists, but for now we might just resolve empty or mock 
       return null; 
    },
    fieldNames: { label: 'name', value: 'id' },
  },
  MATERIAL: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Material({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: 100
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      const res = await getApiV1MaterialByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: 'name',
      value: 'code'
    },
    triggerLength: 1
  },

  // 產品 (Product)
  PRODUCT: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Product({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: 100
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      const res = await getApiV1ProductByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: 'name',
      value: 'code'
    },
    triggerLength: 1
  },

  // 半成品 (Semi-finished)
  SEMI_FINISHED: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Product({
        query: {
          CodeOrName: keyword || undefined,
          Types: ['S'],
          pageSize: 100
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      const res = await getApiV1ProductByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: 'name',
      value: 'code'
    },
    triggerLength: 1
  },
  
  // (未來可擴充其他如: VENDOR, MATERIAL, PRODUCT 等)
};

export type AutoCompleteKey = keyof typeof AUTO_COMPLETE_REGISTRY;
