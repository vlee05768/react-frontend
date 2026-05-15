import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import viteCompression from 'vite-plugin-compression'
import path from 'path'
import packageJson from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [react(), tailwindcss(), viteCompression()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.50.100:5160',
        changeOrigin: true,
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
          // Ant Design 組件庫與圖標拆分
          if (
            id.includes('node_modules/antd/') || 
            id.includes('node_modules/@ant-design/')
          ) {
            return 'vendor-antd'
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
})
