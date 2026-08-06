import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface ErpIdentity {
  companyName: string;
  companyTaxId: string;
  companyLogoDarkPath: string;
  companyLogoLightPath: string;
  companyPhone: string;
  companyFax: string;
  companyAddress: string;
  supportedLanguages: string[];
  defaultLanguage: string;
}

export interface PurchaseParams {
  allowOverageReceive: boolean;
  overageCapPercent: number;
}

export interface IqcParams {
  twoStageEnabled: boolean;
}

export interface InventoryParams {
  autoFocusLpn: boolean;
  defaultCoreDiameterMm: number;
}

export interface ErpBusiness {
  purchase: PurchaseParams;
  iqc: IqcParams;
  inventory: InventoryParams;
}

export interface ErpSettings {
  identity: ErpIdentity;
  business: ErpBusiness;
}

interface ErpConfigState {
  erpSettings: ErpSettings | null;
  isLoading: boolean;
  fetchErpSettings: () => Promise<void>;
  getCompanyName: () => string;
  getAutoFocusLpn: () => boolean;
  getLogoUrl: (mode: 'dark' | 'light') => string;
}

const defaultSettings: ErpSettings = {
  identity: {
    companyName: '威倫模切股份有限公司',
    companyTaxId: '12345678',
    companyLogoDarkPath: 'config/company-logo-dark.svg',
    companyLogoLightPath: 'config/company-logo-light.svg',
    companyPhone: '+886-2-1234-5678',
    companyFax: '+886-2-8765-4321',
    companyAddress: '新北市新莊區化成路...',
    supportedLanguages: ['zh-TW', 'en-US', 'vi-VN'],
    defaultLanguage: 'zh-TW',
  },
  business: {
    purchase: {
      allowOverageReceive: true,
      overageCapPercent: 10.0,
    },
    iqc: {
      twoStageEnabled: true,
    },
    inventory: {
      autoFocusLpn: true,
      defaultCoreDiameterMm: 86.0,
    },
  },
};

export const useErpConfigStore = create<ErpConfigState>((set, get) => ({
  erpSettings: null,
  isLoading: false,
  fetchErpSettings: async () => {
    // If already loaded, don't refetch
    if (get().erpSettings) return;
    
    set({ isLoading: true });
    try {
      const res = await apiClient.get<{ success: boolean; data: ErpSettings }>('/api/v1/SystemMaintenance/erp-settings');
      if (res.data && res.data.success) {
        set({ erpSettings: res.data.data, isLoading: false });
      } else {
        set({ erpSettings: defaultSettings, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to fetch ERP settings:', error);
      set({ erpSettings: defaultSettings, isLoading: false });
    }
  },
  getCompanyName: () => {
    const { erpSettings } = get();
    return erpSettings?.identity?.companyName || defaultSettings.identity.companyName;
  },
  getAutoFocusLpn: () => {
    const { erpSettings } = get();
    if (erpSettings?.business?.inventory?.autoFocusLpn !== undefined) {
      return erpSettings.business.inventory.autoFocusLpn;
    }
    return defaultSettings.business.inventory.autoFocusLpn;
  },
  getLogoUrl: (mode: 'dark' | 'light') => {
    // 💡 頂級架構：直接透過全託管 API `/api/v1/SystemMaintenance/logo` 獲取客製化圖片。
    // 這在開發環境（Vite 5173 代理）與生產環境（Nginx）下都走已有的 /api/ 反向代理通道，
    // 完美繞過任何額外 Proxy 設定、網址埠不同、CORS 或 HTTPS 憑證混合阻擋問題！
    const baseUrl = apiClient.defaults.baseURL || '';
    let prefix = baseUrl;
    if (!baseUrl || baseUrl.startsWith('/')) {
      prefix = '/api';
    }
    
    // 如果 prefix 結尾有斜線則去除，避免雙斜線
    const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    
    return `${cleanPrefix}/v1/SystemMaintenance/logo?mode=${mode}`;
  }
}));
