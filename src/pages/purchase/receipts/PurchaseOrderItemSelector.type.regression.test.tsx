import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PurchaseOrderItemSelector from './PurchaseOrderItemSelector';

const { getOrders, getMaterial } = vi.hoisted(() => ({ getOrders: vi.fn(), getMaterial: vi.fn() }));
vi.mock('@/api/generated', async original => ({ ...await original<object>(), getApiV1PurchaseOrder: getOrders, getApiV1MaterialByCode: getMaterial }));
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
  const realStyle = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => realStyle(element));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

async function select(order: object) {
  getOrders.mockResolvedValue({ data: { data: { data: [order] } } });
  const confirm = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><App><PurchaseOrderItemSelector open onClose={() => {}} onConfirm={confirm} businessPartnerCode="S1" excludedKeys={[]} /></App></QueryClientProvider>);
  await screen.findByText('測試品');
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  fireEvent.click(screen.getByRole('button', { name: /加入進貨明細/ }));
  return confirm;
}
const item = { lineNumber: '1', goodsCode: 'M1', goodsName: '測試品', quantity: 3, width: 500, length: 100, unit: 'pcs' };

describe('採購類型來源', () => {
  it.each([undefined, null, 'Other'])('類型 %s 無法確定時阻止加入，即使有卷料型態', async type => {
    const confirm = await select({ code: 'PO', items: [{ ...item, purchaseOrderType: type, materialForm: 'R' }] });
    await screen.findByText(/無法確認採購類別/);
    expect(confirm).not.toHaveBeenCalled();
  });
  it('明細無類型時使用採購單表頭原料類型並正確計算卷料面積', async () => {
    const confirm = await select({ code: 'PO', purchaseOrderType: 'Material', items: [{ ...item, materialForm: 'R' }] });
    await waitFor(() => expect(confirm).toHaveBeenCalledWith([expect.objectContaining({ isRoll: true, quantity: 150 })]));
  });
  it('表頭及明細類型衝突時阻止加入', async () => {
    const confirm = await select({ code: 'PO', purchaseOrderType: 'Mold', items: [{ ...item, purchaseOrderType: 'Material', materialForm: 'R' }] });
    await screen.findByText(/無法確認採購類別/);
    expect(confirm).not.toHaveBeenCalled();
  });
});
