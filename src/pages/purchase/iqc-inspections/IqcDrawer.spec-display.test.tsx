import { cleanup, render, screen } from '@testing-library/react';
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
vi.mock('@/components/Table/ErpTable', () => ({ default: ({ dataSource, columns }: any) => <div>{columns.map((col: any, j: number) => <div key={j}>{col.title}</div>)}{dataSource.map((row: any, i: number) => <div key={row.id ?? row.rollNo}>{columns.map((col: any, j: number) => <div key={j}>{col.render ? col.render(row[col.dataIndex], row, i) : row[col.dataIndex]}</div>)}</div>)}</div> }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  api.detail.mockReset();
  api.post.mockReset();
  api.post.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderRoll(outer: number | null, isOk = true, completeItems = false, overrides: any = {}) {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-TEST', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 1,
    standardThickness: 0.05, standardWidth: 150, standardLength: 20, measuredCoreDiaMm: 86,
    groups: [{ id: 'g1', supplierLotNo: 'LOT1', allocatedQty: 1, sampleQty: 1, measuredCoreDiaMm: 86 }],
    rolls: [{ sampleId: 'sample-1', seq: 1, rollNo: 'ROLL1', supplierLotNo: 'LOT1', actualQtyAux: 1, measuredSampleThicknessMm: completeItems ? 0.05 : undefined, measuredCoreDiaMm: 86, measuredOuterDiaMm: outer, isOk, inspectionItems: completeItems ? [
      { itemCode: 'thickness', itemName: '厚度(mm)', measuredValue: '0.05', isOk: true },
      { itemCode: 'width', itemName: '寬度(mm)', measuredValue: '150', isOk: true },
      { itemCode: 'core_dia', itemName: '內管芯外徑(mm)', measuredValue: '86', isOk: true },
    ] : [] }],
    ...overrides,
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="test" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findByText(overrides.materialForm === 'S' ? /實測長度\(mm\)/ : /實測長度\(M\)/);
}

it('does not display a tolerance when thickness is not specified', async () => {
  await renderRoll(null, true, false, { standardThickness: null });
  expect(screen.getByText('實測厚度(mm) (未設定)')).toBeTruthy();
});

it.each([0, -1, NaN, Infinity])('treats unusable thickness %s as unspecified', async (standardThickness) => {
  await renderRoll(null, true, false, { standardThickness });
  expect(screen.getByText('實測厚度(mm) (未設定)')).toBeTruthy();
});

it('preserves the existing display for an actual thickness specification', async () => {
  await renderRoll(null, true, false, { standardThickness: 0.05 });
  expect(screen.getByText('實測厚度(mm) (0.05±0.002)')).toBeTruthy();
});

it('does not present measured core diameter as a specification or invent a tolerance', async () => {
  await renderRoll(null);
  expect(screen.getByText('內管芯外徑(mm) (未設定規格)')).toBeTruthy();
});

it('shows missing specifications and unavailable measurement without inventing values', async () => {
  await renderRoll(null, true, false, { standardWidth: null, standardLength: null });
  expect(screen.getByText('實測寬度(mm) (未設定)')).toBeTruthy();
  expect(screen.getByText('實測長度(M) (未設定)')).toBeTruthy();
  expect(screen.getByText('無法計算')).toBeTruthy();
  expect(screen.queryByText('0 M')).toBeNull();
});

it('shows calculated measurement without deviation when specification is absent', async () => {
  await renderRoll(160.5, true, true, { standardWidth: null, standardLength: null });
  expect(screen.getByText('288.5 M')).toBeTruthy();
  expect(screen.queryByText(/%\)/)).toBeNull();
});

it('shows actual specifications and deviation when both values are available', async () => {
  await renderRoll(160.5, true, true, { standardWidth: 175, standardLength: 300 });
  expect(screen.getByText('實測寬度(mm) (175±0.5)')).toBeTruthy();
  expect(screen.getByText('實測長度(M) (300±5)')).toBeTruthy();
  expect(screen.getByText('288.5 M')).toBeTruthy();
  expect(screen.getByText('(-3.8%)')).toBeTruthy();
});

it('shows no invented sheet length specification', async () => {
  await renderRoll(null, true, false, { materialForm: 'S', standardLength: null });
  expect(screen.getByText('實測長度(mm) (未設定)')).toBeTruthy();
});


it('uses the saved production specification snapshot instead of measured fields', async () => {
  await renderRoll(null, true, false, { inspectionType: 'Production', semiFinishedInspectionSpec: { materialForm: 'R', standardThicknessMm: 0.08, standardWidthMm: 250, standardLength: 500, items: [] } });
  expect(screen.getByText('實測厚度(mm) (0.08±0.002)')).toBeTruthy();
  expect(screen.getByText('實測寬度(mm) (250±0.5)')).toBeTruthy();
  expect(screen.getByText('實測長度(M) (500±5)')).toBeTruthy();
});

it.each(['CR-1', 'PMR-1'])('does not display untrusted production measurements as specifications for %s', async (sourceDocNumber) => {
  await renderRoll(160.5, true, true, { inspectionType: 'Production', sourceDocNumber, standardThickness: 0.05, standardWidth: 175, standardLength: 300 });
  expect(screen.getByText('實測厚度(mm) (未設定)')).toBeTruthy();
  expect(screen.getByText('實測寬度(mm) (未設定)')).toBeTruthy();
  expect(screen.getByText('實測長度(M) (未設定)')).toBeTruthy();
  expect(screen.queryByText(/%\)/)).toBeNull();
});
