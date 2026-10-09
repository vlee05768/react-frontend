import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { client } from './generated/client.gen';
import { initializeApi } from './initApi';
import { getMoldProducts, type MoldProductsResponse } from './moldProducts';

vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: { getState: () => ({ token: 'test-token', logout: vi.fn() }) } }));
const originalConfig = client.getConfig();
beforeAll(() => initializeApi());
afterAll(() => { client.setConfig(originalConfig); });

describe('mold products authenticated transport', () => {
  it('uses the initialized SDK instance and its auth interceptor with the precise envelope', async () => {
    const body: MoldProductsResponse = { success: true, code: 200, message: '操作成功', errors: null, data: { pageNumber: 2, pageSize: 100, totalPages: 2, totalRecords: 101, data: [{ code: 'P-101', name: null }] } };
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ({ data: body, status: 200, statusText: 'OK', headers: {}, config }));
    client.setConfig({ adapter });
    const signal = new AbortController().signal;
    expect(await getMoldProducts('M/+001', 2, signal)).toEqual(body.data);
    expect(adapter).toHaveBeenCalledTimes(1);
    const config = adapter.mock.calls[0][0];
    expect(config.baseURL).toBe('');
    expect(config.url).toBe('/api/v1/Mold/M%2F%2B001/products?pageNumber=2&pageSize=100');
    expect(config.signal).toBe(signal);
    expect(config.headers.get('Authorization')).toBe('Bearer test-token');
  });
  it('preserves the existing client rejection and error normalization for retry UI', async () => {
    client.setConfig({ adapter: async (config) => {
      const response: AxiosResponse = { status: 403, statusText: 'Forbidden', headers: {}, config, data: { title: '權限不足' } };
      throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, undefined, response);
    } });
    await expect(getMoldProducts('M-001', 1, new AbortController().signal)).rejects.toMatchObject({ response: { status: 403, data: { message: '權限不足' } } });
  });
});
