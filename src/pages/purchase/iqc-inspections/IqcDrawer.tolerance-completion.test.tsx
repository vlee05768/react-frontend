import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IqcDrawer from './IqcDrawer';

// Production 完成案例沿用已解鎖政策；仍保留可注入政策的測試 seam。
vi.mock('./productionPostingPolicy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./productionPostingPolicy')>();
  return { isProductionPostingPaused: vi.fn(actual.isProductionPostingPaused) };
});
import { isProductionPostingPaused } from './productionPostingPolicy';

const api = vi.hoisted(() => ({ detail: vi.fn(), post: vi.fn(), complete: vi.fn() }));
vi.mock('@/api/generated', () => ({ getApiV1IqcInspectionByIqcRecordId: api.detail, postApiV1IqcInspectionByIqcRecordIdEscalate: vi.fn(), postApiV1IqcInspectionByIqcRecordIdComplete: api.complete, getApiV1IqcInspectionByIqcRecordIdPdf: vi.fn() }));
vi.mock('@/api/generated/client.gen', () => ({ client: { post: api.post } }));
const auth = vi.hoisted(() => ({ user: { permissions: ['Purchase.IqcInspections.View'] } }));
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: () => ({ user: auth.user, hasPermission: (code: string) => auth.user.permissions.includes(code) }) }));
vi.mock('@/hooks/useFileDownload', () => ({ useFileDownload: () => ({ downloadFile: vi.fn(), isDownloading: false }) }));
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => null }));
vi.mock('@/components/Form/AsyncSelect', () => ({ AsyncSelect: () => null }));
vi.mock('@/components/common/ActionBar', () => ({ ActionBar: ({ actions }: any) => <div>{actions}</div> }));
vi.mock('@/components/Table/ErpTable', () => ({ default: ({ dataSource, columns }: any) => <div>{dataSource.map((row: any, i: number) => <div key={row.id ?? row.rollNo}>{columns.map((col: any, j: number) => <div key={j}>{col.render ? col.render(row[col.dataIndex], row, i) : row[col.dataIndex]}</div>)}</div>)}</div> }));

beforeEach(() => {
  auth.user.permissions = ['Purchase.IqcInspections.View'];
  vi.mocked(isProductionPostingPaused).mockReset().mockReturnValue(false);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  api.post.mockReset();
  api.post.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderInspection(measuredValue: string, isOk: boolean | null, post = true, sampleIsOk: boolean | null = true, overrides: any = {}) {
  api.complete.mockReset();
  api.detail.mockResolvedValue({ data: { data: {
    ...overrides, lotNo: 'IQC-TEST', materialForm: 'S', revision: 1, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 1,
    standardThickness: 0.05, standardWidth: 150, standardLength: 300,
    groups: [{ id: 'g1', supplierLotNo: 'LOT', allocatedQty: 1, sampleQty: 1, samples: [{ sampleId: 'sample-1' }] }],
    rolls: [{ sampleId: 'sample-1', seq: 1, rollNo: 'S1', supplierLotNo: 'LOT', actualQtyAux: 1, measuredSampleThicknessMm: 0.05, isOk: sampleIsOk, inspectionItems: [
      { itemCode: 'thickness', itemName: '厚度', measuredValue: '0.05', isOk: true },
      { itemCode: 'width', itemName: '寬度', measuredValue: '150', isOk: true },
      { itemCode: 'length', itemName: '長度', measuredValue: '300', isOk: true },
      { itemCode: 'extra', itemName: '黏著力', measuredValue, isOk },
    ] }],
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="test" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('LOT');
  if (post) fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
}

const productionSpec = { inspectionType: 'Production', productionTotalQuantity: 1, productionGoodQuantity: 1, productionDefectQuantity: 0, productionQuantityUnit: 'PCS', semiFinishedInspectionSpec: { materialForm: 'S', standardThicknessMm: 0.05, standardWidthMm: 149, standardLength: 300, items: [{ itemCode: 'width', standardValue: 149, tolerance: 0.5 }] } };

it('缺少或無效規格時顯示無法判定容差', async () => {
  await renderInspection('10', true, false, true, { ...productionSpec, semiFinishedInspectionSpec: { ...productionSpec.semiFinishedInspectionSpec, items: [{ itemCode: 'width', standardValue: NaN, tolerance: 0.5 }] } });
  expect(await screen.findByText(/寬度.*無法判定容差/)).toBeTruthy();
});

it('超差判合格缺少允收理由時阻擋完成', async () => {
  await renderInspection('10', true, true, true, productionSpec);
  expect(await screen.findByText(/寬度.*超差允收理由/)).toBeTruthy();
  expect(api.complete).not.toHaveBeenCalled();
});

it('預設解鎖並保存重讀後，完成送出兩份一致的獨立允收理由', async () => {
  await renderInspection('10', true, false, true, productionSpec);
  api.complete.mockImplementation(() => new Promise(() => {}));
  api.post.mockImplementation(async ({ body }: any) => {
    const old = (await api.detail()).data.data;
    api.detail.mockResolvedValue({ data: { data: { ...old, rolls: body.rolls, groups: body.groups.map((g: any) => ({ ...g, id: 'g1' })) } } });
    return { data: {} };
  });
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.change(screen.getByLabelText('寬度超差允收理由'), { target: { value: '客戶同意' } });
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole('button', { name: /進行品質判定與過帳/ }));
  fireEvent.click(await screen.findByRole('button', { name: /確認過帳/ }));
  await waitFor(() => expect(api.complete).toHaveBeenCalled());
  const body = api.complete.mock.calls[0][0].body;
  for (const sample of [body.rolls[0], body.groups[0].samples[0]]) {
    const item = sample.inspectionItems.find((i: any) => i.itemCode === 'width');
    expect(item.toleranceOverrideReason).toBe('客戶同意');
    expect(item.judgmentChangeReason).toBeUndefined();
  }
});
