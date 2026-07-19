import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  /** 設備類型：'mobile' | 'tablet' | 'desktop' */
  deviceType: DeviceType;
  /** 是否為手機/手持終端 (通常寬度 < 768px 或手機 UA) */
  isMobile: boolean;
  /** 是否為平板電腦 (通常寬度 >= 768px 且 < 1024px，或 iPad/Tablet UA) */
  isTablet: boolean;
  /** 是否為一般桌上型電腦或筆電 (通常寬度 >= 1024px) */
  isDesktop: boolean;
  /** 是否支援觸控螢幕 (平版、手機、手持設備、觸控一體機) */
  isTouchDevice: boolean;
  /** 是否偵測為工業級/倉儲手持條碼 PDA (Zebra, Honeywell 等 Android 掃描槍) */
  isPDA: boolean;
  /** 視窗寬度 */
  viewportWidth: number;
  /** 視窗高度 */
  viewportHeight: number;
}

/**
 * 模切業 ERP 專用設備與版面偵測 Hook
 * 用於實時判斷目前使用者是在桌電、平板，或是手持 PDA / 手機上執行，
 * 以便動態渲染高密桌電表格、中密平板卡片、或是極簡 LPN 盲操掃描介面。
 */
export function useDeviceDetect(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceType: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    isPDA: false,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const ua = navigator.userAgent.toLowerCase();

      // 1. 偵測觸控支援 (Touch Device)
      const isTouchDevice = 
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 || 
        (navigator as any).msMaxTouchPoints > 0;

      // 2. 偵測是否為工業級倉儲掃描 PDA (例如 Zebra TC21, Honeywell CT40, CipherLab 等 Android Handheld)
      // 這些設備通常執行 Android 系統，寬度小，具備硬體掃描頭，UserAgent 會帶有 pda, handheld, zebra, honeywell 等關鍵字
      const isPDA = 
        isTouchDevice && 
        (/pda|handheld|zebra|honeywell|tc20|tc21|tc25|tc26|tc51|tc52|tc56|tc57|ct40|ct60|cipherlab|unitech|mobile.*android/i.test(ua) && 
        width <= 480);

      // 3. 定義設備類型斷點 (SME Breakpoints)
      // - 手機 (Mobile): 視窗小於 768px (MD 以下) 或匹配手機 UA 且非平板
      // - 平板 (Tablet): 視窗 768px ~ 1023px (LG 以下) 或匹配平板 UA
      // - 電腦 (Desktop): 視窗大於等於 1024px，無移動端特徵
      const isMobileUA = /iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua);
      const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(ua);

      let deviceType: DeviceType = 'desktop';
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;

      // 優先以視窗寬度做為版面配置依歸 (Responsive Grid Breakpoints)
      if (width < 768 || (isMobileUA && !isTabletUA)) {
        deviceType = 'mobile';
        isMobile = true;
      } else if ((width >= 768 && width < 1024) || isTabletUA) {
        deviceType = 'tablet';
        isTablet = true;
      } else {
        deviceType = 'desktop';
        isDesktop = true;
      }

      setDeviceInfo({
        deviceType,
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        isPDA,
        viewportWidth: width,
        viewportHeight: height,
      });
    };

    // 監聽 resize 事件，並立即執行一次初始化
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceInfo;
}
