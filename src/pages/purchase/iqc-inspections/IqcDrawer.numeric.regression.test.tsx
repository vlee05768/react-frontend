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
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  api.post.mockReset().mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderRoll(outer = 93.1, sampleIsOk: boolean | null = true, defectReason: string | null = null) {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-TEST', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 1,
    standardCoreDiaMm: 76.2, standardThickness: 0.05, standardWidth: 150, standardLength: 20,
    groups: [{ id: 'g1', supplierLotNo: 'LOT1', allocatedQty: 1, sampleQty: 1, samples: [{ sampleId: 'sample-1' }] }],
    rolls: [{ sampleId: 'sample-1', seq: 1, rollNo: 'ROLL1', supplierLotNo: 'LOT1', actualQtyAux: 1, measuredSampleThicknessMm: null, measuredCoreDiaMm: 86, measuredOuterDiaMm: outer, appearance: 'Pass', isOk: sampleIsOk, defectReason, inspectionItems: [
      { itemCode: 'thickness', itemName: '厚度(mm)', measuredValue: '', isOk: null },
      { itemCode: 'width', itemName: '寬度(mm)', measuredValue: '150', isOk: false },
      { itemCode: 'core_dia', itemName: '內管芯外徑(mm)', measuredValue: '86', isOk: true },
      { itemCode: 'appearance', itemName: '表面外觀', measuredValue: 'Pass', isOk: true },
    ] }],
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="test" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findByPlaceholderText('實測外徑');
}

it('parallel draft payloads carry an explicit null sample thickness and no legacy field', async () => {
  await renderRoll();
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  for (const sample of [body.rolls[0], body.groups[0].samples[0]]) {
    expect(sample.measuredSampleThicknessMm).toBeNull();
    expect(sample).not.toHaveProperty('measuredThicknessMm');
  }
});

it('editing a sample core keeps it in the same lot and preserves sample-level judgment', async () => {
  await renderRoll();
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  const core = document.getElementById('iqc_input_ROLL1_core_dia') as HTMLInputElement;
  fireEvent.change(core, { target: { value: '88' } });
  fireEvent.blur(core);
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  expect(api.post.mock.calls[0][0].body.groups[0].samples[0]).toMatchObject({ sampleId: 'sample-1', supplierLotNo: 'LOT1', measuredCoreDiaMm: 88, isOk: true });
});

it('does not derive the sample judgment from an out-of-range calculated length or item judgment', async () => {
  await renderRoll(160.5, true);
  expect(screen.getByText('288.5 M')).toBeTruthy();
  expect(screen.getByRole('radio', { name: '合格' })).toBeChecked();
});

it('saves one trimmed abnormal reason in both parallel draft shapes', async () => {
  await renderRoll(93.1, false, '  外徑異常  ');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const { rolls, groups } = api.post.mock.calls[0][0].body;
  expect(rolls[0]).toMatchObject({ isOk: false, defectReason: '外徑異常', appearance: 'Pass' });
  expect(groups[0].samples[0]).toMatchObject({ isOk: false, defectReason: '外徑異常', appearance: 'Pass' });
});

it('removes deprecated per-item judgment and override controls', async () => {
  await renderRoll();
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  expect(screen.queryByRole('radiogroup', { name: /細項判定/ })).toBeNull();
  expect(screen.queryByLabelText(/超差允收理由/)).toBeNull();
  expect(screen.queryByLabelText(/改判原因/)).toBeNull();
  expect(screen.getByRole('radio', { name: '合格' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: '異常' })).toBeTruthy();
});
