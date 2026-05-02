import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  plugins: ['@hey-api/client-axios'],
  input: 'http://192.168.50.100:5160/swagger/v1/swagger.json',
  output: 'src/api/generated',
});
