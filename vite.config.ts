import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'
import path from 'path'
import packageJson from './package.json'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 載入環境變數 (會自動抓取 .env 和 .env.local 的設定)
  const env = loadEnv(mode, process.cwd(), '');

  if (!env.VITE_DEV_API_TARGET) {
    throw new Error('❌ [Vite] 缺少 VITE_DEV_API_TARGET 環境變數！請在 .env 或 .env.local 中設定開發目標 API 網址 (例如: http://192.168.50.100:5160)。');
  }

  return {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    plugins: [
      react(),
      tailwindcss(),
      viteCompression(),
      // 預設啟用 basicSsl() 以保持既有行為。如需關閉（改用 HTTP 避免自簽章憑證阻擋 WSS），可在 .env.local 設定 VITE_DEV_HTTPS=false
      ...(env.VITE_DEV_HTTPS !== 'false' ? [basicSsl()] : []),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      // 支援在虛擬機、WSL 跨檔案系統或網路磁碟下啟用輪詢監聽 (可在 .env.local 設定 VITE_USE_POLLING=true)
      watch: env.VITE_USE_POLLING === 'true' ? {
        usePolling: true,
        interval: 100,
      } : undefined,
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_TARGET,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // 提高警告門檻，因為某些 UI 框架本身體積較大
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          // 自訂 chunk 拆分策略
          manualChunks(id) {
            // React 生態核心拆分
            if (
              id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router-dom/')
            ) {
              return 'vendor-react'
            }
            // Ant Design 圖標拆分 (圖標庫通常體積較大)
            if (
              id.includes('node_modules/@ant-design/icons/') ||
              id.includes('node_modules/@ant-design/icons-svg/')
            ) {
              return 'vendor-antd-icons'
            }
            // Ant Design 重型表格與進階組件
            if (
              id.includes('node_modules/antd/es/table/') ||
              id.includes('node_modules/rc-table/') ||
              id.includes('node_modules/@rc-component/table/')
            ) {
              return 'vendor-antd-table'
            }
            // Ant Design 選擇與日期選擇相關組件
            if (
              id.includes('node_modules/antd/es/date-picker/') ||
              id.includes('node_modules/antd/es/time-picker/') ||
              id.includes('node_modules/antd/es/calendar/') ||
              id.includes('node_modules/antd/es/color-picker/') ||
              id.includes('node_modules/antd/es/cascader/') ||
              id.includes('node_modules/antd/es/tree/') ||
              id.includes('node_modules/antd/es/tree-select/') ||
              id.includes('node_modules/rc-picker/') ||
              id.includes('node_modules/rc-tree/') ||
              id.includes('node_modules/rc-cascader/')
            ) {
              return 'vendor-antd-pickers'
            }
            // Ant Design 表單與彈窗等常用組件
            if (
              id.includes('node_modules/antd/es/form/') ||
              id.includes('node_modules/antd/es/modal/') ||
              id.includes('node_modules/antd/es/drawer/') ||
              id.includes('node_modules/antd/es/upload/') ||
              id.includes('node_modules/antd/es/transfer/') ||
              id.includes('node_modules/rc-field-form/') ||
              id.includes('node_modules/rc-dialog/') ||
              id.includes('node_modules/rc-drawer/') ||
              id.includes('node_modules/rc-upload/')
            ) {
              return 'vendor-antd-forms-dialogs'
            }
            // Ant Design 基礎底層依賴與其餘組件
            if (
              id.includes('node_modules/antd/') ||
              id.includes('node_modules/@ant-design/') ||
              id.includes('node_modules/rc-') ||
              id.includes('node_modules/@rc-component/')
            ) {
              return 'vendor-antd-core'
            }
            // 編輯器相關依賴拆分 (體積通常較大)
            if (
              id.includes('node_modules/@uiw/react-codemirror/') || 
              id.includes('node_modules/@codemirror/')
            ) {
              return 'vendor-codemirror'
            }
            // 表單與狀態管理拆分
            if (
              id.includes('node_modules/react-hook-form/') || 
              id.includes('node_modules/@hookform/') ||
              id.includes('node_modules/zustand/') ||
              id.includes('node_modules/@tanstack/react-query/')
            ) {
              return 'vendor-forms-state'
            }
            // 工具庫與其他 node_modules
            if (
              id.includes('node_modules/lodash-es/') || 
              id.includes('node_modules/dayjs/') ||
              id.includes('node_modules/axios/') ||
              id.includes('node_modules/zod/')
            ) {
              return 'vendor-utils'
            }
            
            // 其餘所有的第三方依賴
            if (id.includes('node_modules')) {
              return 'vendor-others'
            }
          }
        }
      }
    }
  }
})
