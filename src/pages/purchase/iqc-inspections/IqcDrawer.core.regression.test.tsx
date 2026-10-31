import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IqcDrawer from './IqcDrawer';

const api = vi.hoisted(() => ({ detail: vi.fn(), post: vi.fn(), complete: vi.fn() }));
vi.mock('@/api/generated', () => ({ getApiV1IqcInspectionByIqcRecordId: api.detail, postApiV1IqcInspectionByIqcRecordIdEscalate: vi.fn(), postApiV1IqcInspectionByIqcRecordIdComplete: api.complete, getApiV1IqcInspectionByIqcRecordIdPdf: vi.fn() }));
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
  api.post.mockReset();
  api.post.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderGroups(completeItems = false, ambiguous = false) {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-CORE', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 2,
    standardThickness: 0.05, standardWidth: 150, standardLength: 20, measuredCoreDiaMm: 86,
    groups: [86, 90].map((core, i) => ({ id: `g${i}`, supplierLotNo: 'LOT', allocatedQty: 1, sampleQty: 1, measuredCoreDiaMm: core, samples: ambiguous ? [] : [{ sampleId: `s${i}` }] })),
    rolls: [86, 90].map((core, i) => ({ sampleId: `s${i}`, seq: i + 1, rollNo: `R${i}`, supplierLotNo: 'LOT', actualQtyAux: 1, measuredThicknessMm: completeItems ? 0.05 : undefined, measuredCoreDiaMm: core, measuredOuterDiaMm: 150 + i, isOk: true, inspectionItems: completeItems ? [
      { itemCode: 'thickness', itemName: '厚度(mm)', measuredValue: '0.05', isOk: true },
      { itemCode: 'width', itemName: '寬度(mm)', measuredValue: '150', isOk: true },
      { itemCode: 'core_dia', itemName: '內管芯外徑(mm)', measuredValue: String(core), isOk: true },
    ] : [] })),
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="core" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('LOT');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
}

it('rejects saving when same-lot groups have no reliable sample membership', async () => {
  await renderGroups(true, true);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  expect(await screen.findByText(/分組無法確認/)).toBeTruthy();
  expect(api.post).not.toHaveBeenCalled();
});

it('binds a newly requested roll sample to the group whose sample count was increased', async () => {
  await renderGroups(true);
  const counts = screen.getAllByRole('spinbutton', { name: '抽樣數 LOT' });
  fireEvent.change(counts[1], { target: { value: '2' } });
  fireEvent.blur(counts[1]);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.groups.map((g: any) => g.samples.map((s: any) => s.rollNo))).toEqual([['R0'], ['R1', 'IQC-CORE-R03']]);
});

it('does not assign an ambiguous existing roll when adding a sample to a known group', async () => {
  await renderGroups(true, true);
  const counts = screen.getAllByRole('spinbutton', { name: '抽樣數 LOT' });
  fireEvent.change(counts[1], { target: { value: '2' } });
  fireEvent.blur(counts[1]);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  expect(await screen.findByText(/分組無法確認/)).toBeTruthy();
  expect(api.post).not.toHaveBeenCalled();
});

it('creates the initial sample in the explicitly added roll group', async () => {
  await renderGroups(true);
  fireEvent.click(screen.getByRole('button', { name: /新增批號/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.groups.map((g: any) => g.samples.map((s: any) => s.rollNo))).toEqual([['R0'], ['R1'], ['IQC-CORE-R03']]);
});

it('preserves each sample measurement when a group core changes in a draft', async () => {
  await renderGroups(true);
  const input = screen.getAllByRole('spinbutton').find(e => Number((e as HTMLInputElement).value) === 86)!;
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '90' } });
  fireEvent.change(input, { target: { value: '88' } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.groups.map((g: any) => g.samples.map((s: any) => s.rollNo))).toEqual([['R0'], ['R1']]);
  expect(body.groups[0].samples[0]).toMatchObject({ measuredCoreDiaMm: 86, measuredOuterDiaMm: 150, isOk: true });
  expect(body.groups[0].samples[0].inspectionItems).toContainEqual(expect.objectContaining({ itemCode: 'core_dia', measuredValue: '86' }));
  expect(body.groups[1].samples[0]).toMatchObject({ measuredCoreDiaMm: 90, measuredOuterDiaMm: 151 });
  expect(body.groups[0].samples[0].coreDiameterInputConfirmed).toBeUndefined();
  expect(body.rolls[0].coreDiameterInputConfirmed).toBeUndefined();
  expect(body.groups[1].samples[0].coreDiameterInputConfirmed).toBeUndefined();
  expect(body.rolls[1].coreDiameterInputConfirmed).toBeUndefined();
});

it('prevents moving existing identified samples between groups', async () => {
  await renderGroups();
  const selector = screen.getAllByRole('combobox')[1] as HTMLInputElement;
  expect(selector.disabled).toBe(true);
  fireEvent.mouseDown(selector);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  expect(api.post.mock.calls[0][0].body.groups.map((g: any) => g.samples.map((s: any) => s.rollNo))).toEqual([['R0'], ['R1']]);
});

it('submits the saved core and measured samples after draft reload', async () => {
  api.complete.mockReset();
  api.complete.mockImplementation(() => new Promise(() => {}));
  await renderGroups(true);
  api.post.mockImplementation(async ({ body }: any) => {
    const old = (await api.detail()).data.data;
    api.detail.mockResolvedValue({ data: { data: { ...old, groups: body.groups.map((g: any, i: number) => ({ ...g, id: `g${i}` })), rolls: body.rolls } } });
    return { data: {} };
  });
  const input = screen.getAllByRole('spinbutton').find(e => Number((e as HTMLInputElement).value) === 86)!;
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '88' } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  fireEvent.click(await screen.findByRole('button', { name: /進行品質判定與過帳/ }, { timeout: 5000 }));
  fireEvent.click(await screen.findByRole('button', { name: /確認過帳/ }));
  await waitFor(() => expect(api.complete).toHaveBeenCalled());
  const body = api.complete.mock.calls[0][0].body;
  expect(body.groups.map((g: any) => g.samples.map((s: any) => s.rollNo))).toEqual([['R0'], ['R1']]);
  expect(body.groups[0].samples[0]).toMatchObject({ measuredCoreDiaMm: 86, measuredOuterDiaMm: 150, isOk: true });
  expect(body.groups[0].samples[0].inspectionItems).toContainEqual(expect.objectContaining({ itemCode: 'core_dia', measuredValue: '86' }));
  expect(body.groups[0].samples[0].coreDiameterInputConfirmed).toBeUndefined();
  expect(body.rolls[0].coreDiameterInputConfirmed).toBeUndefined();
});


it('preserves missing core measurements in draft groups and samples', async () => {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-NULL', materialForm: 'R', revision: 1, inspectionStatus: 'Pending', inspectorId: 'EMP-1', rollCount: 1,
    standardThickness: 0.05, standardLength: 20, measuredCoreDiaMm: null,
    groups: [{ id: 'g-null', supplierLotNo: 'LOT', allocatedQty: 1, sampleQty: 1, measuredCoreDiaMm: null, samples: [{ sampleId: 'null-sample' }] }],
    rolls: [{ sampleId: 'null-sample', rollNo: 'R-NULL', supplierLotNo: 'LOT', measuredCoreDiaMm: null, measuredOuterDiaMm: 150, inspectionItems: [] }],
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="null" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('LOT');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.measuredCoreDiaMm).toBeNull();
  expect(body.groups[0].measuredCoreDiaMm).toBeNull();
  expect(body.groups[0].samples[0].measuredCoreDiaMm).toBeNull();
  expect(body.groups[0].samples[0].measuredLengthMm).toBeNull();
});


it('clearing a group core preserves its sample measurement', async () => {
  await renderGroups(true);
  const input = screen.getAllByRole('spinbutton').find(e => Number((e as HTMLInputElement).value) === 86)!;
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const group = api.post.mock.calls[0][0].body.groups[0];
  expect(group.measuredCoreDiaMm).toBeNull();
  expect(group.samples[0]).toMatchObject({ measuredCoreDiaMm: 86 });
  expect(group.samples[0].inspectionItems).toContainEqual(expect.objectContaining({ itemCode: 'core_dia', measuredValue: '86' }));
});


it('does not claim input for legacy values merely rendered or saved', async () => {
  await renderGroups(true);
  expect(screen.getAllByText('來源不明')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  for (const sample of [...body.rolls, ...body.groups.flatMap((g: any) => g.samples)]) {
    expect(sample.coreDiameterInputConfirmed).toBeUndefined();
  }
});

it('tracks direct sample input and clears evidence on clearing the value', async () => {
  await renderGroups(true);
  const input = document.getElementById('iqc_input_R0_core_dia') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '87' } });
  fireEvent.blur(input);
  await waitFor(() => expect(screen.getAllByText('來源不明')).toHaveLength(1));
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  await waitFor(() => expect(input.value).toBe(''));
  await new Promise(resolve => setTimeout(resolve, 20));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const sample = api.post.mock.calls[0][0].body.rolls[0];
  expect(sample.measuredCoreDiaMm).toBeNull();
  expect(sample.coreDiameterInputConfirmed).toBeUndefined();
});


it('marks only the sample directly edited by the user', async () => {
  await renderGroups(true);
  const input = document.getElementById('iqc_input_R0_core_dia') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '87' } });
  fireEvent.blur(input);
  await waitFor(() => expect(screen.getAllByText('來源不明')).toHaveLength(1));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.rolls[0].coreDiameterInputConfirmed).toBe(true);
  expect(body.rolls[1].coreDiameterInputConfirmed).toBeUndefined();
});

it('prevents moving a sample after direct measurement', async () => {
  await renderGroups(true);
  const input = document.getElementById('iqc_input_R0_core_dia') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '87' } });
  fireEvent.blur(input);
  await waitFor(() => expect(screen.getAllByText('來源不明')).toHaveLength(1));
  expect((screen.getAllByRole('combobox')[1] as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  expect(api.post.mock.calls[0][0].body.groups[0].samples[0]).toMatchObject({ measuredCoreDiaMm: 87, coreDiameterInputConfirmed: true, isOk: true });
});


it('allows an untouched newly created sample to choose a group, but locks it after measurement', async () => {
  await renderGroups(true);
  const count = screen.getAllByRole('spinbutton', { name: '抽樣數 LOT' })[0];
  fireEvent.change(count, { target: { value: '2' } });
  fireEvent.blur(count);
  const selector = screen.getAllByRole('combobox')[5] as HTMLInputElement;
  expect(selector.disabled).toBe(false);
  fireEvent.mouseDown(selector);
  fireEvent.click((await screen.findAllByText(/LOT.*90/)).at(-1)!);
  expect((screen.getAllByRole('combobox')[5] as HTMLInputElement).disabled).toBe(false);
  const input = document.getElementById('iqc_input_IQC-CORE-R03_core_dia') as HTMLInputElement;
  fireEvent.change(input, { target: { value: '88' } });
  fireEvent.blur(input);
  await waitFor(() => expect((screen.getAllByRole('combobox')[5] as HTMLInputElement).disabled).toBe(true));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.groups.map((g: any) => g.samples.map((s: any) => s.rollNo))).toEqual([['R0'], ['R1', 'IQC-CORE-R03']]);
});
