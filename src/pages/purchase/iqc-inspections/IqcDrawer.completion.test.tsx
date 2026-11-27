import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IqcDrawer from './IqcDrawer';

// 正常 Production 完成案例沿用已解鎖政策；暫停 UI 案例明確模擬 true。
vi.mock('./productionPostingPolicy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./productionPostingPolicy')>();
  return { isProductionPostingPaused: vi.fn(actual.isProductionPostingPaused) };
});
import { isProductionPostingPaused } from './productionPostingPolicy';

const api = vi.hoisted(() => ({ detail: vi.fn(), post: vi.fn(), complete: vi.fn(), escalate: vi.fn() }));
vi.mock('@/api/generated', () => ({ getApiV1IqcInspectionByIqcRecordId: api.detail, postApiV1IqcInspectionByIqcRecordIdEscalate: api.escalate, postApiV1IqcInspectionByIqcRecordIdComplete: api.complete, getApiV1IqcInspectionByIqcRecordIdPdf: vi.fn() }));
vi.mock('@/api/generated/client.gen', () => ({ client: { post: api.post } }));
const access = vi.hoisted(() => ({ permissions: ['Purchase.IqcInspections.View', 'Purchase.IqcInspections.ConcessionReview', 'Purchase.IqcInspections.CancelConfirm'] as string[] }));
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: () => ({ user: null, hasPermission: (code: string) => access.permissions.includes(code) }) }));
vi.mock('@/hooks/useFileDownload', () => ({ useFileDownload: () => ({ downloadFile: vi.fn(), isDownloading: false }) }));
vi.mock('@/components/Form/DynamicForm', () => ({ DynamicForm: () => null }));
vi.mock('@/components/Form/AsyncSelect', () => ({ AsyncSelect: () => null }));
vi.mock('@/components/common/ActionBar', () => ({ ActionBar: ({ actions }: any) => <div>{actions}</div> }));
vi.mock('@/components/Table/ErpTable', () => ({ default: ({ dataSource, columns }: any) => <div>{dataSource.map((row: any, i: number) => <div key={row.id ?? row.rollNo}>{columns.map((col: any, j: number) => <div key={j}>{col.render ? col.render(row[col.dataIndex], row, i) : row[col.dataIndex]}</div>)}</div>)}</div> }));

beforeEach(() => {
  access.permissions = ['Purchase.IqcInspections.View', 'Purchase.IqcInspections.ConcessionReview', 'Purchase.IqcInspections.CancelConfirm'];
  vi.mocked(isProductionPostingPaused).mockReset().mockReturnValue(false);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  api.post.mockReset();
  api.escalate.mockReset().mockImplementation(() => new Promise(() => {}));
  api.post.mockImplementation(() => new Promise(() => {}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function renderInspection(measuredValue: string, isOk: boolean | null, post = true, sampleIsOk: boolean | null = true, overrides: any = {}, dimensions: { thickness?: string; width?: string; length?: string } = {}) {
  api.complete.mockReset();
  api.detail.mockResolvedValue({ data: { data: {
    ...overrides, lotNo: 'IQC-TEST', materialForm: overrides.materialForm ?? 'S', revision: 1, inspectionStatus: overrides.inspectionStatus ?? 'Pending', inspectorId: 'EMP-1', incomingStorageCode: 'ST-1', rollCount: overrides.rollCount ?? 1,
    standardCoreDiaMm: overrides.standardCoreDiaMm === undefined ? 76.2 : overrides.standardCoreDiaMm, standardThickness: 0.05, standardWidth: 150, standardLength: 300,
    groups: [{ id: 'g1', supplierLotNo: 'LOT', allocatedQty: overrides.rollCount ?? 1, sampleQty: 1, samples: [{ sampleId: 'sample-1' }] }],
    rolls: [{ sampleId: 'sample-1', seq: 1, rollNo: 'S1', supplierLotNo: 'LOT', actualQtyAux: 1, measuredCoreDiaMm: 86, measuredOuterDiaMm: 160.5, measuredSampleThicknessMm: 0.05, appearance: overrides.appearance === undefined ? 'Pass' : overrides.appearance, isOk: sampleIsOk, defectReason: overrides.sampleDefectReason === undefined ? (sampleIsOk === false ? '外觀異常' : null) : overrides.sampleDefectReason, inspectionItems: [
      { itemCode: 'thickness', itemName: '厚度', measuredValue: dimensions.thickness ?? '0.05', isOk: true },
      { itemCode: 'width', itemName: '寬度', measuredValue: dimensions.width ?? '150', isOk: true },
      { itemCode: 'length', itemName: '長度', measuredValue: dimensions.length ?? '300', isOk: true },
      ...(overrides.materialForm === 'R' ? [{ itemCode: 'core_dia', itemName: '管芯', measuredValue: '86', isOk: true }] : []),
      { itemCode: 'extra', itemName: '黏著力', measuredValue, isOk },
    ] }],
  } } });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><App><IqcDrawer iqcRecordId="test" open onClose={() => {}} onSuccess={() => {}} /></App></QueryClientProvider>);
  await screen.findAllByText('LOT');
  if (post) fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  return qc;
}

it.each(['complete', 'escalate', 'concession'] as const)('採購已開判定視窗在 refetch 結案後阻擋 %s', async action => {
  const qc = await renderInspection('10', action === 'complete', true, action === 'complete', { inspectionType: 'Incoming', materialForm: action === 'complete' ? 'S' : 'R' });
  const button = await screen.findByRole('button', { name: action === 'complete' ? /確認過帳/ : action === 'escalate' ? '啟動 100% 全檢' : '直接提交特採申請' });
  const previous = (await api.detail()).data.data;
  api.detail.mockResolvedValue({ data: { data: { ...previous, inspectionStatus: 'AllPass', revision: 2 } } });
  await qc.refetchQueries({ queryKey: ['iqc-detail', 'test'] });
  await waitFor(() => expect(screen.queryByRole('button', { name: /進行品質判定與過帳/ })).toBeNull());
  fireEvent.click(button);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(api.complete).not.toHaveBeenCalled();
  expect(api.escalate).not.toHaveBeenCalled();
});

it.each(['complete', 'escalate', 'concession'] as const)('採購呈現後撤回權限時 handler 阻擋 %s', async action => {
  await renderInspection('10', action === 'complete', true, action === 'complete', { inspectionType: 'Incoming', materialForm: action === 'complete' ? 'S' : 'R' });
  const button = await screen.findByRole('button', { name: action === 'complete' ? /確認過帳/ : action === 'escalate' ? '啟動 100% 全檢' : '直接提交特採申請' });
  access.permissions = [];
  fireEvent.click(button);
  expect(await screen.findByText('目前已無此品檢單的操作權限，請重新確認權限。')).toBeTruthy();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(api.complete).not.toHaveBeenCalled();
  expect(api.escalate).not.toHaveBeenCalled();
});

it.each(['closed', 'permission'] as const)('直接特採二次確認開啟後重讀最新 %s 防線', async change => {
  const qc = await renderInspection('10', false, true, false, { inspectionType: 'Incoming', materialForm: 'R', rollCount: 2 });
  fireEvent.click(await screen.findByRole('button', { name: '直接提交特採申請' }));
  const confirm = await screen.findByRole('button', { name: '確認直接提交特採' });
  if (change === 'permission') access.permissions = [];
  else {
    const previous = (await api.detail()).data.data;
    api.detail.mockResolvedValue({ data: { data: { ...previous, inspectionStatus: 'Reject', revision: 2 } } });
    await qc.refetchQueries({ queryKey: ['iqc-detail', 'test'] });
  }
  fireEvent.click(confirm);
  expect(await screen.findByText(change === 'permission' ? '目前已無此品檢單的操作權限，請重新確認權限。' : '品檢單狀態已變更，目前無法進行此處置，請重新確認。')).toBeTruthy();
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(api.complete).not.toHaveBeenCalled();
});

it('採購 NG 卷料合法直接特採仍送出完成 API', async () => {
  await renderInspection('10', false, true, false, { inspectionType: 'Incoming', materialForm: 'R' });
  api.complete.mockImplementation(() => new Promise(() => {}));
  fireEvent.click(await screen.findByRole('button', { name: '直接提交特採申請' }));
  await waitFor(() => expect(api.complete).toHaveBeenCalledOnce());
  const body = api.complete.mock.calls[0][0].body;
  expect(body.overallResult).toBe('Concession');
  expect(body.standardCoreDiaMm).toBe(76.2);
  expect(body.measuredCoreDiaMm).toBeNull();
  expect(body.rolls[0]).toMatchObject({ appearance: 'Pass', defectReason: '外觀異常', measuredCoreDiaMm: 86, measuredOuterDiaMm: 160.5, measuredSampleThicknessMm: 0.05 });
  expect(body.groups[0].samples[0]).toMatchObject({ appearance: 'Pass', defectReason: '外觀異常', measuredCoreDiaMm: 86, measuredOuterDiaMm: 160.5, measuredSampleThicknessMm: 0.05 });
});

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

it('does not require deprecated item-level judgments when the sample is judged', async () => {
  await renderInspection('10', null);
  expect(await screen.findByRole('radio', { name: /AllPass/ })).toBeTruthy();
});

it('blocks roll completion without a positive standard core diameter', async () => {
  await renderInspection('10', true, true, true, { materialForm: 'R', standardCoreDiaMm: null });
  expect(await screen.findByText('卷料完成品檢前必須填寫標準內管芯外徑')).toBeTruthy();
  expect(api.complete).not.toHaveBeenCalled();
});

it('requires a defect reason when the sample is judged abnormal', async () => {
  await renderInspection('10', true, true, false, { materialForm: 'R', sampleDefectReason: '   ' });
  expect(await screen.findByText(/請輸入.*異常原因/)).toBeTruthy();
  expect(api.complete).not.toHaveBeenCalled();
});

it.each([
  ['width', 'abc'], ['width', 'Infinity'], ['width', '150mm'],
  ['length', 'NaN'], ['length', '1e999'], ['thickness', '0.05mm'],
] as const)('拒絕不合法的 %s 實測值 %s', async (field, value) => {
  await renderInspection('10', true, true, true, {}, { [field]: value });
  expect(await screen.findByText(/必須.*大於 0/)).toBeTruthy();
  expect(api.complete).not.toHaveBeenCalled();
});

it('blocks completion for a blank measured value', async () => {
  await renderInspection('   ', true);
  expect(await screen.findByText(/黏著力.*實測值/)).toBeTruthy();
  expect(api.complete).not.toHaveBeenCalled();
});

it.each([true, false])('allows sample-level pass regardless of deprecated item judgment %s', async (judgment) => {
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


it.each([['PR-1', 'Incoming']])('saves and completes %s without changing source contract', async (sourceDocNumber, inspectionType) => {
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


it('saves production batch quantities without treating the sample as a package', async () => {
  await renderInspection('10', true, false, true, { inspectionType: 'Production', productionTotalQuantity: 10, productionGoodQuantity: null, productionDefectQuantity: null, productionQuantityUnit: 'PCS' });
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.change(screen.getByRole('spinbutton', { name: '良品數量' }), { target: { value: '7' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: '不良數量' }), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.productionGoodQuantity).toBe(7);
  expect(body.productionDefectQuantity).toBe(3);
  expect(body.rolls[0].sampleId).toBe('sample-1');
  expect(body.rolls[0]).not.toHaveProperty('packageSeq');
});


it('預設解鎖後以輸入批次數量提交 Production Partial', async () => {
  await renderInspection('10', true, false, true, { inspectionType: 'Production', productionTotalQuantity: 10, productionGoodQuantity: 7, productionDefectQuantity: 3, productionQuantityUnit: 'PCS' });
  api.complete.mockImplementation(() => new Promise(() => {}));
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  fireEvent.click(await screen.findByRole('radio', { name: /Partial/ }));
  fireEvent.click(screen.getByRole('button', { name: /確認過帳/ }));
  await waitFor(() => expect(api.complete).toHaveBeenCalled());
  expect(api.complete.mock.calls[0][0].body).toEqual(expect.objectContaining({ overallResult: 'Partial', productionGoodQuantity: 7, productionDefectQuantity: 3 }));
});


it.each(['render', 'handler'] as const)('Production NG 卷料全檢與特採在完成過帳解鎖後仍維持 fail-closed：%s', async seam => {
  const qc = await renderInspection('10', false, false, false, { inspectionType: seam === 'render' ? 'Production' : 'Incoming', materialForm: 'R' });
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  const escalate = await screen.findByRole('button', { name: '啟動 100% 全檢' });
  const concession = screen.getByRole('button', { name: '直接提交特採申請' });
  if (seam === 'render') {
    expect(escalate).toBeDisabled();
    expect(concession).toBeDisabled();
  } else {
    expect(escalate).toBeEnabled();
    expect(concession).toBeEnabled();
    const cached = qc.getQueryData<any>(['iqc-detail', 'test']);
    qc.setQueryData(['iqc-detail', 'test'], {
      ...cached,
      data: { ...cached.data, data: { ...cached.data.data, inspectionType: 'Production' } },
    });
  }
  fireEvent.click(escalate);
  fireEvent.click(concession);
  if (seam === 'handler') {
    await waitFor(() => expect(screen.getAllByText('Production 全檢與特採目前暫停，請保留草稿並等待後端支援。')).toHaveLength(2));
  }
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(api.escalate).not.toHaveBeenCalled();
  expect(api.complete).not.toHaveBeenCalled();
});

it('採購 NG 卷料仍可啟動全檢，不受 Production 暫停影響', async () => {
  await renderInspection('10', false, false, false, { inspectionType: 'Incoming', materialForm: 'R' });
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  const escalate = await screen.findByRole('button', { name: '啟動 100% 全檢' });
  expect(escalate).toBeEnabled();
  fireEvent.click(escalate);
  await waitFor(() => expect(api.escalate).toHaveBeenCalledOnce());
  expect(api.complete).not.toHaveBeenCalled();
});

it('Production 顯示暫停過帳並禁止送出', async () => {
  vi.mocked(isProductionPostingPaused).mockReturnValue(true);
  await renderInspection('10', true, false, true, { inspectionType: 'Production', productionTotalQuantity: 10, productionGoodQuantity: 7, productionDefectQuantity: 3, productionQuantityUnit: 'PCS' });
  expect(screen.getByText('Production 過帳目前暫停')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  const button = await screen.findByRole('button', { name: /確認過帳/ });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(api.complete).not.toHaveBeenCalled();
});

it('草稿省略未修改數量並以 null 清除，重新讀取顯示伺服器值', async () => {
  await renderInspection('10', true, false, true, { inspectionType: 'Production', productionGoodQuantity: 7, productionDefectQuantity: 3, productionQuantityUnit: 'PCS' });
  api.post.mockImplementation(async ({ body }: any) => {
    const old = (await api.detail()).data.data;
    api.detail.mockResolvedValue({ data: { data: { ...old, ...body, groups: body.groups.map((g: any) => ({ ...g, id: 'g1' })) } } });
    return { data: {} };
  });
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.change(screen.getByRole('spinbutton', { name: '良品數量' }), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const body = api.post.mock.calls[0][0].body;
  expect(body.productionGoodQuantity).toBeNull();
  expect(body).not.toHaveProperty('productionDefectQuantity');
  await waitFor(() => expect(screen.getByRole('spinbutton', { name: '良品數量' })).toHaveValue(''));
  expect(screen.getByRole('spinbutton', { name: '不良數量' })).toHaveValue('3');
});

it('未填表面外觀時草稿保留 null 且完成過帳予以阻擋', async () => {
  await renderInspection('10', true, false, true, { appearance: null });
  fireEvent.click(screen.getByRole('button', { name: /編輯/ }));
  fireEvent.click(screen.getByRole('button', { name: /儲存/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
  const draftBody = api.post.mock.calls[0][0].body;
  expect(draftBody.rolls[0].appearance).toBeNull();
  expect(draftBody.groups[0].samples[0].appearance).toBeNull();

  cleanup();
  await renderInspection('10', true, false, true, { appearance: null });
  fireEvent.click(screen.getByRole('button', { name: /進行品質判定與過帳/ }));
  expect(await screen.findByText(/表面外觀/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /確認過帳/ })).toBeNull();
  expect(api.complete).not.toHaveBeenCalled();
});

it.each([
  { role: 'QC', permissions: ['Purchase.IqcInspections.View', 'Purchase.IqcInspections.Confirm'], review: false, cancel: false },
  { role: 'QC_MGR', permissions: ['Purchase.IqcInspections.View', 'Purchase.IqcInspections.ConcessionReview', 'Purchase.IqcInspections.CancelConfirm'], review: true, cancel: true },
  { role: 'Admin', permissions: ['Purchase.IqcInspections.View', 'Purchase.IqcInspections.ConcessionReview', 'Purchase.IqcInspections.CancelConfirm'], review: true, cancel: true },
])('$role 僅依特採核決與取消過帳權限顯示對應按鈕', async ({ permissions, review, cancel }) => {
  access.permissions = permissions;
  await renderInspection('10', true, false, true, { inspectionStatus: 'ConcessionPending' });
  await screen.findAllByText('LOT');
  expect(screen.queryByRole('button', { name: /進行特採會簽與過帳/ }) !== null).toBe(review);
  cleanup();
  await renderInspection('10', true, false, true, { inspectionStatus: 'AllPass' });
  await screen.findAllByText('LOT');
  expect(screen.queryByRole('button', { name: /取消過帳/ }) !== null).toBe(cancel);
});

it.each(['AllPass', 'Partial', 'Reject'])('Production %s 可由 CancelConfirm 權限取消過帳且原因可空白', async status => {
  api.post.mockResolvedValue({ data: { data: true } });
  await renderInspection('10', true, false, true, { inspectionType: 'Production', inspectionStatus: status });
  fireEvent.click(await screen.findByRole('button', { name: /取消過帳/ }));
  fireEvent.click(await screen.findByRole('button', { name: '確認取消過帳' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/v1/IqcInspection/test/cancel', body: { notes: '' } })));
});

it('客供料存在異常樣品時預設整批退回且不開放特採選項', async () => {
  await renderInspection('10', false, true, false, { sourceDocNumber: 'CR-202611-0001', inspectionType: 'Incoming' });
  expect(await screen.findByRole('button', { name: /確認過帳/ })).toBeTruthy();
  expect(screen.queryByText(/Concession \(申請特採\)/)).toBeNull();
  expect(screen.getByText(/Reject \(全部退回\)/)).toBeTruthy();
});
