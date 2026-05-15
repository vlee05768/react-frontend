import { defineConfig } from '@hey-api/openapi-ts';
import { loadEnv } from 'vite';

// 載入環境變數
const env = loadEnv('', process.cwd(), '');

if (!env.VITE_DEV_API_TARGET) {
  throw new Error('❌ [api-gen] 缺少 VITE_DEV_API_TARGET 環境變數！請在 .env 或 .env.local 中設定開發目標 API 網址。');
}

export default defineConfig({
  plugins: ['@hey-api/client-axios'],
  input: `${env.VITE_DEV_API_TARGET}/swagger/v1/swagger.json`,
  output: 'src/api/generated',
});
