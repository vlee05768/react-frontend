import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeApi } from './api/initApi';
import './utils/zodI18n'; // 載入全域 Zod 繁體中文驗證錯誤訊息

// 載入 Day.js 繁體中文語系
import dayjs from 'dayjs';
import 'dayjs/locale/zh-tw';
dayjs.locale('zh-tw');

initializeApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
