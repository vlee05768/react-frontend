import { client } from './generated/client.gen';
import { useAuthStore } from '../stores/useAuthStore';
import { message } from 'antd';

export function initializeApi() {
  // Configured to use relative path so Vite proxy handles it
  client.setConfig({
    baseURL: ''
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
      if (error.response && error.response.status === 401) {
        message.error('請重新登入');
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
}
