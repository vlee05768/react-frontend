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
  api.detail.mockReset();
  api.post.mockReset();
  api.complete.mockReset();
  api.post.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderRoll(outer: number, isOk = true, completeItems = false) {
  api.detail.mockResolvedValue({ data: { data: {
    lotNo: 'IQC-TEST', materialForm: 'R', revision: 7, inspectionStatus: 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: 1,
    inspectionType: 'Production', semiFinishedInspectionSpec: { materialForm: 'R', standardThicknessMm: 0.05, standardWidthMm: 150, standardLength: 20, items: [{ itemCode: 'width', standardValue: 149, tolerance: 0.5 }] }, standardThickness: 0.05, standardWidth: 150, standardLength: 20, measuredCoreDiaMm: 86,
    groups: [{ id: 'g1', supplierLotNo: 'LOT1', allocatedQty: 1, sampleQty: 1, measuredCoreDiaMm: 86, samples: [{ sampleId: 'sample-1' }] }],
    rolls: [{ sampleId: 'sample-1', seq: 1, rollNo: 'ROLL1', supplierLotNo: 'LOT1', actualQtyAux: 1, measuredSampleThicknessMm: completeItems ? 0.05 : undefined, measuredCoreDiaMm: 86, measuredOuterDiaMm: outer, isOk, inspectionItems: completeItems ? [
      { itemCode: 'thickness', itemName: '厚度(mm)', measuredValue: '0.05', isOk: true },
      { itemCode: 'width', itemName: '寬度(mm)', measuredValue: '150', isOk: true },
      { itemCode: 'core_dia', itemName: '內管芯外徑(mm)', measuredValue: '86', isOk: true },
    ] : [] }],
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="test" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findByPlaceholderText('實測外徑');
}

it('保存並重讀獨立的超差允收理由', async () => {
  await renderRoll(93.1, true, true);
  api.post.mockImplementationOnce(async ({ body }: any) => {
    const old = (await api.detail()).data.data;
    api.detail.mockResolvedValue({ data: { data: { ...old, rolls: body.rolls, groups: body.groups.map((g: any) => ({ ...g, id: 'g1' })) } } });
    return { data: {} };
  });
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.change(screen.getByLabelText('寬度(mm)超差允收理由'), { target: { value: '客戶同意' } });
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  for (const sample of [api.post.mock.calls[0][0].body.rolls[0], api.post.mock.calls[0][0].body.groups[0].samples[0]]) {
    expect(sample.inspectionItems.find((i: any) => i.itemCode === 'width')).toMatchObject({ toleranceOverrideReason: '客戶同意' });
  }
  await waitFor(() => expect(api.detail.mock.calls.length).toBeGreaterThanOrEqual(2));
  await waitFor(() => expect(screen.getByLabelText('寬度(mm)超差允收理由')).toHaveValue('客戶同意'));
});
