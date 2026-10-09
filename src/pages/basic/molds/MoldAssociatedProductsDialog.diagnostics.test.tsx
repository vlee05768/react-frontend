import { AxiosHeaders } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/api/generated/client.gen';
import MoldAssociatedProductsDialog from './MoldAssociatedProductsDialog';
import { useAuthStore } from '@/stores/useAuthStore';
import { createJSONStorage } from 'zustand/middleware';

const sdk = vi.hoisted(() => ({ products: vi.fn(), molds: vi.fn() }));
vi.mock('@/api/generated/sdk.gen', () => ({ getApiV1Product: sdk.products, getApiV1ProductByProductCodeMolds: sdk.molds }));
const request = vi.spyOn(client, 'get');
const getComputedStyle = window.getComputedStyle.bind(window);
beforeEach(() => {
  const storage = new Map<string, string>();
  useAuthStore.persist.setOptions({ storage: createJSONStorage(() => ({ getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: (key) => { storage.delete(key); } })) });
  useAuthStore.setState({ user: { roles: [], permissions: ['BasicData.Products.View'] }, permissionTree: [{ key: 'BasicData.Products.View', active: true }] });
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

// Regression: collection size must not amplify requests. No old N+1 timing expectations.
describe('關聯產品單次請求回歸', () => {
  it.each([8, 100, 101, 200, 201])('%s related products: cold open and reopen each request only one page', async (count) => {
    const rows = Array.from({ length: Math.min(count, 100) }, (_, i) => ({ code: `P-${i + 1}`, name: null }));
    request.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() }, error: undefined, data: { success: true, code: 200, message: '操作成功', errors: null, data: { data: rows, pageNumber: 1, pageSize: 100, totalRecords: count, totalPages: Math.ceil(count / 100) } } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = (open: boolean) => <QueryClientProvider client={queryClient}><MoldAssociatedProductsDialog open={open} mold={{ code: 'MOLD-001' }} onClose={vi.fn()} /></QueryClientProvider>;
    const view = render(tree(false));
    expect(request).not.toHaveBeenCalled();
    view.rerender(tree(true));
    await screen.findByText(`P-${rows.length}`);
    expect(request).toHaveBeenCalledTimes(1);
    view.rerender(tree(false));
    view.rerender(tree(true));
    await screen.findByText(`P-${rows.length}`);
    expect(request).toHaveBeenCalledTimes(2);
    for (const [options] of request.mock.calls) {
      expect(options.url).toBe('/api/v1/Mold/{code}/products');
      expect(options.path).toEqual({ code: 'MOLD-001' });
      expect(options.query).toEqual({ pageNumber: 1, pageSize: 100 });
    }
    expect(sdk.products).not.toHaveBeenCalled();
    expect(sdk.molds).not.toHaveBeenCalled();
    view.unmount();
    queryClient.clear();
  });
});
