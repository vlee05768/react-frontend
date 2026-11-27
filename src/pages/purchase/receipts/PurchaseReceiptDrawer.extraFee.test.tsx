import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PurchaseReceiptDrawer from './PurchaseReceiptDrawer';
import { useAuthStore } from '@/stores/useAuthStore';
import * as sdk from '@/api/generated/sdk.gen';

vi.mock('@/api/generated/sdk.gen', async (load) => {
  const actual = await load<typeof import('@/api/generated/sdk.gen')>();
  return { ...actual, getApiV1PurchaseReceiptByCode: vi.fn() };
});
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => <div /> }));
vi.mock('@/components/Form/MasterDetailTabs', () => ({ MasterDetailTabs: () => <div /> }));
vi.mock('@/pages/purchase/receipts/PurchaseReceiptItemsTab', () => ({ default: () => <div /> }));
vi.mock('@/components/common/DocumentWatchButton', () => ({ DocumentWatchButton: () => null }));
vi.mock('@/components/common/DocumentLifecycleBanner', () => ({ DocumentLifecycleBanner: () => null }));
vi.mock('@/components/common/ActionBar', () => ({ ActionBar: () => null }));
vi.mock('@/components/Form/DrawerTitle', () => ({ DrawerTitle: () => null }));
vi.mock('./PurchaseReceiptExtraFeeModal', () => ({ default: () => null }));

const receipt = (overrides: Record<string, unknown> = {}) => ({
  documentNumber: 'PR-1', status: 'Confirmed', confirmDate: '2026-11-01', closeDate: null,
  subType: 'Material', items: [{ lineNumber: 1, inventoryType: 'O', materialCode: '3M-8015-0.15-R' }],
  ...overrides,
});

function mount(data: ReturnType<typeof receipt>, path = '/purchase/receipts/PR-1') {
  vi.mocked(sdk.getApiV1PurchaseReceiptByCode).mockResolvedValue({ data: { data } } as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[path]}><App><Routes><Route path="/purchase/receipts/:id" element={<PurchaseReceiptDrawer />} /><Route path="/purchase/mold-receipts/:id" element={<PurchaseReceiptDrawer />} /></Routes></App></MemoryRouter></QueryClientProvider>);
}

describe('PurchaseReceiptDrawer 附加費操作權限與狀態', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { userName: 'fin', roles: [], permissions: ['Purchase.Receipts.AdjustExtraFee'] } });
  });

  it('有專屬權限且已確認、未結案的原料進貨單顯示操作', async () => {
    mount(receipt());
    expect(await screen.findByRole('button', { name: '補登／調整附加費' })).toBeTruthy();
  });

  it.each([
    ['缺少專屬權限', receipt(), false, '/purchase/receipts/PR-1'],
    ['未確認', receipt({ status: 'Unconfirmed', confirmDate: null }), true, '/purchase/receipts/PR-1'],
    ['已結案', receipt({ closeDate: '2026-11-02' }), true, '/purchase/receipts/PR-1'],
    ['模具進貨單', receipt({ subType: 'Mold' }), true, '/purchase/mold-receipts/PR-1'],
  ])('%s 時隱藏操作', async (caseName, data, hasPermission, path) => {
    void caseName;
    if (hasPermission) useAuthStore.setState({ user: { userName: 'fin', roles: [], permissions: ['Purchase.Receipts.AdjustExtraFee'] } });
    mount(data as ReturnType<typeof receipt>, path as string);
    await waitFor(() => expect(sdk.getApiV1PurchaseReceiptByCode).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: '補登／調整附加費' })).toBeNull();
  });
});
