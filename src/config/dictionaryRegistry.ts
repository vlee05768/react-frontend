import { getApiV1Role } from '@/api/generated/sdk.gen';

export const DICTIONARY_REGISTRY = {
  // 純靜態選項，直接定義原型
  IsActive: {
    queryFn: async () => [
      { text: '啟用', val: true },
      { text: '停用', val: false },
    ],
    fieldNames: { label: 'text', value: 'val' }
  },
  
  // 角色選單
  USER_ROLE: {
    queryFn: async () => {
      const res = await getApiV1Role({ query: { pageSize: 100 } as any });
      const rawData = (res.data as any)?.data?.data || (res.data as any)?.data || [];
      return rawData.map((item: any) => ({
        ...item,
        // 如果沒有 caption，就 fallback 到 name 作為顯示名稱
        _displayName: item.caption || item.name, 
      }));
    },
    fieldNames: { label: '_displayName', value: 'name' }
  }
};

export type DictKey = keyof typeof DICTIONARY_REGISTRY;
