import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import PurchaseOrderItemSelector from './PurchaseOrderItemSelector';
import PurchaseReceiptItemsTab from './PurchaseReceiptItemsTab';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { getItemFormConfig as receiptFields, getItemColumns as receiptColumns, itemTableColumns } from './PurchaseReceiptConfig';
import { getItemFormConfig as orderFields, getItemColumns as orderColumns } from '../orders/PurchaseOrderConfig';
import { getIqcFormFields } from '../iqc-inspections/IqcConfig';

const { getOrders, updateReceipt } = vi.hoisted(() => ({ getOrders: vi.fn(), updateReceipt: vi.fn() }));
vi.mock('@/api/generated/sdk.gen', async (original) => ({ ...await original<object>(), putApiV1PurchaseReceiptByCodeItemsByLineNumber: updateReceipt }));
vi.mock('@/api/generated', async (original) => ({ ...await original<object>(), getApiV1PurchaseOrder: getOrders }));
vi.mock('@/components/DictSelect', () => ({ DictSelect: () => <span>待驗倉</span> }));
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
  const realStyle = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation(element => realStyle(element));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const wrap = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><App>{node}</App></MemoryRouter></QueryClientProvider>);
const input = (id: string) => document.getElementById(id) as HTMLInputElement;

describe('按卷採購表單與實際挑選器', () => {
  it.each([
    ['PO 卷料', orderFields, { purchaseOrderType: 'Material', materialForm: 'R' }, '每卷長度(m)'],
    ['PO 片料', orderFields, { purchaseOrderType: 'Material', materialForm: 'S' }, '片料長度(mm)'],
    ['進貨卷料', receiptFields, { isRoll: true }, '每卷長度(m)'],
    ['進貨片料', receiptFields, { isRoll: false }, '片料長度(mm)'],
  ] as const)('%s 的 DOM 標籤、placeholder 與驗證訊息使用相同語義', (_name, fields, values, label) => {
    const lengthField = fields().find(field => field.name === 'length');
    wrap(<DynamicForm fields={[lengthField]} defaultValues={{ ...values, length: 100 }} onSubmit={() => {}} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(`請輸入${label}`)).toBe(input('length'));
    expect(screen.queryByText(label === '每卷長度(m)' ? '片料長度(mm)' : '每卷長度(m)')).not.toBeInTheDocument();
    const validation = lengthField.dynamicValidation({ values });
    for (const invalid of [undefined, 'abc', 0]) {
      const result = validation.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].message).toContain(label);
    }
    expect(validation.safeParse(100).success).toBe(true);
  });
  it('採購與進貨混合卷片表頭區分單位；總長標籤與卷數乘每卷長不變', () => {
    const poLength = orderColumns(true, () => {}, () => {}).find(col => 'dataIndex' in col && col.dataIndex === 'length');
    const receiptLength = receiptColumns(true).find(col => col.dataIndex === 'length');
    expect(poLength?.title).toBe('每卷／片長');
    expect(poLength?.headerHint).toBe('卷料：每卷長度(m)\n片料：片料長度(mm)');
    expect(receiptLength.title).toBe('每卷／片長');
    expect(receiptLength.headerHint).toBe(poLength?.headerHint);
    expect(itemTableColumns().find(col => col.name === 'length')?.label).toBe('每卷／片長');
    expect(receiptFields().find(field => field.name === 'totalLength').label).toBe('總長度 (M)');
    const totalColumn = receiptColumns(true).find(col => col.dataIndex === 'totalLength');
    expect(totalColumn.title).toBe('總長度(M)');
    wrap(<>{totalColumn.render(999, { isRoll: true, rollCount: 3, length: 100 })}{receiptLength.render(100, { isRoll: true, length: 100 })}{receiptLength.render(600, { isRoll: false, length: 600 })}</>);
    expect(screen.getByText('300 M')).toBeInTheDocument();
    expect(screen.getByText('m')).toBeInTheDocument();
    expect(screen.getByText('mm')).toBeInTheDocument();
    expect(receiptColumns(true, undefined, undefined, true).some(col => col.dataIndex === 'length')).toBe(false);
  });
  it('IQC 的標準長度確為每卷驗收規格；片料標準與到貨總長不改', () => {
    const context = { isReadOnly: false, setRolls: vi.fn(), detail: {}, inspectorId: '', setInspectorId: vi.fn(), headerCoreDia: null, setHeaderCoreDia: vi.fn(), incomingStorageCode: '', setIncomingStorageCode: vi.fn(), totalLength: 300 };
    const rollFields = getIqcFormFields({ ...context, isRollMaterial: true });
    const lengthField = rollFields.find(field => field.name === 'standardLength');
    wrap(<DynamicForm fields={[lengthField]} defaultValues={{ standardLength: 100 }} onSubmit={() => {}} />);
    expect(screen.getByText('每卷長度(m)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('請輸入每卷長度(m)')).toHaveValue('100');
    expect(rollFields.find(field => field.name === 'totalActualQty').label).toBe('到貨總長度');
    expect(getIqcFormFields({ ...context, isRollMaterial: false }).find(field => field.name === 'standardLength').label).toBe('標準長度 (mm)');
  });
  it('實際 PO selector 同時呈現卷料 m 與片料 mm，不混稱總長或每卷片料', async () => {
    getOrders.mockResolvedValue({ data: { data: { data: [{ code: 'PO-MIX', items: [
      { lineNumber: '1', goodsCode: 'R-1', goodsName: '卷料', materialForm: 'R', purchaseOrderType: 'Material', unit: '卷', quantity: 3, receivedQuantity: 0, unitPrice: 1000, width: 500, length: 100 },
      { lineNumber: '2', goodsCode: 'S-1', goodsName: '片料', materialForm: 'S', purchaseOrderType: 'Material', unit: 'pcs', quantity: 3, receivedQuantity: 0, unitPrice: 20, width: 500, length: 600 },
    ] }] } } });
    wrap(<PurchaseOrderItemSelector open onClose={() => {}} onConfirm={() => {}} businessPartnerCode="S1" excludedKeys={[]} />);
    await screen.findByText('R-1');
    expect(screen.getByRole('columnheader', { name: '每卷／片長' })).toBeInTheDocument();
    expect(screen.getByText('100 m')).toBeInTheDocument();
    expect(screen.getByText('600 mm')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '到貨總長 (M)' })).toBeInTheDocument();
  });
  it('同料不同幅寬分列；到貨卷數不同於 PO，仍以卷計款、以實際到貨規格計面積', async () => {
    getOrders.mockResolvedValue({ data: { data: { data: [{ code: 'PO-1', items: [500, 800].map((width, i) => ({ lineNumber: String(i + 1), goodsCode: 'MAT-R', goodsName: '膠帶', materialForm: 'R', purchaseOrderType: 'Material', unit: 'SQM', quantity: 10, receivedQuantity: 2, unitPrice: 1000, width, length: 100 })) }] } } });
    const confirm = vi.fn();
    wrap(<PurchaseOrderItemSelector open onClose={() => {}} onConfirm={confirm} businessPartnerCode="S1" excludedKeys={[]} />);
    await screen.findAllByText('膠帶');
    const checks = screen.getAllByRole('checkbox');
    fireEvent.click(checks[0]);
    fireEvent.change(input('arrival-input-PO-1_1'), { target: { value: '3' } });
    fireEvent.blur(input('arrival-input-PO-1_1'));
    fireEvent.change(input('arrival-input-PO-1_2'), { target: { value: '4' } });
    fireEvent.blur(input('arrival-input-PO-1_2'));
    fireEvent.click(screen.getByRole('button', { name: /加入進貨明細/ }));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(confirm.mock.calls[0][0]).toEqual([
      expect.objectContaining({ rollCount: 3, width: 500, length: 100, quantity: 150, unitPrice: 1000, amount: 3000, isRoll: true, unit: '卷' }),
      expect.objectContaining({ rollCount: 4, width: 800, length: 100, quantity: 320, unitPrice: 1000, amount: 4000, isRoll: true, unit: '卷' }),
    ]);
  });
  it('超收按剩餘卷數封頂，保留每卷報價，不顯示重算單價', async () => {
    getOrders.mockResolvedValue({ data: { data: { data: [{ code: 'PO-CAP', items: [{ lineNumber: '1', goodsCode: 'MAT-R', goodsName: '封頂料', materialForm: 'R', purchaseOrderType: 'Material', unit: '卷', quantity: 20, receivedQuantity: 10, unitPrice: 1000, width: 600, length: 100 }] }] } } });
    const confirm = vi.fn();
    wrap(<PurchaseOrderItemSelector open onClose={() => {}} onConfirm={confirm} businessPartnerCode="S1" excludedKeys={[]} />);
    await screen.findByText('封頂料');
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.change(input('arrival-input-PO-CAP_1'), { target: { value: '11' } });
    fireEvent.blur(input('arrival-input-PO-CAP_1'));
    expect(screen.queryByText(/重算:/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /加入進貨明細/ }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith([expect.objectContaining({ rollCount: 11, quantity: 660, amount: 10000, unitPrice: 1000 })]));
  });
  it('實際進貨編輯儲存只 PUT 契約欄位，送出新面積而非舊 SQM', async () => {
    updateReceipt.mockResolvedValue({ data: { success: true } });
    wrap(<PurchaseReceiptItemsTab purchaseReceiptData={{ documentNumber: 'PR-1', targetPlantCode: 'TW', status: 'UNCONFIRMED', items: [{ lineNumber: '1', materialCode: 'MAT-R', materialName: '膠帶', unit: '卷', isRoll: true, rollCount: 3, width: 500, length: 100, quantity: 150, totalLength: 999, amount: 3000, unitPrice: 1000, targetStorageCode: 'TW-QC-GEN', extraData: { width: 900, length: 999, rollCount: 9, isRoll: false, supplierLot: 'LOT-OLD' } }] }} isMasterViewMode onEditingChange={() => {}} />);
    fireEvent.click(screen.getByRole('img', { name: 'edit' }).closest('button')!);
    fireEvent.change(input('width'), { target: { value: '800' } });
    fireEvent.blur(input('width'));
    fireEvent.change(input('length'), { target: { value: '120' } });
    fireEvent.blur(input('length'));
    fireEvent.change(input('rollCount'), { target: { value: '4' } });
    fireEvent.blur(input('rollCount'));
    fireEvent.click(screen.getByRole('button', { name: /儲\s*存/ }));
    await waitFor(() => expect(updateReceipt).toHaveBeenCalled());
    const request = updateReceipt.mock.calls[0][0];
    expect(request.path).toEqual({ code: 'PR-1', lineNumber: '1' });
    expect(request.body).toEqual(expect.objectContaining({ quantity: 384, width: 800, length: 120, rollCount: 4, unitPrice: 1000 }));
    expect(request.body.extraData).toEqual({ width: 800, length: 120, rollCount: 4, isRoll: true, supplierLot: 'LOT-OLD' });
    expect(request.body).not.toHaveProperty('amount');
    expect(request.body).not.toHaveProperty('totalLength');
    expect(request.body).not.toHaveProperty('costPerSqmPreview');
  });
  it('進貨表單幅寬與卷數變更即時更新面積及總長，不改每卷報價', async () => {
    wrap(<DynamicForm fields={receiptFields()} defaultValues={{ isRoll: true, rollCount: 3, width: 500, length: 100, quantity: 150, totalLength: 999, unitPrice: 1000, amount: 3000 }} onSubmit={() => {}} />);
    expect(input('quantity')).toHaveValue('150 SQM');
    fireEvent.change(input('width'), { target: { value: '800' } });
    fireEvent.blur(input('width'));
    await waitFor(() => expect(input('quantity')).toHaveValue('240 SQM'));
    expect(input('unitPrice')).toHaveValue('1,000');
    expect(input('amount')).toHaveValue('3,000');
    expect(input('costPerSqmPreview')).toHaveValue('12.5000');
    fireEvent.change(input('rollCount'), { target: { value: '4' } });
    fireEvent.blur(input('rollCount'));
    await waitFor(() => expect(input('totalLength')).toHaveValue('400 M'));
    expect(input('quantity')).toHaveValue('320 SQM');
    fireEvent.change(input('length'), { target: { value: '120' } });
    fireEvent.blur(input('length'));
    await waitFor(() => expect(input('totalLength')).toHaveValue('480 M'));
    expect(input('quantity')).toHaveValue('384 SQM');
    expect(input('unitPrice')).toHaveValue('1,000');
    expect(input('amount')).toHaveValue('3,000');
  });
  it('重新確認同一原料不得用主檔幅寬覆寫採購規格', async () => {
    const fields = orderFields();
    const goodsField = fields.find(field => field.name === 'goodsCode');
    // 隔離主檔查詢網路；仍經 DynamicForm 的 context/setValue 與原始 onChange seam。
    const seamFields = fields.map(field => field.name === 'goodsCode' ? {
      ...field, componentType: 'Custom',
      customRender: (_props: unknown, context: unknown, setValue: unknown) => <button type="button" onClick={() => goodsField.onChange('MAT-R', context, setValue, undefined, { originalData: { code: 'MAT-R', name: '膠帶', materialForm: 'R', width: 1000, length: 200 } })}>確認同料</button>,
    } : field);
    wrap(<DynamicForm fields={seamFields} defaultValues={{ purchaseOrderType: 'Material', materialForm: 'R', goodsCode: 'MAT-R', width: 800, length: 100, quantity: 3, unitPrice: 1000, subTotal: 3000 }} onSubmit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '確認同料' }));
    await waitFor(() => expect(input('width')).toHaveValue('800'));
    expect(input('length')).toHaveValue('100');
    expect(input('subTotal')).toHaveValue('3,000');
  });
  it('PO 幅寬為可編輯採購規格；改幅寬不改卷數、每卷價與貨款', async () => {
    wrap(<DynamicForm fields={orderFields()} defaultValues={{ purchaseOrderType: 'Material', materialForm: 'R', goodsCode: 'MAT-R', width: 500, length: 100, quantity: 3, unitPrice: 1000, subTotal: 3000 }} onSubmit={() => {}} />);
    expect(screen.getByText('採購幅寬 (mm)')).toBeInTheDocument();
    expect(input('width')).not.toBeDisabled();
    fireEvent.change(input('width'), { target: { value: '800' } });
    fireEvent.blur(input('width'));
    await waitFor(() => expect(input('width')).toHaveValue('800'));
    fireEvent.change(input('length'), { target: { value: '120' } });
    fireEvent.blur(input('length'));
    await waitFor(() => expect(input('length')).toHaveValue('120'));
    expect(input('quantity')).toHaveValue('3');
    expect(input('unitPrice')).toHaveValue('1,000');
    expect(input('subTotal')).toHaveValue('3,000');
  });
});
