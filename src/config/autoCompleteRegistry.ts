import { getApiV1Customers, getApiV1CustomersByCode, getApiV1MaterialSuppliers, getApiV1MaterialSuppliersByCode, getApiV1OutsourceVendors, getApiV1OutsourceVendorsByCode, getApiV1ToolingSuppliers, getApiV1ToolingSuppliersByCode, getApiV1Material, getApiV1MaterialByCode, getApiV1Product, getApiV1ProductByCode, getApiV1BusinessPartnersByBusinessPartnerCodeContacts, getApiV1BusinessPartnersByBusinessPartnerCodeContactsByContactId, getApiV1Mold, getApiV1MoldByCode, getApiV1Storage, getApiV1StorageByCode, getApiV1Employee } from '@/api/generated';

export interface AutoCompleteConfig {
  /** 搜尋用的 API 呼叫 (依特性: 會有固定條件、預設 pageSize=100) */
  queryFn: (keyword: string, additionalParams?: any) => Promise<any[]>;
  /** 若編輯表單需要顯示初始值的對應名稱，可定義此函數以單獨撈取 (可選) */
  fetchByValue?: (value: any, additionalParams?: any) => Promise<any>;
  /** 選項的鍵值對映 (支援函數組合) */
  fieldNames: { label: string | ((item: any) => string); value: string };
  /** 至少輸入幾個字才觸發 API 呼叫 (預設 2) */
  triggerLength?: number; 
}

export const AUTO_COMPLETE_REGISTRY: Record<string, AutoCompleteConfig> = {
  // 客戶 (Customer, 改為呼叫新架構獨立 Customers API)
  CUSTOMER: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Customers({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: -1
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      if (!code) return null;
      const res = await getApiV1CustomersByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: 'name',
      value: 'customerCode'
    },
    triggerLength: 2
  },

  // 原料供應商 (Material Supplier, 呼叫新架構 MaterialSuppliers API)
  MATERIAL_SUPPLIER: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1MaterialSuppliers({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: -1
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      if (!code) return null;
      const res = await getApiV1MaterialSuppliersByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: 'name',
      value: 'supplierCode'
    },
    triggerLength: 2
  },

  // 委外加工商 (Outsource Vendor, 呼叫新架構 OutsourceVendors API)
  OUTSOURCE_VENDOR: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1OutsourceVendors({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: -1
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      if (!code) return null;
      const res = await getApiV1OutsourceVendorsByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: 'name',
      value: 'outsourceVendorCode'
    },
    triggerLength: 2
  },

  // 模具供應商 (Tooling Supplier, 呼叫新架構 ToolingSuppliers API)
  TOOLING_SUPPLIER: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1ToolingSuppliers({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: -1
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      if (!code) return null;
      const res = await getApiV1ToolingSuppliersByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: 'name',
      value: 'toolingSupplierCode'
    },
    triggerLength: 2
  },
  
  // 原料 (Material)
  CUSTOMER_CONTACT: {
    queryFn: async (keyword: string, additionalParams?: any) => {
      const bpCode = additionalParams?.businessPartnerCode;
      if (!bpCode) return [];
      const res = await getApiV1BusinessPartnersByBusinessPartnerCodeContacts({
        path: { businessPartnerCode: String(bpCode) },
        query: { page: 1, pageSize: -1, keyword: keyword || undefined } as any
      });
      return (res.data as any)?.data || res.data || [];
    },
    fetchByValue: async (id: number, additionalParams?: any) => {
      const bpCode = additionalParams?.businessPartnerCode;
      if (!bpCode || !id) return null;
      const res = await getApiV1BusinessPartnersByBusinessPartnerCodeContactsByContactId({
        path: { businessPartnerCode: String(bpCode), contactId: id }
      });
      return (res.data as any)?.data || res.data;
    },
    fieldNames: { label: 'name', value: 'id' },
  },
  MATERIAL: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Material({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: -1
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
    triggerLength: 2
  },

  // 產品 (Product)
  PRODUCT: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Product({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: -1
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
    triggerLength: 2
  },

  // 半成品 (Semi-finished)
  SEMI_FINISHED: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Product({
        query: {
          CodeOrName: keyword || undefined,
          Types: ['S'],
          pageSize: -1
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
    triggerLength: 2
  },

  // 模具 (Mold)
  MOLD: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Mold({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: -1
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      const res = await getApiV1MoldByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: (item: any) => `${item.name} (${item.code})`,
      value: 'code'
    },
    triggerLength: 2
  },

  // 儲位 (Storage)
  STORAGE: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Storage({
        query: {
          CodeOrName: keyword || undefined,
          pageSize: -1
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (code: string) => {
      const res = await getApiV1StorageByCode({ path: { code } });
      return (res.data as any)?.data;
    },
    fieldNames: {
      label: (item: any) => `${item.name} (${item.code})`,
      value: 'code'
    },
    triggerLength: 2
  },
  

  // 員工 (Employee)
  EMPLOYEE: {
    queryFn: async (keyword: string) => {
      const res = await getApiV1Employee({
        query: {
          EmployeeNo: keyword || undefined,
          pageSize: -1
        } as any
      });
      return (res.data as any)?.data?.data || (res.data as any)?.data || [];
    },
    fetchByValue: async (idOrCode: any) => {
      // Because employee uses ID for fetch but we need employeeNo for value
      // Just fallback to listing if fetchByValue by employeeNo is needed
      const res = await getApiV1Employee({
        query: {
          EmployeeNo: String(idOrCode),
          pageSize: -1
        } as any
      });
      const list = (res.data as any)?.data?.data || (res.data as any)?.data || [];
      return list.find((e: any) => e.employeeNo === idOrCode || e.employeeCode === idOrCode);
    },
    fieldNames: {
      label: (item: any) => `${item.name || ''} (${item.employeeNo || item.employeeCode || ''})`,
      value: 'employeeNo'
    },
    triggerLength: 2
  },
  // (未來可擴充其他如: VENDOR, MATERIAL, PRODUCT 等)
};

export type AutoCompleteKey = keyof typeof AUTO_COMPLETE_REGISTRY;
