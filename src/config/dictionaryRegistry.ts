import { getApiV1Role, getApiV1GeneralTypesGetTypes, getApiV1BusinessPartners, getApiV1Storage, getApiV1Machine } from '@/api/generated/sdk.gen';
import { MAX_PAGE_SIZE } from '@/constants';

export const DICTIONARY_REGISTRY = {
  // 純靜態選項，直接定義原型
  IsActive: {
    queryFn: async () => [
      { text: '啟用', val: true },
      { text: '停用', val: false },
    ],
    fieldNames: { label: 'text', value: 'val' }
  },
  

  // 訂單狀態
  ORDER_STATUS: {
    queryFn: async () => [
      { text: '新單據', val: 'Draft' },
      { text: '已確認', val: 'Confirmed' },
      { text: '已完成', val: 'Finished' },
    ],
    fieldNames: { label: 'text', value: 'val' }
  },
  // 角色選單
  USER_ROLE: {
    queryFn: async () => {
      const res = await getApiV1Role({ query: { pageSize: MAX_PAGE_SIZE } as any });
      const rawData = (res.data as any)?.data?.data || (res.data as any)?.data || [];
      return rawData.map((item: any) => ({
        ...item,
        // 如果沒有 caption，就 fallback 到 name 作為顯示名稱
        _displayName: item.caption || item.name, 
      }));
    },
    fieldNames: { label: '_displayName', value: 'name' },
  },

  // 原料類型
  MATERIAL_TYPE: {
    queryFn: async () => {
      const res = await getApiV1GeneralTypesGetTypes({ query: { types: ['MaterialType'] } });
      const rawData = (res.data as any)?.data?.MaterialType || (res.data as any)?.MaterialType || [];
      return rawData.map((item: any) => ({
        ...item,
        _displayName: item.desc || item.code || item,
        _value: item.code || item
      }));
    },
    fieldNames: { label: '_displayName', value: '_value' }
  },

  // 產品類型
  PRODUCT_TYPE: {
    queryFn: async () => {
      const res = await getApiV1GeneralTypesGetTypes({ query: { types: ['FPType'] } });
      const rawData = (res.data as any)?.data?.FPType || (res.data as any)?.FPType || [];
      return rawData.map((item: any) => ({
        ...item,
        _displayName: item.desc || item.code || item,
        _value: item.code || item
      }));
    },
    fieldNames: { label: '_displayName', value: '_value' }
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
  
  // 部門
  DEPARTMENT: {
    queryFn: async () => {
      const res = await getApiV1GeneralTypesGetTypes({ query: { types: ['Department'] } });
      const rawData = (res.data as any)?.data?.Department || (res.data as any)?.Department || [];
      return rawData.map((item: any) => ({
        ...item,
        _displayName: item.desc || item.code || item,
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
      const res = await getApiV1BusinessPartners({ query: { Types: ['P', 'S'], pageSize: MAX_PAGE_SIZE } as any });
      const rawData = (res.data as any)?.data?.data || (res.data as any)?.data || [];
      return rawData.map((item: any) => ({
        ...item,
        // 顯示為 "公司名稱 (代碼)"
        _displayName: `${item.name} (${item.code})`, 
      }));
    },
    fieldNames: { label: '_displayName', value: 'code' },
  },

  // 員工
  EMPLOYEE: {
    queryFn: async () => {
      const { getApiV1Employee } = await import('@/api/generated/sdk.gen');
      const res = await getApiV1Employee({ query: { pageSize: MAX_PAGE_SIZE } as any });
      const rawData = (res.data as any)?.data?.data || (res.data as any)?.data || [];
      return rawData.map((item: any) => ({
        ...item,
        _displayName: `${item.name} (${item.employeeNo})`,
      }));
    },
    fieldNames: { label: '_displayName', value: 'employeeNo' },
  },

  // 儲位
  STORAGE: {
    queryFn: async () => {
      const res = await getApiV1Storage({ query: { pageSize: MAX_PAGE_SIZE } as any });
      const rawData = (res.data as any)?.data?.data || (res.data as any)?.data || [];
      return rawData.map((item: any) => ({
        ...item,
        _displayName: `${item.name} (${item.code})`, 
      }));
    },
    fieldNames: { label: '_displayName', value: 'code' },
  },

  // 組成方式
  COMPOSITION_TYPE: {
    queryFn: async () => {
      const res = await getApiV1GeneralTypesGetTypes({ query: { types: ['CompositionType'] } });
      const rawData = (res.data as any)?.data?.CompositionType || (res.data as any)?.CompositionType || [];
      return rawData.map((item: any) => ({
        ...item,
        _displayName: item.desc || item.code || item,
        _value: item.code || item
      }));
    },
    fieldNames: { label: '_displayName', value: '_value' }
  },

  // 訂單優先順序
  ORDER_PRIORITY: {
    queryFn: async () => {
      const res = await getApiV1GeneralTypesGetTypes({ query: { types: ['OrderPriority'] } });
      const rawData = (res.data as any)?.data?.OrderPriority || (res.data as any)?.OrderPriority || [];
      return rawData.map((item: any) => ({
        ...item,
        _displayName: item.desc || item.code || item,
        _value: item.code || item
      }));
    },
    fieldNames: { label: '_displayName', value: '_value' }
  },

  // 機台
  MACHINE: {
    queryFn: async () => {
      const res = await getApiV1Machine({ query: { pageSize: MAX_PAGE_SIZE } as any });
      const rawData = (res.data as any)?.data?.data || (res.data as any)?.data || [];
      return rawData.map((item: any) => ({
        ...item,
        // 顯示為 "機台名稱 (代碼)"
        _displayName: `${item.name} (${item.code})`, 
      }));
    },
    fieldNames: { label: '_displayName', value: 'code' },
  }
};

export type DictKey = keyof typeof DICTIONARY_REGISTRY;
