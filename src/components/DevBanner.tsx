import React, { useEffect } from 'react';

export const DevBanner: React.FC = () => {
  // 為了能夠動態追蹤 Title 的變化，我們需要一個 State 甚至監聽器
  // 移除未使用的 originalTitle 與 setOriginalTitle
  
  // 只有在 Vite 的開發模式下才會執行，build (production) 之後這個組件會回傳 null
  if (!import.meta.env.DEV) {
    return null;
  }

  const apiTarget = import.meta.env.VITE_DEV_API_TARGET || '未知';

  useEffect(() => {
    // 1. 在 <head> 中插入一個隱藏的 meta 標籤，供開發者用 DevTools 檢查
    const metaId = 'dev-api-target';
    let metaTag = document.getElementById(metaId) as HTMLMetaElement;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.id = metaId;
      metaTag.name = 'dev:api-target';
      document.head.appendChild(metaTag);
    }
    metaTag.content = apiTarget;

    // 2. 在 Console 印出醒目的提示
    console.log(
      '%c 🚧 DEV MODE %c 正在連接 API: ' + apiTarget + ' ',
      'background: #f97316; color: #fff; padding: 2px 4px; border-radius: 4px 0 0 4px;',
      'background: #333; color: #fff; padding: 2px 4px; border-radius: 0 4px 4px 0;'
    );

    // 3. 監聽 document.title 的變化 (MutationObserver)
    // 因為各個頁面可能也會去改 document.title，我們攔截並加上 [DEV] 前綴
    const updateTitle = () => {
      const currentTitle = document.title;
      
      // 避免無限迴圈：如果還沒有包含 [DEV] 標記才加上去
      if (!currentTitle.startsWith('[DEV]')) {
        document.title = `[DEV] ${currentTitle}`;
      }
    };

    // 先執行一次
    updateTitle();

    // 建立監聽器，只要有人改了 <title> 就自動補上前綴
    const observer = new MutationObserver(() => {
      updateTitle();
    });

    const titleElement = document.querySelector('title');
    if (titleElement) {
      observer.observe(titleElement, { childList: true });
    }

    return () => {
      // 清除 meta 標籤
      const el = document.getElementById(metaId);
      if (el) document.head.removeChild(el);
      // 停止監聽
      observer.disconnect();
      // 復原 Title (可選)
      document.title = document.title.replace(/^\[DEV\] (.*) - .*$/, '$1');
    };
  }, [apiTarget]);

  // UI 上不顯示任何東西，以免破壞版面
  return null;
};
