import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

export const apiClient = axios.create({
  // Production uses the same-origin reverse proxy; development keeps VITE_API_BASE_URL configurable.
  baseURL: import.meta.env.VITE_API_BASE_URL || '/',
  timeout: 10000,
});

let authRedirecting = false;

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    // 企業內部 ERP: 若後端回傳統一的 ApiResponse<T> 結構，可在此解構
    return response;
  },
  (error) => {
    // 頁面 mutation 負責顯示可診斷的錯誤，避免與全域提示重複。
    if (error.response?.status === 401 && window.location.pathname !== '/login' && !authRedirecting) {
      authRedirecting = true;
      const authState = useAuthStore.getState();
      authState.logout();
      const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirectUrl}`;
    }
    return Promise.reject(error);
  }
);
