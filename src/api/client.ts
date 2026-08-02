import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
import { antdGlobal } from '../utils/antdGlobal';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5160',
  timeout: 10000,
});

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
    // 統一錯誤提取
    const errorMsg = error.response?.data?.message || error.message || '系統發生錯誤';
    antdGlobal.message?.error(errorMsg);
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?redirect=${redirectUrl}`;
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
