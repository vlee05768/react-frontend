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

async function renderInspection(measuredValue: string, isOk: boolean | null, post = true, sampleIsOk: boolean | null = true, overrides: any = {}) {
  api.complete.mockReset();
  api.detail.mockResolvedValue({ data: { data: {
    ...overrides, lotNo: 'IQC-TEST', materialForm: 'S', revision: 1, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 1,
    standardThickness: 0.05, standardWidth: 150, standardLength: 300,
    groups: [{ id: 'g1', supplierLotNo: 'LOT', allocatedQty: 1, sampleQty: 1, samples: [{ sampleId: 'sample-1' }] }],
    rolls: [{ sampleId: 'sample-1', seq: 1, rollNo: 'S1', supplierLotNo: 'LOT', actualQtyAux: 1, measuredThicknessMm: 0.05, isOk: sampleIsOk, inspectionItems: [
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

it('blocks posting when a required sample is unjudged even if its items passed', async () => {
  await renderInspection('10', true, true, null);
  expect(await screen.findByText(/第 1 包\/片.*樣品.*判定/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /確認過帳/ })).toBeNull();
  expect(api.complete).not.toHaveBeenCalled();
});

it('allows a manually passed sample to complete with matching judgment in both payloads', async () => {
  await renderInspection('10', true, false, null);
  api.complete.mockImplementation(() => new Promise(() => {}));
  api.post.mockImplementation(async ({ body }: any) => {
    const old = (await api.detail()).data.data;
    api.detail.mockResolvedValue({ data: { data: { ...old, rolls: body.rolls, groups: body.groups.map((g: any) => ({ ...g, id: 'g1' })) } } });
    return { data: {} };
  });
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('radio', { name: '合格' }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  fireEvent.click(await screen.findByRole('button', { name: /進行品質判定與過帳/ }, { timeout: 5000 }));
  fireEvent.click(await screen.findByRole('button', { name: /確認過帳/ }));
  await waitFor(() => expect(api.complete).toHaveBeenCalled());
  const { rolls, groups } = api.complete.mock.calls[0][0].body;
  expect(rolls[0].isOk).toBe(true);
  expect(groups[0].samples[0].isOk).toBe(true);
  expect(groups[0].samples[0].disposition).toBe(rolls[0].disposition);
  expect(groups[0].samples[0].actualQtyAux).toBe(rolls[0].actualQtyAux);
});

it('blocks completion when an inspected item is unjudged', async () => {
  await renderInspection('10', null);
  expect(await screen.findByText(/黏著力.*判定/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /確認過帳/ })).toBeNull();
  expect(api.complete).not.toHaveBeenCalled();
});

it('blocks completion for a blank measured value', async () => {
  await renderInspection('   ', true);
  expect(await screen.findByText(/黏著力.*實測值/)).toBeTruthy();
  expect(api.complete).not.toHaveBeenCalled();
});

it.each([true, false])('accepts explicit item judgment %s', async (judgment) => {
  await renderInspection('10', judgment);
  expect(await screen.findByRole('radio', { name: /AllPass/ })).toBeTruthy();
});

it('keeps unjudged sample draft representations consistent', async () => {
  await renderInspection('10', true, false, null);
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const { rolls, groups } = api.post.mock.calls[0][0].body;
  expect(rolls[0].isOk).toBeNull();
  expect(groups[0].samples[0].isOk).toBeNull();
  expect(groups[0].samples[0].disposition).toBe(rolls[0].disposition);
  expect(groups[0].samples[0].responsibleParty).toBe(rolls[0].responsibleParty);
});

it('allows saving an incomplete draft', async () => {
  await renderInspection('', null, false);
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  expect(api.post.mock.calls[0][0].body.rolls[0].inspectionItems).toContainEqual(expect.objectContaining({ itemCode: 'extra', measuredValue: '', isOk: null }));
});


it.each([['CR-1', 'Production'], ['PMR-1', 'Production'], ['PR-1', 'Incoming']])('saves and completes %s without changing source contract', async (sourceDocNumber, inspectionType) => {
  await renderInspection('10', true, false, true, { sourceDocNumber, inspectionType });
  api.complete.mockImplementation(() => new Promise(() => {}));
  api.post.mockImplementation(async ({ body }: any) => {
    const old = (await api.detail()).data.data;
    api.detail.mockResolvedValue({ data: { data: { ...old, rolls: body.rolls, groups: body.groups.map((g: any) => ({ ...g, id: 'g1' })) } } });
    return { data: {} };
  });
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const draft = api.post.mock.calls[0][0].body;
  if (inspectionType === 'Production') expect(draft).not.toHaveProperty('standardLength');
  else expect(draft.standardLength).toBe(300);
  fireEvent.click(await screen.findByRole('button', { name: /進行品質判定與過帳/ }, { timeout: 5000 }));
  fireEvent.click(await screen.findByRole('button', { name: /確認過帳/ }));
  await waitFor(() => expect(api.complete).toHaveBeenCalled());
  const completed = api.complete.mock.calls[0][0].body;
  if (inspectionType === 'Production') expect(completed).not.toHaveProperty('standardLength');
  else expect(completed.standardLength).toBe(300);
});
