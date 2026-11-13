import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IqcDrawer from './IqcDrawer';

const api = vi.hoisted(() => ({ detail: vi.fn(), post: vi.fn(), complete: vi.fn() }));
vi.mock('@/api/generated', () => ({ getApiV1IqcInspectionByIqcRecordId: api.detail, postApiV1IqcInspectionByIqcRecordIdEscalate: vi.fn(), postApiV1IqcInspectionByIqcRecordIdComplete: api.complete, getApiV1IqcInspectionByIqcRecordIdPdf: vi.fn() }));
vi.mock('@/api/generated/client.gen', () => ({ client: { post: api.post } }));
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: () => ({ user: { permissions: ['Purchase.IqcInspections.View'] }, hasPermission: () => true }) }));
vi.mock('@/hooks/useFileDownload', () => ({ useFileDownload: () => ({ downloadFile: vi.fn(), isDownloading: false }) }));
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => null }));
vi.mock('@/components/Form/AsyncSelect', () => ({ AsyncSelect: () => null }));
vi.mock('@/components/common/ActionBar', () => ({ ActionBar: ({ actions }: any) => <div>{actions}</div> }));
vi.mock('@/components/Table/ErpTable', () => ({ default: ({ dataSource, columns }: any) => <div>{columns.map((col: any) => <div key={col.key ?? col.dataIndex ?? col.title}>{col.title}</div>)}{dataSource.map((row: any, i: number) => <div key={row.id ?? row.rollNo}>{columns.map((col: any, j: number) => <div key={j}>{col.render ? col.render(row[col.dataIndex], row, i) : row[col.dataIndex]}</div>)}</div>)}</div> }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderRolls() {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-CORE', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 2,
    standardCoreDiaMm: 76.2, standardThickness: 0.05, standardWidth: 150, standardLength: 20,
    groups: ['LOT-A', 'LOT-B'].map((supplierLotNo, i) => ({ id: `g${i}`, supplierLotNo, allocatedQty: 1, sampleQty: 1, samples: [{ sampleId: `s${i}` }] })),
    rolls: [86, 90].map((core, i) => ({ sampleId: `s${i}`, seq: i + 1, rollNo: `R${i}`, supplierLotNo: `LOT-${i ? 'B' : 'A'}`, actualQtyAux: 1, measuredSampleThicknessMm: 0.08, measuredWidthMm: 150, measuredCoreDiaMm: core, measuredOuterDiaMm: 150 + i, appearance: 'Pass', isOk: true, inspectionItems: [
      { itemCode: 'thickness', itemName: '厚度(mm)', measuredValue: '0.08' },
      { itemCode: 'width', itemName: '寬度(mm)', measuredValue: '150' },
      { itemCode: 'core_dia', itemName: '內管芯外徑(mm)', measuredValue: String(core) },
      { itemCode: 'appearance', itemName: '表面外觀', measuredValue: 'Pass' },
    ] })),
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="core" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('LOT-A');
}

it('第一步分組表移除管芯欄，第二步顯示表頭標準管芯參考', async () => {
  await renderRolls();
  expect(screen.queryByText('內管芯外徑 (mm)')).toBeNull();
  expect(screen.getByText('內管芯外徑(mm) (76.2)')).toBeTruthy();
  expect(screen.queryByText('來源不明')).toBeNull();
  expect(screen.queryByText(/LOT-A.*mm/)).toBeNull();
});

it('卷料長度只用標準厚度，不受實測厚度不同影響', async () => {
  await renderRolls();
  const expected = Math.round(((Math.PI * (150 ** 2 - 86 ** 2)) / (4000 * 0.05)) * 10) / 10;
  expect(screen.getByText(`${expected} M`)).toBeTruthy();
});
