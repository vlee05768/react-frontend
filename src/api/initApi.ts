import { client } from './generated/client.gen';
import dayjs from 'dayjs';
import { useAuthStore } from '../stores/useAuthStore';

import { useLoadingStore } from '../stores/useLoadingStore';

let isInitialized = false;

export function initializeApi() {
  if (isInitialized) return;
  isInitialized = true;

  // Configured to use relative path so Vite proxy handles it
  client.setConfig({
    baseURL: '',
    throwOnError: true
  });

  // 💡 解決 Query 參數中 + 號等特殊字元序列化漏洞（例如 SAD+21313123123 型號）
  client.instance.defaults.paramsSerializer = {
    serialize: (params) => {
      const searchParams = new URLSearchParams();
      const serializeValue = (value: unknown) => dayjs.isDayjs(value)
        ? value.format('YYYY-MM-DD')
        : String(value);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(val => searchParams.append(key, serializeValue(val)));
          } else {
            searchParams.append(key, serializeValue(value));
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
      // 認證失效與一般業務錯誤由 src/api/client.ts 的單一入口處理；
      // 此攔截器不顯示 UI，只做向後相容的安全訊息正規化並保留 rejection。
      const data = error.response?.data;
      if (data && typeof data === 'object' && !Array.isArray(data) && !('message' in data)) {
        const payload = data as { message?: unknown; title?: unknown; errors?: unknown };
        const firstValidationMessage = payload.errors && typeof payload.errors === 'object'
          ? Object.values(payload.errors as Record<string, unknown>)
            .flatMap((value) => Array.isArray(value) ? value : [value])
            .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
          : undefined;
        const title = typeof payload.title === 'string' && payload.title.trim() ? payload.title : undefined;
        if (firstValidationMessage || title) {
          payload.message = firstValidationMessage || title;
        }
      }
      return Promise.reject(error);
    }
  );
}
