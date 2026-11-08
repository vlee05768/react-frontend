import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  api.post.mockReset();
  api.post.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('preserves measured sample when renaming POC lot during draft save', async () => {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-TEST', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', rollCount: 1,
    standardThickness: 0.05, standardWidth: 150, standardLength: 300, measuredCoreDiaMm: 86,
    groups: [{ id: 'group-1', supplierLotNo: 'POC-OLD-0002', allocatedQty: 1, sampleQty: 1, measuredCoreDiaMm: 86, samples: [{ sampleId: 'sample-1' }] }],
    rolls: [{ sampleId: 'sample-1', seq: 1, rollNo: 'IQC-TEST-R01', supplierLotNo: 'POC-OLD-0002', measuredCoreDiaMm: 86, measuredOuterDiaMm: 250, isOk: true, inspectionItems: [] }],
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="test" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('POC-OLD-0002');
  fireEvent.click(await screen.findByRole('button', { name: /編輯/ }));
  const lot = await screen.findByPlaceholderText('請輸入或掃描原廠生產批號');
  fireEvent.focus(lot);
  fireEvent.change(lot, { target: { value: 'POC-OLD-REPRO' } });
  fireEvent.blur(lot);
  fireEvent.change(screen.getByPlaceholderText('實測外徑'), { target: { value: '105.9' } });
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.rolls[0]).toMatchObject({ supplierLotNo: 'POC-OLD-REPRO', measuredOuterDiaMm: 105.9 });
  expect(body.groups[0].samples).toEqual([expect.objectContaining({ supplierLotNo: 'POC-OLD-REPRO', measuredOuterDiaMm: 105.9 })]);
});


it('keeps other groups intact through an intermediate matching lot and blank-to-new edit', async () => {
  const lots = ['', 'B', ''];
  const cores = [86, 86, 90];
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-MULTI', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', rollCount: 3,
    standardThickness: 0.05, standardWidth: 150, standardLength: 300, measuredCoreDiaMm: 86,
    groups: lots.map((supplierLotNo, i) => ({ id: `g${i}`, supplierLotNo, allocatedQty: 1, sampleQty: 1, measuredCoreDiaMm: cores[i], samples: [{ sampleId: `s${i}` }] })),
    rolls: lots.map((supplierLotNo, i) => ({ sampleId: `s${i}`, seq: i + 1, rollNo: `R${i}`, supplierLotNo, measuredCoreDiaMm: cores[i], measuredOuterDiaMm: 150 + i, isOk: true, inspectionItems: [] })),
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="multi" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('B');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const lot = (await screen.findAllByPlaceholderText('請輸入或掃描原廠生產批號'))[0];
  fireEvent.focus(lot);
  fireEvent.change(lot, { target: { value: 'B' } });
  fireEvent.change(lot, { target: { value: 'B-NEW' } });
  fireEvent.blur(lot);
  fireEvent.change(screen.getAllByPlaceholderText('實測外徑')[0], { target: { value: '105.9' } });
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.rolls.map((r: any) => [r.rollNo, r.supplierLotNo])).toEqual([['R0', 'B-NEW'], ['R1', 'B'], ['R2', '']]);
  expect(body.groups.map((g: any) => g.samples.map((s: any) => s.rollNo))).toEqual([['R0'], ['R1'], ['R2']]);
  expect(body.groups[0].samples[0].measuredOuterDiaMm).toBe(105.9);
  expect(body.groups[1].samples[0].measuredOuterDiaMm).toBe(151);
  expect(body.groups[2].samples[0].measuredOuterDiaMm).toBe(152);
});


it('preserves sheet NG and measurements when a lot is renamed through another group', async () => {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-SHEET', materialForm: 'S', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', rollCount: 2,
    standardThickness: 0.05, standardWidth: 150, standardLength: 300,
    groups: ['A', 'B'].map((supplierLotNo, i) => ({ id: `s${i}`, supplierLotNo, allocatedQty: 1, sampleQty: 1, samples: [{ sampleId: `sample-${i}` }] })),
    rolls: ['A', 'B'].map((supplierLotNo, i) => ({ sampleId: `sample-${i}`, seq: i + 1, rollNo: `S${i}`, supplierLotNo, isOk: i !== 0, measuredSampleThicknessMm: 0.05, inspectionItems: [{ itemCode: 'appearance', itemName: '外觀', measuredValue: i ? 'Pass' : 'NG', isOk: i !== 0 }] })),
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="sheet" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('A');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const lot = (await screen.findAllByPlaceholderText('請輸入或掃描原廠生產批號'))[0];
  fireEvent.focus(lot);
  fireEvent.change(lot, { target: { value: 'B' } });
  fireEvent.change(lot, { target: { value: 'C' } });
  fireEvent.blur(lot);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.groups[0].samples[0]).toMatchObject({ supplierLotNo: 'C', isOk: false });
  expect(body.groups[0].samples[0].inspectionItems).toContainEqual(expect.objectContaining({ itemCode: 'appearance', measuredValue: 'NG', isOk: false }));
  expect(body.groups[1].samples[0]).toMatchObject({ supplierLotNo: 'B', isOk: true });
  expect(body.groups[1].samples[0].inspectionItems).toContainEqual(expect.objectContaining({ itemCode: 'appearance', measuredValue: 'Pass', isOk: true }));
});


it('keeps explicitly linked sheet samples and NG with same-lot groups in reversed sample order', async () => {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'SHEET-ID', materialForm: 'S', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', rollCount: 2,
    standardThickness: 0.05, standardWidth: 150, standardLength: 300,
    groups: ['a', 'b'].map(id => ({ id, supplierLotNo: 'LOT', allocatedQty: 1, sampleQty: 1, samples: [{ sampleId: id }] })),
    rolls: ['b', 'a'].map((id, i) => ({ sampleId: id, seq: i + 1, rollNo: `S-${id}`, supplierLotNo: 'LOT', isOk: id !== 'a', inspectionItems: [{ itemCode: 'appearance', itemName: '外觀', measuredValue: id === 'a' ? 'NG' : 'Pass', isOk: id !== 'a' }] })),
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="sheet-id" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('LOT');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const lot = (await screen.findAllByPlaceholderText('請輸入或掃描原廠生產批號'))[1];
  fireEvent.focus(lot);
  fireEvent.change(lot, { target: { value: 'LOT-B' } });
  fireEvent.blur(lot);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.groups.map((g: any) => g.samples.map((s: any) => [s.sampleId, s.rollNo, s.isOk]))).toEqual([[['a', 'S-a', false]], [['b', 'S-b', true]]]);
  expect(body.groups[0].samples[0].inspectionItems).toContainEqual(expect.objectContaining({ measuredValue: 'NG', isOk: false }));
});


it.each([false, true])('撤回既有組新增的空白樣品（批號變更：%s）', async (rename) => {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'RETRACT', materialForm: 'R', revision: 1, inspectionStatus: 'Pending', inspectorId: 'EMP-1', rollCount: 2,
    standardThickness: 0.05, standardWidth: 150, standardLength: 300,
    groups: [{ id: 'g', supplierLotNo: 'OLD', allocatedQty: 2, sampleQty: 1, measuredCoreDiaMm: 86, samples: [{ sampleId: 'persisted' }] }],
    rolls: [{ sampleId: 'persisted', seq: 1, rollNo: 'R1', supplierLotNo: 'OLD', measuredOuterDiaMm: 150, isOk: true, inspectionItems: [] }],
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="retract" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('OLD');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.change(screen.getByRole('spinbutton', { name: '抽樣數 OLD' }), { target: { value: '2' } });
  expect(document.getElementById('iqc_input_RETRACT-R02_core_dia')).toBeTruthy();
  if (rename) {
    const lot = screen.getByPlaceholderText('請輸入或掃描原廠生產批號');
    fireEvent.focus(lot); fireEvent.change(lot, { target: { value: 'NEW' } }); fireEvent.blur(lot);
  }
  fireEvent.change(screen.getByRole('spinbutton', { name: `抽樣數 ${rename ? 'NEW' : 'OLD'}` }), { target: { value: '1' } });
  expect(document.getElementById('iqc_input_RETRACT-R02_core_dia')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  expect(api.post.mock.calls[0][0].body.rolls).toEqual([expect.objectContaining({ sampleId: 'persisted', measuredOuterDiaMm: 150, isOk: true })]);
});


it('批號更新不會將已量測的新樣品重設為可撤回', async () => {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'KEEP', materialForm: 'R', revision: 1, inspectionStatus: 'Pending', inspectorId: 'EMP-1', rollCount: 2,
    standardThickness: 0.05, standardWidth: 150, standardLength: 300,
    groups: [{ id: 'g', supplierLotNo: 'OLD', allocatedQty: 2, sampleQty: 1, measuredCoreDiaMm: 86, samples: [{ sampleId: 'persisted' }] }],
    rolls: [{ sampleId: 'persisted', seq: 1, rollNo: 'R1', supplierLotNo: 'OLD', measuredOuterDiaMm: 150, isOk: true, inspectionItems: [] }],
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="keep" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('OLD');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.change(screen.getByLabelText('抽樣數 OLD'), { target: { value: '2' } });
  const measured = document.getElementById('iqc_input_KEEP-R02_core_dia') as HTMLInputElement;
  fireEvent.change(measured, { target: { value: '88' } }); fireEvent.blur(measured);
  const lot = screen.getByPlaceholderText('請輸入或掃描原廠生產批號');
  fireEvent.focus(lot); fireEvent.change(lot, { target: { value: 'NEW' } }); fireEvent.blur(lot);
  fireEvent.change(screen.getByLabelText('抽樣數 NEW'), { target: { value: '1' } });
  expect(document.getElementById('iqc_input_KEEP-R02_core_dia')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  expect(api.post.mock.calls[0][0].body.rolls).toContainEqual(expect.objectContaining({ rollNo: 'KEEP-R02', supplierLotNo: 'NEW', measuredCoreDiaMm: 88 }));
});
