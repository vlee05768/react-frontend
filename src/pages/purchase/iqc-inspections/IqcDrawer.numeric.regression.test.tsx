import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IqcDrawer from './IqcDrawer';

const api = vi.hoisted(() => ({ detail: vi.fn(), post: vi.fn() }));
vi.mock('@/api/generated', () => ({ getApiV1IqcInspectionByIqcRecordId: api.detail, postApiV1IqcInspectionByIqcRecordIdEscalate: vi.fn(), postApiV1IqcInspectionByIqcRecordIdComplete: vi.fn(), getApiV1IqcInspectionByIqcRecordIdPdf: vi.fn() }));
vi.mock('@/api/generated/client.gen', () => ({ client: { post: api.post } }));
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: () => ({ user: null }) }));
vi.mock('@/hooks/useFileDownload', () => ({ useFileDownload: () => ({ downloadFile: vi.fn(), isDownloading: false }) }));
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => null }));
vi.mock('@/components/Form/AsyncSelect', () => ({ AsyncSelect: () => null }));
vi.mock('@/components/common/ActionBar', () => ({ ActionBar: ({ actions }: any) => <div>{actions}</div> }));
vi.mock('@/components/Table/ErpTable', () => ({ default: ({ dataSource, columns }: any) => <div>{dataSource.map((row: any, i: number) => <div key={row.id ?? row.rollNo}>{columns.map((col: any, j: number) => <div key={j}>{col.render ? col.render(row[col.dataIndex], row, i) : row[col.dataIndex]}</div>)}</div>)}</div> }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  api.detail.mockReset();
  api.post.mockReset();
  api.post.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderRoll(outer: number, isOk = true, completeItems = false) {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-TEST', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 1,
    standardThickness: 0.05, standardWidth: 150, standardLength: 20, measuredCoreDiaMm: 86,
    groups: [{ id: 'g1', supplierLotNo: 'LOT1', allocatedQty: 1, sampleQty: 1, measuredCoreDiaMm: 86, samples: [{ sampleId: 'sample-1' }] }],
    rolls: [{ sampleId: 'sample-1', seq: 1, rollNo: 'ROLL1', supplierLotNo: 'LOT1', actualQtyAux: 1, measuredThicknessMm: completeItems ? 0.05 : undefined, measuredCoreDiaMm: 86, measuredOuterDiaMm: outer, isOk, inspectionItems: completeItems ? [
      { itemCode: 'thickness', itemName: '厚度(mm)', measuredValue: '0.05', isOk: true },
      { itemCode: 'width', itemName: '寬度(mm)', measuredValue: '150', isOk: true },
      { itemCode: 'core_dia', itemName: '內管芯外徑(mm)', measuredValue: '86', isOk: true },
    ] : [] }],
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="test" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findByPlaceholderText('實測外徑');
}

it('keeps missing sample thickness null in both draft payload shapes', async () => {
  await renderRoll(93.1);
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  for (const sample of [body.rolls[0], body.groups[0].samples[0]]) {
    expect(sample.measuredThicknessMm).toBeNull();
    expect(sample.measuredSampleThicknessMm).toBeNull();
  }
});

it('keeps a sample in its original group after editing its own core diameter', async () => {
  await renderRoll(93.1, true, true);
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const core = screen.getAllByPlaceholderText('實測值').find(e => (e as HTMLInputElement).value === '86')!;
  fireEvent.change(core, { target: { value: '88' } });
  fireEvent.blur(core);
  await new Promise(resolve => setTimeout(resolve, 30));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.groups[0].sampleQty).toBe(1);
  expect(body.groups[0].samples).toHaveLength(1);
  expect(body.groups[0].samples[0]).toMatchObject({ sampleId: 'sample-1', measuredCoreDiaMm: 88, isOk: true });
});

it('keeps an out-of-range calculated roll length as reference only', async () => {
  await renderRoll(160.5, true, true);
  expect(screen.getByText('288.5 M')).toBeTruthy();
  expect(screen.getByRole('radio', { name: '合格' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  expect(await screen.findByRole('radio', { name: /AllPass/ })).not.toBeDisabled();
});

it('preserves manual judgment when the outer diameter changes and in the draft payload', async () => {
  await renderRoll(93.1);
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.change(screen.getByPlaceholderText('實測外徑'), { target: { value: '160.5' } });
  expect(screen.getByRole('radio', { name: '合格' })).toBeChecked();
  expect(screen.getByRole('radio', { name: '合格' })).not.toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  expect(api.post.mock.calls[0][0].body.rolls[0].isOk).toBe(true);
  expect(api.post.mock.calls[0][0].body.groups[0].samples[0].isOk).toBe(true);
});

it('blocks AllPass for a manually abnormal roll despite corrected measurement', async () => {
  await renderRoll(160.5);
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('radio', { name: '異常' }));
  fireEvent.change(screen.getByPlaceholderText('實測外徑'), { target: { value: '93.1' } });
  expect(screen.getByRole('radio', { name: '異常' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  expect(api.post.mock.calls[0][0].body.rolls[0].isOk).toBe(false);
});

it('blocks AllPass and offers concession for a manually abnormal roll', async () => {
  await renderRoll(93.1, false, true);
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  expect(await screen.findByRole('radio', { name: /AllPass/ })).toBeDisabled();
  expect(screen.getByRole('radio', { name: /Concession/ })).toBeChecked();
});


it('requires an individual reason and sends identity and revision in both draft shapes', async () => {
  await renderRoll(93.1, false);
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('radio', { name: '合格' }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('樣品改判原因'), { target: { value: '複驗合格' } });
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.expectedRevision).toBe(7);
  expect(body.rolls[0]).toMatchObject({ sampleId: 'sample-1', judgmentChangeReason: '複驗合格' });
  expect(body.groups[0].samples[0]).toMatchObject({ sampleId: 'sample-1', judgmentChangeReason: '複驗合格' });
});


it('corrects a persisted item but still blocks removal of existing samples after reload', async () => {
  const item = { inspectionItemId: 'item-1', itemCode: 'width', itemName: '寬度', measuredValue: '150', isOk: false };
  const original = {
    lotNo: 'IQC-TWO', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 2,
    standardThickness: 0.05, standardWidth: 150, standardLength: 20, measuredCoreDiaMm: 86,
    groups: [{ id: 'g1', supplierLotNo: 'LOT1', allocatedQty: 2, sampleQty: 2, measuredCoreDiaMm: 86, samples: [{ sampleId: 'sample-0' }, { sampleId: 'sample-1' }] }],
    rolls: [0, 1].map(i => ({ sampleId: `sample-${i}`, seq: i + 1, rollNo: `ROLL${i}`, supplierLotNo: 'LOT1', actualQtyAux: 1, measuredCoreDiaMm: 86, measuredOuterDiaMm: 93.1, isOk: true, inspectionItems: i === 0 ? [item] : [] })),
  };
  api.detail.mockResolvedValue({ data: { data: original } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="two" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByPlaceholderText('實測外徑');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const group = screen.getByRole('radiogroup', { name: '寬度細項判定' });
  const quantity = screen.getByLabelText('抽樣數 LOT1') as HTMLInputElement;
  fireEvent.change(quantity, { target: { value: '1' } });
  fireEvent.blur(quantity);
  expect(quantity.value).toBe('2');
  fireEvent.click(within(group).getByRole('radio', { name: '改判合格' }));
  fireEvent.change(quantity, { target: { value: '1' } });
  fireEvent.blur(quantity);
  expect(quantity.value).toBe('2');
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('寬度改判原因'), { target: { value: '複驗合格' } });
  api.post.mockImplementationOnce(async ({ body }: any) => {
    api.detail.mockResolvedValue({ data: { data: { ...original, revision: 8, rolls: body.rolls, groups: body.groups.map((g: any) => ({ ...g, id: 'g1' })) } } });
    return { data: {} };
  });
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  const body = api.post.mock.calls[0][0].body;
  expect(body.expectedRevision).toBe(7);
  for (const sample of [body.rolls[0], body.groups[0].samples[0]]) {
    expect(sample.sampleId).toBe('sample-0');
    expect(sample.inspectionItems).toContainEqual(expect.objectContaining({ inspectionItemId: 'item-1', isOk: true, judgmentChangeReason: '複驗合格' }));
  }
  await screen.findByRole('button', { name: /編輯/ });
  await waitFor(() => expect(api.detail.mock.calls.length).toBeGreaterThanOrEqual(2));
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const reloadedQuantity = screen.getByLabelText('抽樣數 LOT1') as HTMLInputElement;
  fireEvent.change(reloadedQuantity, { target: { value: '1' } });
  fireEvent.blur(reloadedQuantity);
  expect(reloadedQuantity.value).toBe('2');
  expect(api.post).toHaveBeenCalledTimes(1);
});


it('keeps unjudged items null and lets an inspector judge an individual item', async () => {
  await renderRoll(93.1);
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const group = screen.getByRole('radiogroup', { name: '寬度(mm)細項判定' });
  expect(within(group).getByText('未判定')).toBeTruthy();
  fireEvent.click(within(group).getByRole('radio', { name: '不合格' }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  for (const sample of [body.rolls[0], body.groups[0].samples[0]]) {
    expect(sample.inspectionItems.find((i: any) => i.itemCode === 'width').isOk).toBe(false);
    expect(sample.inspectionItems.find((i: any) => i.itemCode === 'thickness').isOk).toBeNull();
  }
});


it('initializes a blank IQC with a sample owned by its new group and protects NG on reduction', async () => {
  api.detail.mockResolvedValue({ data: { data: { lotNo: 'NEW', materialForm: 'R', revision: 1, inspectionStatus: 'Pending', inspectorId: 'EMP-1', rollCount: 2, standardThickness: 0.05, standardLength: 20, groups: [], rolls: [] } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="new" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findByPlaceholderText('實測外徑');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const count = screen.getByLabelText('抽樣數 未填批號') as HTMLInputElement;
  fireEvent.change(count, { target: { value: '2' } });
  fireEvent.blur(count);
  expect(screen.getAllByPlaceholderText('實測外徑')).toHaveLength(2);
  fireEvent.click(screen.getAllByRole('radio', { name: '異常' })[1]);
  fireEvent.change(count, { target: { value: '1' } });
  fireEvent.blur(count);
  expect(count.value).toBe('2');
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.groups[0].samples).toHaveLength(2);
  expect(body.rolls).toHaveLength(2);
  expect(body.groups[0].samples[1].isOk).toBe(false);
  expect(body.rolls[1].isOk).toBe(false);
});
