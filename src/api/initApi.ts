import { client } from './generated/client.gen';
import { useAuthStore } from '../stores/useAuthStore';
import { Modal } from "antd";

export function initializeApi() {
  // Configured to use relative path so Vite proxy handles it
  client.setConfig({
    baseURL: '',
    throwOnError: true
  });

  client.instance.interceptors.request.use((request) => {
    const token = useAuthStore.getState().token;
    if (token) {
      // For Axios instance
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  });

  client.instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        if (error.response.status === 401) {
          Modal.error({ title: '錯誤提示', content: '請重新登入' });
          useAuthStore.getState().logout();
          window.location.href = '/login';
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
