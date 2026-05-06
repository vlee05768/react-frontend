import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeApi } from './api/initApi';
import './utils/zodI18n'; // 載入全域 Zod 繁體中文驗證錯誤訊息

initializeApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
