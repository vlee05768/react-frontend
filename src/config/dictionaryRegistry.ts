import { getApiV1Role, getApiV1GeneralTypesGetTypes, getApiV1BusinessPartners } from '@/api/generated/sdk.gen';

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
    fieldNames: { label: '_displayName', value: 'name' },
  },
  // 模具類型
  MOLD_TYPE: {
    queryFn: async () => {
      const res = await getApiV1GeneralTypesGetTypes({ query: { types: ['CutterType'] } });
      const rawData = (res.data as any)?.data?.CutterType || (res.data as any)?.CutterType || [];
      return rawData.map((item: any) => ({
        ...item,
        _displayName: item.desc || item.code || item, // fallback 如果只是字串
        _value: item.code || item
      }));
    },
    fieldNames: { label: '_displayName', value: '_value' }
  },
  
  // 模具形狀
  MOLD_SHAPE: {
    queryFn: async () => {
      const res = await getApiV1GeneralTypesGetTypes({ query: { types: ['ShapeType'] } });
      const rawData = (res.data as any)?.data?.ShapeType || (res.data as any)?.ShapeType || [];
      return rawData.map((item: any) => ({
        ...item,
        _displayName: item.desc || item.code || item,
        _value: item.code || item
      }));
    },
    fieldNames: { label: '_displayName', value: '_value' }
  },

  // 供應商選單 (Type P 或 S)
  BP_SUPPLIER: {
    queryFn: async () => {
      const res = await getApiV1BusinessPartners({ query: { Types: ['P', 'S'], pageSize: 100 } as any });
      const rawData = (res.data as any)?.data?.data || (res.data as any)?.data || [];
      return rawData.map((item: any) => ({
        ...item,
        // 顯示為 "公司名稱 (代碼)"
        _displayName: `${item.name} (${item.code})`, 
      }));
    },
    fieldNames: { label: '_displayName', value: 'code' },
  }
};

export type DictKey = keyof typeof DICTIONARY_REGISTRY;
