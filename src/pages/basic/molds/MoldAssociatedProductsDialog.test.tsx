import { AxiosHeaders } from 'axios';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { client } from '@/api/generated/client.gen';
import MoldAssociatedProductsDialog from './MoldAssociatedProductsDialog';
import { useAuthStore } from '@/stores/useAuthStore';
import { createJSONStorage } from 'zustand/middleware';

const mocks = vi.hoisted(() => ({ allowed: true, products: vi.fn(), molds: vi.fn() }));
vi.mock('@/api/generated/sdk.gen', () => ({ getApiV1Product: mocks.products, getApiV1ProductByProductCodeMolds: mocks.molds }));
const request = vi.spyOn(client, 'get');
function response(pageNumber = 1, totalRecords = 1, rows = [{ code: 'P-001', name: '產品一' as string | null }]) {
  return { status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() }, error: undefined, data: { success: true, code: 200, message: '操作成功', errors: null, data: { pageNumber, pageSize: 100, totalPages: Math.ceil(totalRecords / 100), totalRecords, data: rows } } };
}
function harness(open = true, code = 'MOLD-001') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (isOpen: boolean, moldCode: string) => <App><QueryClientProvider client={queryClient}><MoldAssociatedProductsDialog open={isOpen} mold={{ code: moldCode, name: '測試模具' }} onClose={vi.fn()} /></QueryClientProvider></App>;
  const view = render(tree(open, code));
  return { ...view, set: (isOpen: boolean, moldCode = code) => view.rerender(tree(isOpen, moldCode)), dispose: () => { view.unmount(); queryClient.clear(); } };
}
const getComputedStyle = window.getComputedStyle.bind(window);
beforeEach(() => {
  const storage = new Map<string, string>();
  useAuthStore.persist.setOptions({ storage: createJSONStorage(() => ({ getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: (key) => { storage.delete(key); } })) });
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => getComputedStyle(element));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  useAuthStore.setState({ user: { userName: 'operator', roles: [], permissions: ['BasicData.Products.View'] }, permissionTree: [{ key: 'BasicData.Products.View', active: true }] });
  request.mockReset();
  request.mockResolvedValue(response());
  mocks.products.mockResolvedValue({ data: { data: { data: [] } } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('MoldAssociatedProductsDialog', () => {
  it.each([null, [], [{ key: 'BasicData.Products.View', active: false }], [{ key: 'BasicData.Products.View' }]].map((tree) => [tree]))('Admin fails closed for unavailable/disabled exact node %j', (permissionTree) => {
    useAuthStore.setState({ user: { userName: 'admin', roles: ['Admin'], permissions: [] }, permissionTree });
    const view = harness();
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.dispose();
  });
  it('allows Admin with an active exact node without explicit grants', async () => {
    useAuthStore.setState({ user: { userName: 'admin', roles: ['Admin'], permissions: [] } });
    const view = harness();
    await screen.findByText('P-001');
    expect(request).toHaveBeenCalledTimes(1);
    view.dispose();
  });
  it.each([null, [], [{ key: 'BasicData.Products.View', active: false }]].map((tree) => [tree]))('revocation closes an open dialog, aborts and does not resume requests %j', async (permissionTree) => {
    request.mockImplementationOnce(() => new Promise<ReturnType<typeof response>>(() => {}));
    const view = harness();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const signal = request.mock.calls[0][0].signal;
    act(() => useAuthStore.setState({ permissionTree }));
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    view.dispose();
  });
  it('makes no calls and renders no dialog when permission is denied', () => {
    useAuthStore.setState({ user: { roles: [], permissions: [] } });
    const view = harness();
    expect(request).not.toHaveBeenCalled();
    expect(mocks.products).not.toHaveBeenCalled();
    expect(mocks.molds).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.dispose();
  });
  it('renders the empty state for an empty server page', async () => {
    request.mockResolvedValueOnce(response(1, 0, []));
    const view = harness();
    await screen.findByText('目前沒有產品使用此模具');
    expect(request).toHaveBeenCalledTimes(1);
    view.dispose();
  });
  it.each([404, 403, 500, 'network'])('keeps error separate from empty and retries %s once', async (status) => {
    request.mockRejectedValueOnce(status === 'network' ? new Error('offline') : { response: { status, data: { success: false, code: status, message: '失敗', data: null, errors: null } } });
    const view = harness();
    await screen.findByText('無法載入關聯產品。');
    expect(screen.queryByText('目前沒有產品使用此模具')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /重試/ }));
    await screen.findByText('P-001');
    expect(request).toHaveBeenCalledTimes(2);
    view.dispose();
  });
  it('treats a failed ApiResponse as error, not an empty page', async () => {
    const failure = response();
    failure.data.success = false;
    request.mockResolvedValueOnce(failure);
    const view = harness();
    await screen.findByText('無法載入關聯產品。');
    fireEvent.click(screen.getByRole('button', { name: /重試/ }));
    await screen.findByText('P-001');
    expect(request).toHaveBeenCalledTimes(2);
    view.dispose();
  });
  it('aborts on close and cannot show a late previous-mold response after reopening', async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    request.mockImplementationOnce(() => new Promise<ReturnType<typeof response>>((done) => { resolve = done; }));
    const view = harness();
    expect(screen.getByRole('status')).toBeInTheDocument();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const signal = request.mock.calls[0][0].signal;
    view.set(false);
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    view.set(true, 'MOLD-002');
    await screen.findByText('P-001');
    resolve(response(1, 1, [{ code: 'LATE-OLD', name: null }]));
    await waitFor(() => expect(screen.queryByText('LATE-OLD')).not.toBeInTheDocument());
    expect(request).toHaveBeenCalledTimes(2);
    view.dispose();
  });
  it('encodes the mold code as one path segment and handles a nullable name', async () => {
    request.mockResolvedValueOnce(response(1, 1, [{ code: 'NULL-NAME', name: null }]));
    const view = harness(true, 'M/+ 001');
    await screen.findByText('NULL-NAME');
    expect(request.mock.calls[0][0].path).toEqual({ code: 'M/+ 001' });
    view.dispose();
  });
  it('switches molds from page 2 to page 1 without old rows or a duplicate request', async () => {
    request.mockResolvedValueOnce(response(1, 101)).mockResolvedValueOnce(response(2, 101, [{ code: 'OLD-PAGE-2', name: null }]));
    const view = harness();
    await screen.findByText('P-001');
    fireEvent.click(screen.getByTitle('2'));
    await screen.findByText('OLD-PAGE-2');
    let resolve!: (value: ReturnType<typeof response>) => void;
    request.mockImplementationOnce(() => new Promise<ReturnType<typeof response>>((done) => { resolve = done; }));
    view.set(true, 'MOLD-002');
    expect(screen.queryByText('OLD-PAGE-2')).not.toBeInTheDocument();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(request.mock.calls[2][0].path).toEqual({ code: 'MOLD-002' });
    expect(request.mock.calls[2][0].query).toEqual({ pageNumber: 1, pageSize: 100 });
    resolve(response(1, 1, [{ code: 'NEW-PRODUCT', name: null }]));
    await screen.findByText('NEW-PRODUCT');
    expect(request).toHaveBeenCalledTimes(3);
    view.dispose();
  });
  it('reopens at page 1 and waits for fresh rows, not cached rows', async () => {
    request.mockResolvedValueOnce(response(1, 101)).mockResolvedValueOnce(response(2, 101, [{ code: 'OLD-PAGE-2', name: null }]));
    const view = harness();
    await screen.findByText('P-001');
    fireEvent.click(screen.getByTitle('2'));
    await screen.findByText('OLD-PAGE-2');
    view.set(false);
    let resolve!: (value: ReturnType<typeof response>) => void;
    request.mockImplementationOnce(() => new Promise<ReturnType<typeof response>>((done) => { resolve = done; }));
    view.set(true);
    expect(screen.queryByText('P-001')).not.toBeInTheDocument();
    expect(screen.queryByText('OLD-PAGE-2')).not.toBeInTheDocument();
    await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(request.mock.calls[2][0].query).toEqual({ pageNumber: 1, pageSize: 100 });
    resolve(response(1, 1, [{ code: 'FRESH', name: null }]));
    await screen.findByText('FRESH');
    view.dispose();
  });
  it('pages 101 products on the server, one request per page', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ code: `P-${i + 1}`, name: `產品${i + 1}` }));
    request.mockResolvedValueOnce(response(1, 101, rows)).mockResolvedValueOnce(response(2, 101, [{ code: 'P-101', name: null }]));
    const view = harness();
    await screen.findByText('P-100');
    expect(screen.queryByText('P-101')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('2'));
    await screen.findByText('P-101');
    expect(screen.queryByText('P-1')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toEqual({ url: '/api/v1/Mold/{code}/products', path: { code: 'MOLD-001' }, query: { pageNumber: 2, pageSize: 100 }, signal: expect.any(AbortSignal), throwOnError: true });
    expect(mocks.products).not.toHaveBeenCalled();
    expect(mocks.molds).not.toHaveBeenCalled();
    expect(document.querySelector('.ant-table-bordered')).toBeInTheDocument();
    expect(document.querySelector('.ant-table-body')).toHaveStyle({ overflowX: 'auto', overflowY: 'scroll', maxHeight: '420px' });
    expect(screen.getByTestId('associated-products-body')).toHaveClass('h-[520px]', 'overflow-auto');
    view.dispose();
  });
  it('lazy loads one reverse-query request and never scans products or relations', async () => {
    const view = harness(false);
    expect(request).not.toHaveBeenCalled();
    expect(mocks.products).not.toHaveBeenCalled();
    view.set(true);
    expect(await screen.findByText('P-001')).toBeInTheDocument();
    expect(screen.getByText('產品一')).toBeInTheDocument();
    for (const text of ['P-001', '產品一']) {
      expect(screen.getByText(text).closest('.h-\\[24px\\]')).toHaveClass('flex', 'items-center', 'justify-start');
    }
    expect(document.querySelector('.ant-table-body > table')).toHaveStyle({ width: 'max-content' });
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({ url: '/api/v1/Mold/{code}/products', path: { code: 'MOLD-001' }, query: { pageNumber: 1, pageSize: 100 }, signal: expect.any(AbortSignal), throwOnError: true });
    expect(mocks.products).not.toHaveBeenCalled();
    expect(mocks.molds).not.toHaveBeenCalled();
    view.dispose();
  });
});
