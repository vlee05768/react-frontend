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

  // 💡 解決 Query 參數中 + 號等特殊字元序列化漏洞（例如 SAD+21313123123 型號）
  client.instance.defaults.paramsSerializer = {
    serialize: (params) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(val => searchParams.append(key, val));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
      return searchParams.toString();
    }
  };

  client.instance.interceptors.request.use((request) => {
    // 預設關閉全域 Loading，除非是需要全域鎖死的長時任務才在呼叫時主動呼叫 showLoading()
    // 或是如果未來你想針對 POST/PUT/DELETE 依然使用全域，可以在這裡限制
    
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

    // 只有當明確傳入 X-Loading-Message 時，才觸發全域 Loading 遮罩
    if (customMsg) {
      useLoadingStore.getState().showLoading(customMsg);
    }
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
            const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?redirect=${redirectUrl}`;
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
