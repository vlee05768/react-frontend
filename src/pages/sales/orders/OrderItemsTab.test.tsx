import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderDto, OrderItemDto, UpdateOrderItemDto } from '@/api/generated/types.gen';
import type { CustomerProductPickerModal } from './components/CustomerProductPickerModal';
import OrderItemsTab from './OrderItemsTab';

type PickerProps = ComponentProps<typeof CustomerProductPickerModal>;
type Selection = {
  lineNumber?: string;
  code: string;
  name: string;
  orderUnitPrice: number;
  orderQuantity: number;
  requestedDeliveryDate: string;
};

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
const picker = vi.hoisted(() => ({ selections: [] as Selection[] }));

vi.mock('@/api/generated/sdk.gen', () => ({
  postApiV1OrdersByOrderNumberDetails: api.create,
  putApiV1OrdersByOrderNumberDetailsByLineNumber: api.update,
  deleteApiV1OrdersByOrderNumberDetailsByLineNumber: api.remove,
  getApiV1MaterialByCode: vi.fn(),
}));
vi.mock('@/components/Table/ErpTable', () => ({ default: () => null }));
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => null }));
vi.mock('./OrderConfig', () => ({ getItemColumns: () => [], getItemFormConfig: () => [] }));
// 僅隔離選品視窗與表格；從實際頁面按鈕開啟，確認時執行真正的批次同步入口。
vi.mock('./components/CustomerProductPickerModal', () => ({
  CustomerProductPickerModal: ({ open, onConfirm, loading }: PickerProps) => open ? (
    <button disabled={loading} onClick={() => onConfirm(picker.selections)}>確認同步</button>
  ) : null,
}));

const original: OrderItemDto = {
  lineNumber: '0001', goodsType: 'P', goodsCode: 'P-001', goodsName: '測試產品',
  unitPrice: 20, quantity: 10, requestedDeliveryDate: '2026-11-01',
  spareQuantity: 7, isOutsource: true,
};

function selection(item: OrderItemDto, changes: Partial<Selection> = {}): Selection {
  return {
    lineNumber: item.lineNumber!, code: item.goodsCode!, name: item.goodsName!,
    orderUnitPrice: item.unitPrice!, orderQuantity: item.quantity!,
    requestedDeliveryDate: item.requestedDeliveryDate!, ...changes,
  };
}

async function sync(items: OrderItemDto[], selections: Selection[]) {
  picker.selections = selections;
  const orderData: OrderDto = {
    orderNumber: 'SO-FIXTURE-001', status: 'Draft', businessPartnerCode: 'C-001',
    customerCode: 'C-001', requestedDeliveryDate: '2026-11-01', orderItems: items,
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <App>
      <QueryClientProvider client={client}>
        <OrderItemsTab orderData={orderData} isMasterViewMode onEditingChange={() => undefined} />
      </QueryClientProvider>
    </App>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '挑選客戶產品' }));
  await user.click(screen.getByRole('button', { name: '確認同步' }));
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders'] }));
  expect(screen.queryByRole('button', { name: '確認同步' })).not.toBeInTheDocument();
  client.clear();
}

function expectUneditedFieldsPreserved(item: OrderItemDto, body: UpdateOrderItemDto) {
  // DTO 的局部更新語意：不送回未編輯欄位，也不覆蓋伺服器較新的值。
  expect(body).not.toHaveProperty('spareQuantity');
  expect(body).not.toHaveProperty('isOutsource');
  expect({ ...item, ...body }).toMatchObject({
    spareQuantity: item.spareQuantity, isOutsource: item.isOutsource,
  });
}

describe('訂單客戶產品批次同步', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom 不支援偽元素樣式；此測試只驗證同步行為，不量測捲軸。
    const getComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => getComputedStyle(element));
    api.create.mockResolvedValue({ data: {} });
    api.update.mockResolvedValue({ data: {} });
    api.remove.mockResolvedValue({ data: {} });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each([
    { name: '單價', changes: { orderUnitPrice: 25 }, expected: { unitPrice: 25 } },
    { name: '數量', changes: { orderQuantity: 15 }, expected: { quantity: 15 } },
    { name: '要求交期', changes: { requestedDeliveryDate: '2026-11-05' }, expected: { requestedDeliveryDate: '2026-11-05' } },
  ].flatMap(change => [
    { ...change, state: '正備品與委外', item: original },
    { ...change, state: '零備品與非委外', item: { ...original, spareQuantity: 0, isOutsource: false } },
  ]))('僅修改$name時保留既有$state設定', async ({ changes, expected, item }) => {
    await sync([item], [selection(item, changes)]);
    expect(api.update).toHaveBeenCalledTimes(1);
    const request = api.update.mock.calls[0][0];
    expect(request.path).toEqual({ orderNumber: 'SO-FIXTURE-001', lineNumber: '0001' });
    expect(request.body).toMatchObject(expected);
    expectUneditedFieldsPreserved(item, request.body);
    expect(api.create).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
  });

  it('同產品多交期按行號同步，新增維持預設且未修改行不送出更新', async () => {
    const second = { ...original, lineNumber: '0002', requestedDeliveryDate: '2026-11-10', spareQuantity: 0, isOutsource: false };
    const unchanged = { ...original, lineNumber: '0003', requestedDeliveryDate: '2026-11-15', spareQuantity: 3 };
    const removed = { ...original, lineNumber: '0004', requestedDeliveryDate: '2026-11-20' };
    await sync([original, second, unchanged, removed], [
      selection(second, { orderQuantity: 30 }),
      selection(unchanged),
      selection(original, { orderUnitPrice: 35, orderQuantity: 25, requestedDeliveryDate: '2026-11-03' }),
      selection(original, { lineNumber: undefined, orderUnitPrice: 40, orderQuantity: 5, requestedDeliveryDate: '2026-11-25' }),
    ]);

    expect(api.update).toHaveBeenCalledTimes(2);
    const requests = new Map<string, UpdateOrderItemDto>(api.update.mock.calls.map(([request]) => [request.path.lineNumber, request.body]));
    expect(requests.get('0001')).toMatchObject({ unitPrice: 35, quantity: 25, requestedDeliveryDate: '2026-11-03' });
    expect(requests.get('0002')).toMatchObject({ unitPrice: 20, quantity: 30, requestedDeliveryDate: '2026-11-10' });
    expectUneditedFieldsPreserved(original, requests.get('0001')!);
    expectUneditedFieldsPreserved(second, requests.get('0002')!);
    expect(api.remove).toHaveBeenCalledExactlyOnceWith({ path: { orderNumber: 'SO-FIXTURE-001', lineNumber: '0004' } });
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create.mock.calls[0][0]).toMatchObject({
      path: { orderNumber: 'SO-FIXTURE-001' },
      body: { goodsCode: 'P-001', unitPrice: 40, quantity: 5, requestedDeliveryDate: '2026-11-25', spareQuantity: 0, isOutsource: false },
    });
  });

  it('確認未修改的明細不發送任何異動', async () => {
    await sync([original], [selection(original)]);
    expect(api.update).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
  });
});
