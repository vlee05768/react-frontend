import { client } from './generated/client.gen';
import { useAuthStore } from '../stores/useAuthStore';
import { Modal } from "antd";
import { useLoadingStore } from '../stores/useLoadingStore';

export function initializeApi() {
  // Configured to use relative path so Vite proxy handles it
  client.setConfig({
    baseURL: '',
    throwOnError: true
  });

  client.instance.interceptors.request.use((request) => {
    // 檢查全域 Store 是否已經有被手動設定過訊息（而不是預設的）
    const currentMsg = useLoadingStore.getState().loadingMessage;
    const hasCustomMsgInStore = currentMsg !== '處理中，請稍候...' && currentMsg !== '資料載入中...' && currentMsg !== '資料新增中...' && currentMsg !== '資料更新中...' && currentMsg !== '資料刪除中...';

    // 優先讀取自訂的 Header 設定的 Loading 訊息
    let msg = hasCustomMsgInStore ? currentMsg : '處理中，請稍候...';
    let customMsg = null;
    
    // axios/hey-api 的 headers 物件在不同版本/環境下的處理方式差異很大
    if (request.headers) {
      if (typeof request.headers.get === 'function') {
        customMsg = request.headers.get('X-Loading-Message');
        request.headers.delete('X-Loading-Message');
      } 
      
      // 直接檢查物件屬性 (AxiosHeaders 也是物件)
      if (!customMsg && (request.headers as any)['X-Loading-Message']) {
        customMsg = (request.headers as any)['X-Loading-Message'];
        delete (request.headers as any)['X-Loading-Message'];
      }
      
      // 處理小寫的情況 (axios 有時候會把 header 轉小寫)
      if (!customMsg && (request.headers as any)['x-loading-message']) {
        customMsg = (request.headers as any)['x-loading-message'];
        delete (request.headers as any)['x-loading-message'];
      }
    }

    if (customMsg) {
      msg = customMsg;
    } else if (!hasCustomMsgInStore && request.method) {
      const method = request.method.toUpperCase();
      if (method === 'GET') msg = '資料載入中...';
      else if (method === 'POST') msg = '資料新增中...';
      else if (method === 'PUT' || method === 'PATCH') msg = '資料更新中...';
      else if (method === 'DELETE') msg = '資料刪除中...';
    }
    // 如果已經在 mutation 裡手動 call 過 showLoading()，這裡就不會覆蓋掉它，而是更新計數
    useLoadingStore.getState().showLoading(msg);
    const token = useAuthStore.getState().token;
    if (token) {
      // For Axios instance
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  });

  client.instance.interceptors.response.use(
    (response) => {
      useLoadingStore.getState().hideLoading();
      return response;
    },
    (error) => {
      useLoadingStore.getState().hideLoading();
      if (error.response) {
        if (error.response.status === 401) {
          if (window.location.pathname !== '/login') {
            Modal.error({ centered: true, title: '登入逾期', content: '登入狀態已失效，請重新登入' });
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
        }
        
        // 正規化錯誤訊息，支援 .NET ProblemDetails 與自訂 ApiResponse
        const data = error.response.data;
        if (data && !data.message) {
          if (data.errors && typeof data.errors === 'object') {
            const firstError = Object.values(data.errors)[0];
            data.message = Array.isArray(firstError) ? firstError[0] : data.title;
          } else if (data.title) {
            data.message = data.title;
          }
        }
      }
      return Promise.reject(error);
    }
  );
}
