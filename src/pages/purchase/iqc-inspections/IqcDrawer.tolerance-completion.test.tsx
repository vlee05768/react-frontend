import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IqcDrawer from './IqcDrawer';

const api = vi.hoisted(() => ({ detail: vi.fn(), complete: vi.fn() }));
vi.mock('@/api/generated', () => ({ getApiV1IqcInspectionByIqcRecordId: api.detail, postApiV1IqcInspectionByIqcRecordIdEscalate: vi.fn(), postApiV1IqcInspectionByIqcRecordIdComplete: api.complete, getApiV1IqcInspectionByIqcRecordIdPdf: vi.fn() }));
vi.mock('@/api/generated/client.gen', () => ({ client: { post: vi.fn() } }));
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: () => ({ user: { permissions: ['Purchase.IqcInspections.View'] }, hasPermission: () => true }) }));
vi.mock('@/hooks/useFileDownload', () => ({ useFileDownload: () => ({ downloadFile: vi.fn(), isDownloading: false }) }));
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => null }));
vi.mock('@/components/Form/AsyncSelect', () => ({ AsyncSelect: () => null }));
vi.mock('@/components/common/ActionBar', () => ({ ActionBar: ({ actions }: any) => <div>{actions}</div> }));
vi.mock('@/components/Table/ErpTable', () => ({ default: ({ dataSource, columns }: any) => <div>{dataSource.map((row: any, i: number) => <div key={row.id ?? row.rollNo}>{columns.map((col: any, j: number) => <div key={j}>{col.render ? col.render(row[col.dataIndex], row, i) : row[col.dataIndex]}</div>)}</div>)}</div> }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  api.complete.mockReset().mockImplementation(() => new Promise(() => {}));
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-TOL', materialForm: 'S', revision: 1, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 1,
    inspectionType: 'Incoming',
    standardThickness: 0.05, standardWidth: 149, standardLength: 300,
    groups: [{ id: 'g1', supplierLotNo: 'LOT', allocatedQty: 1, sampleQty: 1, samples: [{ sampleId: 's1' }] }],
    rolls: [{ sampleId: 's1', seq: 1, rollNo: 'S1', supplierLotNo: 'LOT', actualQtyAux: 1, measuredSampleThicknessMm: 0.05, measuredWidthMm: 150, measuredLengthMm: 300, appearance: 'Pass', isOk: true, inspectionItems: [
      { itemCode: 'thickness', itemName: '厚度', measuredValue: '0.05', isOk: null },
      { itemCode: 'width', itemName: '寬度', measuredValue: '150', isOk: false },
      { itemCode: 'length', itemName: '長度', measuredValue: '300', isOk: null },
      { itemCode: 'appearance', itemName: '外觀', measuredValue: 'Pass', isOk: true },
    ] }],
  } } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderInspection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="tol" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('LOT');
}

it('allows sample-level pass even when a legacy item judgment is NG', async () => {
  await renderInspection();
  expect(screen.getByRole('radio', { name: '合格' })).toBeChecked();
  expect(screen.queryByText(/超差允收理由/)).toBeNull();
  expect(screen.queryByRole('radiogroup', { name: /細項判定/ })).toBeNull();
});
