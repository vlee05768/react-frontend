import { client } from './src/api/generated/client.gen';
import { getApiV1Employee } from './src/api/generated/sdk.gen';
import { initializeApi } from './src/api/initApi';

initializeApi();
// mock useAuthStore
// wait, can't easily run it directly if it depends on react/zustand local storage in browser environment
