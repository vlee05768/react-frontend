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
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-TOL', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 1,
    standardCoreDiaMm: 76.2, standardThickness: 0.05, standardWidth: 149, standardLength: 20,
    groups: [{ id: 'g1', supplierLotNo: 'LOT1', allocatedQty: 1, sampleQty: 1, samples: [{ sampleId: 'sample-1' }] }],
    rolls: [{ sampleId: 'sample-1', seq: 1, rollNo: 'ROLL1', supplierLotNo: 'LOT1', actualQtyAux: 1, measuredSampleThicknessMm: 0.05, measuredCoreDiaMm: 86, measuredOuterDiaMm: 160.5, appearance: 'Pass', isOk: true, inspectionItems: [
      { itemCode: 'thickness', itemName: '厚度(mm)', measuredValue: '0.05', isOk: true },
      { itemCode: 'width', itemName: '寬度(mm)', measuredValue: '150', isOk: false, toleranceOverrideReason: '舊資料' },
      { itemCode: 'core_dia', itemName: '內管芯外徑(mm)', measuredValue: '86', isOk: true },
      { itemCode: 'appearance', itemName: '外觀', measuredValue: 'Pass', isOk: true },
    ] }],
  } } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('draft save no longer requires or edits per-item override reasons', async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="tol" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findByPlaceholderText('實測外徑');
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  expect(screen.queryByLabelText(/超差允收理由/)).toBeNull();
  expect(screen.queryByRole('radiogroup', { name: /細項判定/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  for (const sample of [body.rolls[0], body.groups[0].samples[0]]) {
    expect(sample.isOk).toBe(true);
    expect(sample.inspectionItems.find((item: any) => item.itemCode === 'width').toleranceOverrideReason).toBeUndefined();
  }
});
