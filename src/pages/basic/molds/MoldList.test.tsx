import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { client } from '@/api/generated/client.gen';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import MoldList from './MoldList';
import { useAuthStore } from '@/stores/useAuthStore';
import { createJSONStorage } from 'zustand/middleware';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  permissions: ['BasicData.Products.View', 'BasicData.Molds.View', 'BasicData.Molds.Delete'],
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
  useNavigate: () => mocks.navigate,
}));
vi.mock('@/stores/productionStore', () => ({ useMoldQueryStore: () => ({ params: { pageNumber: 1, pageSize: 20 }, setParams: vi.fn(), resetParams: vi.fn() }) }));
vi.mock('@/hooks/useErpListQuery', () => ({ useErpListQuery: () => ({ isSearchModalOpen: false }) }));
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => null }));
vi.mock('@/components/Form/DynamicSearchForm', () => ({ default: () => null }));
vi.mock('@/components/Form/DictLabel', () => ({ DictLabel: () => null }));
vi.mock('@/components/Table/ActiveQueryAndSortTags', () => ({ default: () => null }));
/* eslint-disable react/forbid-dom-props -- semantic table adapter mirrors column geometry */
vi.mock('@/components/Table/StandardErpTable', () => ({ default: ({ columns, dataSource }: {
  columns: { key: string; title: string; dataIndex?: string; align?: string; width?: number; render?: (value: unknown, record: object, index: number) => import('react').ReactNode }[];
  dataSource: Record<string, unknown>[];
}) => (
  <table>
    <colgroup>{columns.map((column) => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
    <thead><tr>{columns.map((column) => (
      <th key={column.key} style={{ textAlign: column.align as 'right' }}>{column.title}</th>
    ))}</tr></thead>
    <tbody>{dataSource.map((record, index) => (
      <tr key={String(record.code)}>{columns.map((column) => (
        <td key={column.key} style={{ textAlign: column.align as 'right' }}>
          {column.render ? column.render(record[column.dataIndex ?? ''], record, index) : String(record[column.dataIndex ?? ''] ?? '')}
        </td>
      ))}</tr>
    ))}</tbody>
  </table>
) }));
/* eslint-enable react/forbid-dom-props */
// Real list/config/SDK/TableActions/Dialog; isolate layout in a semantic table.
const rows = [
  { code: 'M-001', name: '模具一', relatedProductCount: 2 },
  { code: 'M-002', name: '模具二', relatedProductCount: 0 },
  { code: 'M-003', name: '模具三', relatedProductCount: null },
  { code: 'M-004', name: '模具四' },
];
const originalConfig = client.getConfig();
const originalGetComputedStyle = window.getComputedStyle;
const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {

  const data = config.url?.includes('/products')
    ? { pageNumber: 1, pageSize: 100, totalPages: 1, totalRecords: 2, data: [{ code: 'P-001', name: '產品一' }, { code: 'P-002', name: null }] }
    : config.url?.split('?')[0] === '/api/v1/Mold/M-001' ? rows[0]
    : { pageNumber: 1, pageSize: 20, totalPages: 1, totalRecords: rows.length, data: rows };
  return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config };
});
beforeEach(() => {
  const storage = new Map<string, string>();
  useAuthStore.persist.setOptions({ storage: createJSONStorage(() => ({ getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: (key) => { storage.delete(key); } })) });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  // jsdom has no pseudo-element computed styles; retain real element styles.
  window.getComputedStyle = (element) => originalGetComputedStyle.call(window, element);
  mocks.permissions = ['BasicData.Products.View', 'BasicData.Molds.View', 'BasicData.Molds.Delete'];
  useAuthStore.setState({ user: { userName: 'operator', roles: [], permissions: mocks.permissions }, permissionTree: [{ key: 'BasicData.Products.View', active: true }] });
  mocks.navigate.mockClear();
  adapter.mockClear();
  client.setConfig({ adapter, baseURL: '' });
});
afterEach(() => { client.setConfig(originalConfig); window.getComputedStyle = originalGetComputedStyle; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function renderList(path = "/basic/molds") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<App><QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[path]}><Routes><Route path="/basic/molds/:viewId?" element={<MoldList />} /></Routes></MemoryRouter></QueryClientProvider></App>);
}
async function rowCells(code: string) {
  const row = (await screen.findByText(code)).closest('tr')!;
  return within(row).getAllByRole('cell');
}
function relationIndex() {
  return screen.getAllByRole('columnheader').findIndex((header) => header.textContent === '產品關聯');
}

describe('模具列表產品關聯欄', () => {
  it.each([null, [], [{ key: 'BasicData.Products.View', active: false }]].map((tree) => [tree]))('Drawer Admin product entry is hidden for ineffective node %j', async (permissionTree) => {
    useAuthStore.setState({ user: { userName: 'admin', roles: ['Admin'], permissions: [] }, permissionTree });
    renderList('/basic/molds/M-001');
    await screen.findByText('產品關聯');
    expect(screen.queryByRole('button', { name: /查看關聯產品/ })).not.toBeInTheDocument();
    expect(adapter.mock.calls.some(([config]) => config.url?.includes('/products'))).toBe(false);
  });
  it('active nested exact node enables Drawer entry', async () => {
    useAuthStore.setState({ permissionTree: [{ key: 'BasicData.Products', children: [{ key: 'BasicData.Products.View', active: true }] }] });
    renderList('/basic/molds/M-001');
    const button = await screen.findByRole('button', { name: /查看關聯產品/ });
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(2));
    fireEvent.click(button);
    await screen.findByText('P-001');
    expect(adapter).toHaveBeenCalledTimes(3);
  });
  it('revoking Admin permission aborts open request and closes selection permanently', async () => {
    useAuthStore.setState({ user: { userName: 'admin', roles: ['Admin'], permissions: [] } });
    renderList();
    const button = within((await rowCells('M-001'))[relationIndex()]).getByRole('button', { name: '關聯產品' });
    adapter.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(button);
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(2));
    const signal = adapter.mock.calls[1][0].signal;
    act(() => useAuthStore.setState({ permissionTree: null }));
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => useAuthStore.setState({ permissionTree: [{ key: 'BasicData.Products.View', active: true }] }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(2);
  });
  it.each([null, [], [{ key: 'BasicData.Products.View', active: false }]].map((tree) => [tree]))('Admin count fails closed without effective Products.View %j', async (permissionTree) => {
    useAuthStore.setState({ user: { userName: 'admin', roles: ['Admin'], permissions: [] }, permissionTree });
    renderList();
    const cells = await rowCells('M-001');
    expect(cells[relationIndex()]).toHaveTextContent('—');
    expect(within(cells[relationIndex()]).queryByRole('button')).not.toBeInTheDocument();
    expect(within(cells[cells.length - 1]).getAllByRole('button')).toHaveLength(2);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
  it('Admin with active node can read count and open products', async () => {
    useAuthStore.setState({ user: { userName: 'admin', roles: ['Admin'], permissions: [] } });
    renderList();
    const cell = (await rowCells('M-001'))[relationIndex()];
    expect(cell).toHaveTextContent('2');
    fireEvent.click(within(cell).getByRole('button', { name: '關聯產品' }));
    await screen.findByText('P-001');
    expect(adapter).toHaveBeenCalledTimes(2);
  });
  it('正數來自同次清單 response，欄位內容靠右且固定24px，原操作欄僅留檢視／刪除', async () => {
    renderList();
    const cells = await rowCells('M-001');
    expect(screen.getByRole('columnheader', { name: '產品關聯' })).toHaveStyle({ textAlign: 'right' });
    const cell = cells[relationIndex()];
    expect(cell).toHaveStyle({ textAlign: 'right' });
    expect(cell).toHaveTextContent('2');
    expect(cell.firstElementChild).toHaveClass('h-[24px]', 'flex', 'justify-end', 'items-center');
    const actions = cells[cells.length - 1];
    expect(within(actions).queryByRole('button', { name: '關聯產品' })).not.toBeInTheDocument();
    expect(within(actions).getAllByRole('button')).toHaveLength(2);
    const header = screen.getByRole('columnheader', { name: '操作' });
    const col = document.querySelectorAll('col')[Array.from(header.parentElement!.children).indexOf(header)];
    expect(col).toHaveStyle({ width: '120px' });
    fireEvent.click(within(actions).getByRole('button', { name: 'eye' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/basic/molds/M-001');
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].url).toBe('/api/v1/Mold?pageNumber=1&pageSize=20');
  });

  it.each([
    ['M-002', '0'],
    ['M-003', '—'],
    ['M-004', '—'],
  ])('%s 顯示 %s 且沒有 icon，不為數量送新請求', async (code, label) => {
    renderList();
    const cell = (await rowCells(code))[relationIndex()];
    expect(cell).toHaveTextContent(label);
    expect(cell.firstElementChild).toHaveClass('h-[24px]', 'justify-end');
    expect(within(cell).queryByRole('button')).not.toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('無 Products.View 時正數也顯示 —，保留模具操作且不洩漏數量或查產品', async () => {
    useAuthStore.setState({ user: { roles: [], permissions: ['BasicData.Molds.View', 'BasicData.Molds.Delete'] } });
    renderList();
    for (const row of rows) {
      const cells = await rowCells(row.code);
      expect(cells[relationIndex()]).toHaveTextContent('—');
      expect(within(cells[cells.length - 1]).getAllByRole('button')).toHaveLength(2);
    }
    expect(screen.queryByRole('button', { name: '關聯產品' })).not.toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('正數 icon 保留 Tooltip／aria／原樣式，點擊既有唯讀 Dialog 才查一次 products', async () => {
    renderList();
    const cell = (await rowCells('M-001'))[relationIndex()];
    const button = within(cell).getByRole('button', { name: '關聯產品' });
    expect(button).toHaveAttribute('aria-label', '關聯產品');
    expect(button.textContent).toBe('');
    expect(button).toHaveClass('ant-btn-text', 'ant-btn-sm', 'flex', 'items-center', 'justify-center', 'hover:opacity-80');
    expect(button).toHaveStyle({ height: '24px' });
    expect(button.querySelector('.anticon-appstore')).toHaveStyle({ fontSize: `${TABLE_ACTION_ICON_SIZE}px` });
    fireEvent.mouseEnter(button);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('關聯產品');
    expect(adapter).toHaveBeenCalledTimes(1);
    fireEvent.click(button);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('使用模具：M-001 - 模具一');
    expect(await within(dialog).findByText('P-001')).toBeInTheDocument();
    expect(within(dialog).getByText('P-002')).toBeInTheDocument();
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      '/api/v1/Mold?pageNumber=1&pageSize=20',
      '/api/v1/Mold/M-001/products?pageNumber=1&pageSize=100',
    ]);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
