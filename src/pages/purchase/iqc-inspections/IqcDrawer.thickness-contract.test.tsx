import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IqcDrawer from './IqcDrawer';

const api = vi.hoisted(() => ({ detail: vi.fn(), post: vi.fn(), complete: vi.fn() }));
vi.mock('@/api/generated', () => ({ getApiV1IqcInspectionByIqcRecordId: api.detail, postApiV1IqcInspectionByIqcRecordIdEscalate: vi.fn(), postApiV1IqcInspectionByIqcRecordIdComplete: api.complete, getApiV1IqcInspectionByIqcRecordIdPdf: vi.fn() }));
vi.mock('@/api/generated/client.gen', () => ({ client: { post: api.post } }));
const auth = vi.hoisted(() => ({ user: { permissions: ['Purchase.IqcInspections.View'] } }));
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: () => ({ user: auth.user, hasPermission: (code: string) => auth.user.permissions.includes(code) }) }));
vi.mock('@/hooks/useFileDownload', () => ({ useFileDownload: () => ({ downloadFile: vi.fn(), isDownloading: false }) }));
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => null }));
vi.mock('@/components/Form/AsyncSelect', () => ({ AsyncSelect: () => null }));
vi.mock('@/components/common/ActionBar', () => ({ ActionBar: ({ actions }: any) => <div>{actions}</div> }));
vi.mock('@/components/Table/ErpTable', () => ({ default: ({ dataSource, columns }: any) => <div>{dataSource.map((row: any, i: number) => <div data-testid={`sample-${row.rollNo}`} key={row.id ?? row.rollNo}>{columns.map((col: any, j: number) => <div data-testid={`sample-${row.rollNo}-${col.key ?? col.dataIndex}`} key={j}>{col.render ? col.render(row[col.dataIndex], row, i) : row[col.dataIndex]}</div>)}</div>)}</div> }));

beforeEach(() => {
  auth.user.permissions = ['Purchase.IqcInspections.View'];
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  api.complete.mockReset().mockImplementation(() => new Promise(() => {}));
  api.detail.mockReset();
  api.post.mockReset();
  api.post.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

// 公開 Drawer 互動與 API mock seam；不是 HTTP 或資料庫驗收。
async function renderThickness(thickness: number | null | undefined, form = 'S', itemValue = '', judgment: boolean | null = true) {
  const sample = { sampleId: 'sample-1', seq: 1, rollNo: 'S1', supplierLotNo: 'LOT', actualQtyAux: 1,
    ...(thickness !== undefined ? { measuredSampleThicknessMm: thickness } : {}),
    measuredCoreDiaMm: 86, measuredOuterDiaMm: 160.5, isOk: judgment,
    inspectionItems: [
      ...(itemValue ? [{ itemCode: 'thickness', itemName: '厚度', measuredValue: itemValue, isOk: judgment }] : []),
      { itemCode: 'width', itemName: '寬度', measuredValue: '150', isOk: true },
      { itemCode: form === 'R' ? 'core_dia' : 'length', itemName: '尺寸', measuredValue: form === 'R' ? '86' : '300', isOk: true },
    ] };
  const original = { lotNo: 'IQC-THICKNESS', materialForm: form, revision: 7, inspectionType: 'Incoming',
    inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 1,
    standardThickness: 0.99, standardWidth: 150, standardLength: 300,
    groups: [{ id: 'g1', supplierLotNo: 'LOT', allocatedQty: 1, sampleQty: 1, measuredCoreDiaMm: 86, samples: [{ sampleId: 'sample-1' }] }], rolls: [sample] };
  api.detail.mockResolvedValue({ data: { data: original } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="thickness" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('LOT');
  return original;
}
function samples(body: any) { return [body.rolls[0], body.groups[0].samples[0]]; }

it.each([undefined, null, 0.05])('GET 厚度 %s 草稿雙 payload 保留缺失／null／實測，不建立舊欄', async thickness => {
  await renderThickness(thickness);
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
  for (const sample of samples(api.post.mock.calls[0][0].body)) {
    expect(sample).not.toHaveProperty('measuredThicknessMm');
    if (thickness === undefined) expect(sample).not.toHaveProperty('measuredSampleThicknessMm');
    else expect(sample.measuredSampleThicknessMm).toBe(thickness);
  }
});

it.each([undefined, null])('厚度 %s 即使細項有值也不得計算長度或通過完成檢核', async thickness => {
  await renderThickness(thickness, 'R', '0.05');
  expect(screen.queryByText('288.5 M')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  expect(await screen.findByText(/請輸入.*實測厚度/)).toBeTruthy();
  expect(api.complete).not.toHaveBeenCalled();
});

it('樣品實測厚度填入缺少的細項但維持未判定', async () => {
  await renderThickness(0.05, 'S', '', null);
  const group = screen.getByRole('radiogroup', { name: '厚度(mm)細項判定' });
  expect(within(group).getByText('未判定')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  expect(screen.getAllByPlaceholderText('實測值').some(e => (e as HTMLInputElement).value === '0.05')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
  for (const sample of samples(api.post.mock.calls[0][0].body)) {
    expect(sample.isOk).toBeNull();
    expect(sample.inspectionItems.find((i: any) => i.itemCode === 'thickness')).toMatchObject({ measuredValue: '0.05', isOk: null });
  }
});

it.each(['0.06', ''])('手動厚度 %s 草稿與真 DTO 形狀 mock 讀回一致且不自動判定', async value => {
  const original = await renderThickness(0.05, 'R', '0.05', null);
  api.post.mockImplementation(async ({ body }: any) => {
    api.detail.mockResolvedValue({ data: { data: { ...original, revision: 8,
      rolls: body.rolls.map(({ measuredThicknessMm: _legacy, ...sample }: any) => sample),
      groups: body.groups.map((g: any) => ({ ...g, id: 'g1' })) } } });
    return { data: {} };
  });
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const input = screen.getAllByPlaceholderText('實測值').find(e => (e as HTMLInputElement).value === '0.05')!;
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
  for (const sample of samples(api.post.mock.calls[0][0].body)) {
    expect(sample).not.toHaveProperty('measuredThicknessMm');
    expect(sample.measuredSampleThicknessMm).toBe(value ? 0.06 : null);
    expect(sample.isOk).toBeNull();
    expect(sample.inspectionItems.find((i: any) => i.itemCode === 'thickness').isOk).toBeNull();
    if (!value) expect(sample.measuredLengthMm).toBeNull();
  }
  await screen.findByRole('button', { name: /編輯/ });
  await waitFor(() => expect(api.detail.mock.calls.length).toBeGreaterThan(1));
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const row = screen.getByTestId('sample-S1');
  const group = within(row).getByRole('radiogroup', { name: '厚度細項判定' });
  expect(within(group).getByText('未判定')).toBeTruthy();
  expect(within(row).getByRole('radio', { name: /^合格$/ })).not.toBeChecked();
  const thicknessCell = within(row).getByTestId('sample-S1-thickness');
  expect(within(thicknessCell).getByPlaceholderText('實測值')).toHaveValue(value);
});

it('真 DTO 樣品厚度可完成且雙 payload 不推定舊厚度', async () => {
  await renderThickness(0.05, 'S', '0.05');
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  fireEvent.click(await screen.findByRole('button', { name: /確認過帳/ }));
  await waitFor(() => expect(api.complete).toHaveBeenCalledOnce());
  for (const sample of samples(api.complete.mock.calls[0][0].body)) {
    expect(sample.measuredSampleThicknessMm).toBe(0.05);
    expect(sample).not.toHaveProperty('measuredThicknessMm');
  }
});

it.each(['開啟前', '開啟後'])('判定視窗%s撤回檢視權限，即使有其他權限也拒絕完成', async timing => {
  await renderThickness(0.05, 'S', '0.05');
  if (timing === '開啟前') auth.user.permissions = ['Purchase.IqcInspections.Other'];
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  const confirm = await screen.findByRole('button', { name: /確認過帳/ });
  if (timing === '開啟前') {
    expect(confirm).toBeDisabled();
  } else {
    auth.user.permissions = [];
    fireEvent.click(confirm);
    expect(await screen.findByText(/目前已無此品檢單的操作權限/)).toBeTruthy();
  }
  expect(api.complete).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
});
