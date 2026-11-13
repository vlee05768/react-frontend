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

const api = vi.hoisted(() => ({ detail: vi.fn(), draft: vi.fn(), complete: vi.fn() }));
vi.mock('@/api/generated', () => ({ getApiV1IqcInspectionByIqcRecordId: api.detail, postApiV1IqcInspectionByIqcRecordIdEscalate: vi.fn(), postApiV1IqcInspectionByIqcRecordIdComplete: api.complete, getApiV1IqcInspectionByIqcRecordIdPdf: vi.fn() }));
vi.mock('@/api/generated/client.gen', () => ({ client: { post: api.draft } }));
const auth = vi.hoisted(() => ({ user: { permissions: ['Purchase.IqcInspections.View'] } }));
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: () => ({ user: auth.user, hasPermission: (code: string) => auth.user.permissions.includes(code) }) }));
vi.mock('@/hooks/useFileDownload', () => ({ useFileDownload: () => ({ downloadFile: vi.fn(), isDownloading: false }) }));
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => null }));
vi.mock('@/components/Form/AsyncSelect', () => ({ AsyncSelect: () => null }));
vi.mock('@/components/common/ActionBar', () => ({ ActionBar: ({ actions }: any) => <div>{actions}</div> }));
// 僅隔離表格版面，保留 Drawer、表單控制項及送出流程。
vi.mock('@/components/Table/ErpTable', () => ({ default: ({ dataSource, columns }: any) => <div>{dataSource.map((row: any, i: number) => <div key={row.id ?? row.rollNo}>{columns.map((col: any, j: number) => <div key={j}>{col.render ? col.render(row[col.dataIndex], row, i) : row[col.dataIndex]}</div>)}</div>)}</div> }));

beforeEach(() => {
  auth.user.permissions = ['Purchase.IqcInspections.View'];
  vi.mocked(isProductionPostingPaused).mockReset().mockReturnValue(false);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  api.draft.mockReset().mockImplementation(() => new Promise(() => {}));
  api.complete.mockReset().mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openSheet({ sameLotGroups = false, multipleSamples = false, unlinked = false, initialLot = '' } = {}) {
  // 本檔驗證已開放政策下的完整送出路徑。
  const detail = {
    lotNo: 'IQC-SHEET-QTY', inspectionType: 'Production', productionTotalQuantity: 10, productionGoodQuantity: 10, productionDefectQuantity: 0, productionQuantityUnit: 'PCS', sourceDocNumber: 'CR-TEST',
    materialForm: 'S', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 10,
    standardCoreDiaMm: 76.2, standardThickness: 0.05, standardWidth: 150, standardLength: 300,
    groups: [{ id: 'group-a', supplierLotNo: initialLot, allocatedQty: 10, sampleQty: 1, samples: [{ sampleId: 'sample-a' }] }],
    rolls: [{ sampleId: 'sample-a', seq: 1, rollNo: 'SOURCE-A', supplierLotNo: initialLot, actualQtyAux: 10, appearance: 'Pass', measuredSampleThicknessMm: 0.05, isOk: true, inspectionItems: [
      { itemCode: 'thickness', itemName: '厚度', measuredValue: '0.05', isOk: true },
      { itemCode: 'width', itemName: '寬度', measuredValue: '150', isOk: true },
      { itemCode: 'length', itemName: '長度', measuredValue: '300', isOk: true },
    ] }],
  };
  if (sameLotGroups) {
    detail.rollCount = 30;
    detail.productionTotalQuantity = 30;
    detail.productionGoodQuantity = 30;
    detail.groups = [
      { id: 'group-a', supplierLotNo: 'SAME', allocatedQty: 10, sampleQty: 1, samples: [{ sampleId: 'sample-a' }] },
      { id: 'group-b', supplierLotNo: 'SAME', allocatedQty: 20, sampleQty: 1, samples: [{ sampleId: 'sample-b' }] },
    ];
    const sample = detail.rolls[0];
    // 樣品順序刻意與群組順序相反，數量只能依可信身分取得。
    detail.rolls = [
      { ...sample, sampleId: 'sample-b', seq: 1, rollNo: 'SOURCE-B', supplierLotNo: 'SAME', actualQtyAux: 20 },
      { ...sample, seq: 2, supplierLotNo: 'SAME' },
    ];
  }
  if (multipleSamples) {
    detail.groups[0].sampleQty = 2;
    detail.groups[0].samples.push({ sampleId: 'sample-a2' });
    detail.rolls.push({ ...detail.rolls[0], sampleId: 'sample-a2', seq: 2, rollNo: 'SOURCE-A2' });
  }
  if (unlinked) detail.groups[0].samples = [];
  api.detail.mockResolvedValue({ data: { data: detail } });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><App><IqcDrawer iqcRecordId="sheet-quantity" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await waitFor(() => expect(document.getElementById('iqc_input_SOURCE-A_width')).toHaveValue('150'));
}

async function submit(action: string) {
  if (action === '草稿') {
    fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
    fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  } else {
    fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
    fireEvent.click(await screen.findByRole('button', { name: /確認過帳/ }));
  }
  const endpoint = action === '草稿' ? api.draft : api.complete;
  await waitFor(() => expect(endpoint).toHaveBeenCalledTimes(1));
  return endpoint.mock.calls[0][0].body;
}

it.each(['草稿', '完成'])('片料空批號%s保留可信群組的十片總量', async (action) => {
  await openSheet();
  const { rolls, groups } = await submit(action);
  expect(rolls).toEqual([expect.objectContaining({ sampleId: 'sample-a', supplierLotNo: '', actualQtyAux: 10 })]);
  expect(groups[0]).toMatchObject({ allocatedQty: 10, samples: [expect.objectContaining({ sampleId: 'sample-a', actualQtyAux: 10 })] });
});

it.each(['草稿', '完成'])('片料%s同批號不同可信組在樣品反序時各保留十片及二十片', async (action) => {
  await openSheet({ sameLotGroups: true });
  const { rolls, groups } = await submit(action);
  expect(rolls.map((sample: any) => [sample.sampleId, sample.actualQtyAux])).toEqual([['sample-b', 20], ['sample-a', 10]]);
  expect(groups.map((group: any) => [group.allocatedQty, group.samples.map((sample: any) => [sample.sampleId, sample.actualQtyAux])])).toEqual([
    [10, [['sample-a', 10]]], [20, [['sample-b', 20]]],
  ]);
});

it.each(['草稿', '完成'])('片料%s同一可信組的兩個樣品只承接一次十片總量', async (action) => {
  await openSheet({ multipleSamples: true });
  const { rolls, groups } = await submit(action);
  expect(rolls.map((sample: any) => [sample.sampleId, sample.actualQtyAux])).toEqual([['sample-a', 10], ['sample-a2', 0]]);
  expect(groups[0].allocatedQty).toBe(10);
  expect(groups[0].samples.map((sample: any) => [sample.sampleId, sample.actualQtyAux])).toEqual([['sample-a', 10], ['sample-a2', 0]]);
});

it.each(['NEW', ''])('片料批號改為「%s」後草稿及完成皆保留十片與樣品身分', async (newLot) => {
  await openSheet({ initialLot: 'OLD' });
  // 僅模擬草稿成功後 GET 回讀，不代表真實後端持久化驗收。
  api.draft.mockImplementation(async ({ body }: any) => {
    const original = (await api.detail()).data.data;
    api.detail.mockResolvedValue({ data: { data: { ...original, revision: 8, rolls: body.rolls, groups: [{ ...body.groups[0], id: 'group-a' }] } } });
    return { data: { success: true, data: true } };
  });
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const lotInput = screen.getByPlaceholderText('請輸入或掃描原廠生產批號');
  fireEvent.focus(lotInput);
  fireEvent.change(lotInput, { target: { value: newLot } });
  fireEvent.blur(lotInput);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.draft).toHaveBeenCalledTimes(1));
  const draft = api.draft.mock.calls[0][0].body;
  expect(draft.rolls).toEqual([expect.objectContaining({ sampleId: 'sample-a', supplierLotNo: newLot, actualQtyAux: 10 })]);
  expect(draft.groups[0]).toMatchObject({ supplierLotNo: newLot, allocatedQty: 10, samples: [expect.objectContaining({ sampleId: 'sample-a', actualQtyAux: 10 })] });
  await screen.findByRole('button', { name: /進行品質判定與過帳/ });
  const completed = await submit('完成');
  expect(completed.expectedRevision).toBe(8);
  expect(completed.rolls).toEqual([expect.objectContaining({ sampleId: 'sample-a', supplierLotNo: newLot, actualQtyAux: 10 })]);
  expect(completed.groups[0]).toMatchObject({ supplierLotNo: newLot, allocatedQty: 10, samples: [expect.objectContaining({ sampleId: 'sample-a', actualQtyAux: 10 })] });
});

it.each(['草稿', '完成'])('Production 首次無可信群組關聯時%s仍拒絕，不依相同批號或位置猜配對', async (action) => {
  await openSheet({ unlinked: true, initialLot: 'SAME' });
  if (action === '草稿') {
    fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
    fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  } else {
    fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
    fireEvent.click(await screen.findByRole('button', { name: /確認過帳/ }));
  }
  expect(await screen.findByText(/樣品 SOURCE-A 分組無法確認/)).toBeTruthy();
  expect(api.draft).not.toHaveBeenCalled();
  expect(api.complete).not.toHaveBeenCalled();
});
