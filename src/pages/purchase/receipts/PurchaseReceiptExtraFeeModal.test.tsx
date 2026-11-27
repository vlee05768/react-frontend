import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import PurchaseReceiptExtraFeeModal from './PurchaseReceiptExtraFeeModal';
import { useAuthStore } from '@/stores/useAuthStore';
import * as sdk from '@/api/generated/sdk.gen';

vi.mock('@/api/generated/sdk.gen', async (load) => {
  const actual = await load<typeof import('@/api/generated/sdk.gen')>();
  return { ...actual, postApiV1PurchaseReceiptByCodeExtraFeePreview: vi.fn(), postApiV1PurchaseReceiptByCodeExtraFeeExecute: vi.fn() };
});
vi.mock('react-router-dom', async (load) => {
  const actual = await load<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn() };
});

if (!window.matchMedia) window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
const preview = { data: { data: { previousExtraFeeTotal: 0, newExtraFeeTotal: 25, affectedRollCount: 1, affectedWorkOrderCount: 1, affectedRolls: [{ rollNo: 'LPN-1', materialCode: '3M-8015-0.15-R', previousCostPerSqm: 10, newCostPerSqm: 11 }], affectedWorkOrders: [{ workOrderNumber: 'WO-1', workOrderType: 'STANDARD', outputCode: 'P-1', status: 'Completed' }] } } };
const setup = () => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><App><PurchaseReceiptExtraFeeModal open code="PR-1" initialItems={[]} onClose={vi.fn()} /></App></MemoryRouter></QueryClientProvider>);
};

describe('PurchaseReceiptExtraFeeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { userName: 'fin', roles: [], permissions: ['Purchase.Receipts.AdjustExtraFee', 'ProductionQuality.WorkOrders.CostSettlement'] } });
    vi.mocked(sdk.postApiV1PurchaseReceiptByCodeExtraFeePreview).mockResolvedValue(preview as never);
    vi.mocked(sdk.postApiV1PurchaseReceiptByCodeExtraFeeExecute).mockResolvedValue({ data: { data: { affectedWorkOrders: [{ workOrderNumber: 'WO-1' }] } } } as never);
  });
  it('預覽送出費用 payload、顯示 LPN 與製令結果，執行後導向指定製令結算', async () => {
    const navigate = vi.fn(); vi.mocked(useNavigate).mockReturnValue(navigate);
    setup();
    fireEvent.click(screen.getByRole('button', { name: '預覽成本變動' }));
    await screen.findByText('LPN-1');
    expect(sdk.postApiV1PurchaseReceiptByCodeExtraFeePreview).toHaveBeenCalledWith(expect.objectContaining({ path: { code: 'PR-1' }, body: { extraFeeItems: [] } }));
    expect(screen.getByText('WO-1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '確認執行' }));
    fireEvent.click(await screen.findByRole('button', { name: '確認更新' }));
    await waitFor(() => expect(sdk.postApiV1PurchaseReceiptByCodeExtraFeeExecute).toHaveBeenCalled());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/production-quality/work-order-cost-settlement', { state: { workOrderNumbers: ['WO-1'] } }));
  });
  it('手動新增費用列後，預覽與執行均序列化同一筆費用明細', async () => {
    const navigate = vi.fn(); vi.mocked(useNavigate).mockReturnValue(navigate);
    setup();
    fireEvent.change(screen.getByPlaceholderText('預設 EXTRA-FEE'), { target: { value: 'FREIGHT' } });
    fireEvent.change(screen.getByLabelText('單價'), { target: { value: '25.5' } });
    fireEvent.change(screen.getByLabelText('說明'), { target: { value: '運費補登' } });
    fireEvent.click(screen.getByRole('button', { name: '新增費用' }));
    await screen.findByText('FREIGHT');
    fireEvent.click(screen.getByRole('button', { name: '預覽成本變動' }));
    await screen.findByText('LPN-1');
    const expectedBody = { extraFeeItems: [expect.objectContaining({ materialCode: 'FREIGHT', unitPrice: 25.5, notes: '運費補登' })] };
    expect(sdk.postApiV1PurchaseReceiptByCodeExtraFeePreview).toHaveBeenCalledWith(expect.objectContaining({ path: { code: 'PR-1' }, body: expectedBody }));
    fireEvent.click(screen.getByRole('button', { name: '確認執行' }));
    fireEvent.click(await screen.findByRole('button', { name: '確認更新' }));
    await waitFor(() => expect(sdk.postApiV1PurchaseReceiptByCodeExtraFeeExecute).toHaveBeenCalledWith(expect.objectContaining({ path: { code: 'PR-1' }, body: expectedBody })));
  });
  it('預覽失敗時不呈現結果且不允許執行', async () => {
    vi.mocked(sdk.postApiV1PurchaseReceiptByCodeExtraFeePreview).mockRejectedValue(new Error('preview failed'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: '預覽成本變動' }));
    await waitFor(() => expect(sdk.postApiV1PurchaseReceiptByCodeExtraFeePreview).toHaveBeenCalled());
    expect(screen.queryByText('預覽摘要')).toBeNull();
    expect(screen.getByRole('button', { name: '確認執行' })).toHaveProperty('disabled', true);
  });
});
