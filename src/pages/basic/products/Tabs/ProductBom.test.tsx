import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJSONStorage } from 'zustand/middleware';
import { useAuthStore } from '@/stores/useAuthStore';
import type { BomContract } from '@/api/bomCompatibility';
import ProductBom from './ProductBom';

const { getBom, updateBom, updateBomItem, createBom, deleteBomItem, createBomItem } = vi.hoisted(() => ({
  getBom: vi.fn(), updateBom: vi.fn(), updateBomItem: vi.fn(), createBom: vi.fn(), deleteBomItem: vi.fn(), createBomItem: vi.fn(),
}));
vi.mock('@/api/bomCompatibility', () => ({
  getBom, updateBom, createBom, deleteBomItem,
  createBomItem, updateBomItem,
}));
vi.mock('@/hooks/useDictionary', () => ({
  useDictionary: () => ({ data: [{ code: 'MACHINE-1', _displayName: '測試機台' }], isLoading: false, isFetching: false, refetch: vi.fn() }),
}));

const updatePermission = 'BasicData.Products.BOM.Update';
let bom: BomContract;
const clients: QueryClient[] = [];

// 與 Permissions.json／授權 API 相同的階層，包含功能檢視節點。
function permissionTree(active = true, includeUpdate = true) {
  return [{ key: 'BasicData', active: true, children: [{
    key: 'BasicData.Products', active: true, children: [
      { key: 'BasicData.Products.View', active: true },
      { key: 'BasicData.Products.BOM', active: true, children: [
        { key: 'BasicData.Products.BOM.View', active: true },
        ...(includeUpdate ? [{ key: updatePermission, active }] : []),
      ] },
    ],
  }] }];
}

function setPermissions(permissions: string[]) {
  useAuthStore.setState({
    user: { userName: 'reader', roles: [], permissions },
    permissionTree: permissionTree(true, permissions.includes(updatePermission)),
  });
}

function renderBom(outputType: 'P' | 'M' = 'P', isViewMode = true, onEditingChange = vi.fn()) {
  bom.outputType = outputType;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  client.setQueryData(['async-select-initial', 'MATERIAL', 'MAT-001', undefined], { code: 'MAT-001', name: '測試原料' });
  client.setQueryData(['async-select', 'MATERIAL', '', undefined], [{ code: 'MAT-002', name: '新增原料' }]);
  return render(
    <App><QueryClientProvider client={client}>
      <ProductBom outputType={outputType} outputCode="OUTPUT-001" isViewMode={isViewMode} onEditingChange={onEditingChange} />
    </QueryClientProvider></App>,
  );
}

async function activeSwitch() {
  await screen.findByText('BOM 表頭');
  // 啟用狀態僅保留表單內的單一開關。
  const toggle = screen.getByRole('switch');
  expect(toggle.closest('form')).not.toBeNull();
  return toggle;
}

beforeEach(() => {
  const storage = new Map<string, string>();
  useAuthStore.persist.setOptions({ storage: createJSONStorage(() => ({
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => { storage.set(key, value); },
    removeItem: (key) => { storage.delete(key); },
  })) });
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })));
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  bom = {
    outputType: 'P', outputCode: 'OUTPUT-001', isActive: false,
    defaultMachineType: 'MACHINE-1', defaultToolingRangeMm: 10,
    defaultPunchHolesCount: 1, pcsPerSheet: 1, notes: '原始備註', items: [],
  };
  getBom.mockImplementation(async () => ({ data: { data: { ...bom } } }));
  updateBom.mockImplementation(async (_type, _code, payload) => {
    bom = { ...bom, ...payload };
    return { data: { data: bom } };
  });
  setPermissions([]);
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  useAuthStore.setState({ user: null, permissionTree: null });
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('BOM 更新權限', () => {
  it.each(['P', 'M'] as const)('%s 有 Update 但未進入表頭編輯時不可送出更新', async (outputType) => {
    setPermissions([updatePermission]);
    const { container } = renderBom(outputType);
    await activeSwitch();
    await act(async () => { fireEvent.submit(container.querySelector('#bomHeaderForm')!); });
    expect(updateBom).not.toHaveBeenCalled();
  });
  it.each([['P', false], ['P', true], ['M', false], ['M', true]] as const)('%s 取消表頭編輯還原啟用與備註，不送 API（原啟用=%s）', async (outputType, wasActive) => {
    setPermissions([updatePermission]);
    bom.isActive = wasActive;
    renderBom(outputType);
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    await userEvent.click(screen.getByRole('switch'));
    const notes = screen.getByDisplayValue('原始備註');
    await userEvent.clear(notes);
    await userEvent.type(notes, '尚未儲存');
    await userEvent.click(screen.getByRole('button', { name: /取\s*消$/ }));
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', String(wasActive));
    expect(screen.getByDisplayValue('原始備註')).toBeDisabled();
    expect(updateBom).not.toHaveBeenCalled();
    expect(createBom).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    expect(screen.getByDisplayValue('原始備註')).toBeEnabled();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', String(wasActive));
  });

  it.each(['P', 'M'] as const)('%s 新建 BOM 預設啟用且建立不傳 isActive', async (outputType) => {
    getBom.mockResolvedValue({ data: null });
    renderBom(outputType);
    await userEvent.click(await screen.findByRole('button', { name: /^建立 BOM$/ }));
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('button', { name: /取\s*消$/ }));
    expect(createBom).not.toHaveBeenCalled();
    expect(updateBom).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /^建立 BOM$/ }));
    fireEvent.mouseDown(document.querySelector('#defaultMachineType')!);
    await userEvent.click(await screen.findByText('測試機台', { selector: '.ant-select-item-option-content' }));
    fireEvent.change(document.querySelector('#defaultToolingRangeMm')!, { target: { value: '10' } });
    fireEvent.change(document.querySelector('#defaultPunchHolesCount')!, { target: { value: '1' } });
    await userEvent.click(screen.getByRole('button', { name: /儲\s*存$/ }));
    await waitFor(() => expect(createBom).toHaveBeenCalledExactlyOnceWith({
      outputType, outputCode: 'OUTPUT-001', defaultMachineType: 'MACHINE-1',
      defaultToolingRangeMm: 10, defaultPunchHolesCount: 1, pcsPerSheet: undefined, notes: undefined,
    }));
    expect(updateBom).not.toHaveBeenCalled();
  });

  it.each(['P', 'M'] as const)('Admin 有 Update 但 global inactive 時 %s toggle/header/item 全部拒絕', async (outputType) => {
    useAuthStore.setState({
      user: { userName: 'admin', roles: ['Admin'], permissions: [updatePermission] },
      permissionTree: permissionTree(false),
    });
    bom.items = [{ code: 'ITEM-001', materialCode: 'MAT-001', quantity: 1 }];
    const { container } = renderBom(outputType);
    const toggle = await activeSwitch();
    expect(toggle).toBeDisabled();
    expect(screen.queryByRole('button', { name: /編\s*輯$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'edit' })).toBeDisabled();
    await userEvent.click(toggle);
    await act(async () => { fireEvent.submit(container.querySelector('#bomHeaderForm')!); });
    expect(updateBom).not.toHaveBeenCalled();
    expect(updateBomItem).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /新增物料/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'delete' })).toBeEnabled();
  }, 30000);

  it.each([
    ['P', null], ['M', null], ['P', []], ['M', []],
    ['P', [{ key: 'BasicData.Products.BOM', active: true }]],
    ['M', [{ key: 'BasicData.Products.BOM', active: true }]],
    ['P', [{ key: updatePermission }]], ['M', [{ key: updatePermission }]],
  ] as const)('%s Admin 的 permissionTree 未載入、缺 key 或 active 未知時 fail closed (%j)', async (outputType, tree) => {
    useAuthStore.setState({
      user: { userName: 'admin', roles: ['Admin'], permissions: [updatePermission] },
      permissionTree: tree === null ? null : tree.map((node) => ({ ...node })),
    });
    const { container } = renderBom(outputType);
    expect(await activeSwitch()).toBeDisabled();
    expect(screen.queryByRole('button', { name: /編\s*輯$/ })).not.toBeInTheDocument();
    await act(async () => { fireEvent.submit(container.querySelector('#bomHeaderForm')!); });
    expect(updateBom).not.toHaveBeenCalled();
  });

  it.each(['P', 'M'] as const)('%s 僅帳號名 admin 而非 Admin 角色不能繞過授權', async (outputType) => {
    useAuthStore.setState({ user: { userName: 'admin', roles: [], permissions: [] }, permissionTree: permissionTree() });
    renderBom(outputType);
    expect(await activeSwitch()).toBeDisabled();
  });

  it.each(['P', 'M'] as const)('%s 真正 Admin 可使用 active Update，不要求 permissions 重複列出', async (outputType) => {
    useAuthStore.setState({ user: { userName: 'operator', roles: ['Admin'], permissions: [] }, permissionTree: permissionTree() });
    renderBom(outputType);
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeEnabled();
    await userEvent.click(toggle);
    expect(updateBom).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /儲\s*存$/ }));
    await waitFor(() => expect(updateBom).toHaveBeenCalledExactlyOnceWith(outputType, 'OUTPUT-001', {
      isActive: true, defaultMachineType: 'MACHINE-1', defaultToolingRangeMm: 10,
      defaultPunchHolesCount: 1, pcsPerSheet: 1, notes: '原始備註',
    }));
  });

  it.each(['P', 'M'] as const)('唯讀使用者不能操作 %s 啟用開關或進入表頭編輯，也不呼叫更新 API', async (outputType) => {
    renderBom(outputType);
    const toggle = await activeSwitch();
    expect(toggle).toBeDisabled();
    await userEvent.click(toggle);
    expect(updateBom).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /編\s*輯$/ })).not.toBeInTheDocument();
  });

  it.each([
    ['P', false], ['P', true], ['M', false], ['M', true],
  ] as const)('Update 使用者可切換 %s BOM（原啟用=%s），傳送 boolean 並更新畫面', async (outputType, wasActive) => {
    setPermissions([updatePermission]);
    bom.isActive = wasActive;
    renderBom(outputType);
    const toggle = await activeSwitch();
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('aria-checked', String(wasActive));
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    expect(toggle).toBeEnabled();
    await userEvent.click(toggle);
    fireEvent.change(document.querySelector('#defaultToolingRangeMm')!, { target: { value: '20' } });
    fireEvent.change(document.querySelector('#defaultPunchHolesCount')!, { target: { value: '2' } });
    fireEvent.change(document.querySelector('#pcsPerSheet')!, { target: { value: '3' } });
    fireEvent.change(screen.getByDisplayValue('原始備註'), { target: { value: '更新表頭與啟用' } });
    expect(updateBom).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /儲\s*存$/ }));
    await waitFor(() => expect(updateBom).toHaveBeenCalledExactlyOnceWith(outputType, 'OUTPUT-001', {
      isActive: !wasActive, defaultMachineType: 'MACHINE-1', defaultToolingRangeMm: 20,
      defaultPunchHolesCount: 2, pcsPerSheet: 3, notes: '更新表頭與啟用',
    }));
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', String(!wasActive)));
  });

  it('Update 使用者可編輯停用 BOM 表頭並儲存既有資料', async () => {
    setPermissions([updatePermission]);
    renderBom();
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    const notes = screen.getByDisplayValue('原始備註');
    expect(notes).toBeEnabled();
    await userEvent.clear(notes);
    await userEvent.type(notes, '修改備註');
    await userEvent.click(screen.getByRole('button', { name: /儲\s*存$/ }));
    await waitFor(() => expect(updateBom).toHaveBeenCalledExactlyOnceWith('P', 'OUTPUT-001', {
      defaultMachineType: 'MACHINE-1', defaultToolingRangeMm: 10,
      defaultPunchHolesCount: 1, pcsPerSheet: 1, notes: '修改備註', isActive: false,
    }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /儲\s*存$/ })).not.toBeInTheDocument());
  });

  it.each([
    ['P', 'inactive'], ['M', 'inactive'], ['P', 'unknown'], ['M', 'unknown'], ['P', 'missing'], ['M', 'missing'],
  ] as const)('%s Admin 刷新 permissionTree (%s) 在點擊前撤銷，handler 與 UI 同步拒絕', async (outputType, mode) => {
    useAuthStore.setState({ user: { userName: 'admin', roles: ['Admin'], permissions: [updatePermission] }, permissionTree: permissionTree() });
    renderBom(outputType);
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeEnabled();
    act(() => {
      useAuthStore.setState({ permissionTree: mode === 'inactive' ? permissionTree(false) : mode === 'unknown' ? null : [] });
      fireEvent.click(toggle);
    });
    expect(updateBom).not.toHaveBeenCalled();
    expect(toggle).toBeDisabled();
    expect(screen.queryByRole('button', { name: /編\s*輯$/ })).not.toBeInTheDocument();
  });

  it.each([
    ['P', 'inactive'], ['M', 'inactive'], ['P', 'unknown'], ['M', 'unknown'], ['P', 'missing'], ['M', 'missing'],
  ] as const)('%s Admin 表頭驗證期間刷新 permissionTree (%s)，不更新並結束編輯', async (outputType, mode) => {
    useAuthStore.setState({ user: { userName: 'admin', roles: ['Admin'], permissions: [updatePermission] }, permissionTree: permissionTree() });
    bom.isActive = true;
    const onEditingChange = vi.fn();
    const { container } = renderBom(outputType, true, onEditingChange);
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    await act(async () => {
      fireEvent.submit(container.querySelector('#bomHeaderForm')!);
      useAuthStore.setState({ permissionTree: mode === 'inactive' ? permissionTree(false) : mode === 'unknown' ? null : [] });
    });
    expect(updateBom).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /儲\s*存$/ })).not.toBeInTheDocument();
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
    act(() => useAuthStore.setState({ permissionTree: permissionTree() }));
    expect(screen.queryByRole('button', { name: /儲\s*存$/ })).not.toBeInTheDocument();
  });

  it.each([
    ['P', 'inactive'], ['M', 'inactive'], ['P', 'unknown'], ['M', 'unknown'], ['P', 'missing'], ['M', 'missing'],
  ] as const)('%s Admin 明細驗證期間刷新 permissionTree (%s)，不更新並關閉 modal', async (outputType, mode) => {
    useAuthStore.setState({ user: { userName: 'admin', roles: ['Admin'], permissions: [updatePermission] }, permissionTree: permissionTree() });
    bom.items = [{ code: 'ITEM-001', materialCode: 'MAT-001', quantity: 1 }];
    renderBom(outputType);
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: 'edit' }));
    await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.submit(document.querySelector('#bomItemForm')!);
      useAuthStore.setState({ permissionTree: mode === 'inactive' ? permissionTree(false) : mode === 'unknown' ? null : [] });
    });
    expect(updateBomItem).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'edit' })).toBeDisabled();
  }, 30000);

  it('權限在開關點擊事件處理前撤銷時，handler 不得呼叫更新 API', async () => {
    setPermissions([updatePermission]);
    renderBom();
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeEnabled();
    act(() => {
      setPermissions([]);
      fireEvent.click(toggle);
    });
    expect(updateBom).not.toHaveBeenCalled();
  });

  it('即使有 Update，主檔編輯模式仍不能切換 BOM 或編輯配方', async () => {
    setPermissions([updatePermission]);
    const { container } = renderBom('P', false);
    await screen.findByText('BOM 表頭');
    expect(screen.getAllByRole('switch').every((toggle) => toggle.closest('form'))).toBe(true);
    expect(screen.queryByRole('button', { name: /編\s*輯$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /新增物料/ })).not.toBeInTheDocument();
    await act(async () => { fireEvent.submit(container.querySelector('#bomHeaderForm')!); });
    expect(updateBom).not.toHaveBeenCalled();
  });

  it.each(['P', 'M'] as const)('%s 啟用 BOM 可編輯表頭並新增、更新、刪除配方', async (outputType) => {
    setPermissions([updatePermission]);
    bom.isActive = true;
    bom.items = [{ code: 'ITEM-001', materialCode: 'MAT-001', quantity: 1 }];
    renderBom(outputType);
    await activeSwitch();
    expect(screen.getByRole('button', { name: /編\s*輯$/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'edit' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'delete' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /新增物料/ })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'edit' }));
    await screen.findByRole('dialog');
    await act(async () => { fireEvent.submit(document.querySelector('#bomItemForm')!); });
    await waitFor(() => expect(updateBomItem).toHaveBeenCalledExactlyOnceWith(outputType, 'OUTPUT-001', 'ITEM-001', {
      materialCode: 'MAT-001', quantity: 1, scrapPercentage: 0, width: undefined, specification: '', notes: '',
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /新增物料/ }));
    await screen.findByRole('dialog');
    fireEvent.mouseDown(document.querySelector('#materialCode')!);
    await userEvent.click(await screen.findByText('MAT-002 (新增原料)', { selector: '.ant-select-item-option-content' }));
    fireEvent.change(document.querySelector('#quantity')!, { target: { value: '2' } });
    await userEvent.click(await screen.findByRole('button', { name: 'OK' }));
    await waitFor(() => expect(createBomItem).toHaveBeenCalledExactlyOnceWith(outputType, 'OUTPUT-001', {
      materialCode: 'MAT-002', quantity: 2, scrapPercentage: 0, width: undefined, specification: '', notes: '',
    }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'delete' }));
    await screen.findByText('確定移除？此操作無法還原。');
    await userEvent.click(await screen.findByRole('button', { name: 'OK' }));
    await waitFor(() => expect(deleteBomItem).toHaveBeenCalledExactlyOnceWith(outputType, 'OUTPUT-001', 'ITEM-001'));
    expect(bom.isActive).toBe(true);
    expect(updateBom).not.toHaveBeenCalled();
  }, 30000);

  it('唯讀使用者不能編輯既有明細，但不將新增與刪除一併套用 Update 權限', async () => {
    bom.items = [{ code: 'ITEM-001', materialCode: 'MAT-001', quantity: 1 }];
    renderBom();
    await activeSwitch();
    const edit = screen.getByRole('button', { name: 'edit' });
    expect(edit).toBeDisabled();
    await userEvent.click(edit);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新增物料/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'delete' })).toBeEnabled();
  }, 30000);

  it('明細表單驗證期間撤銷 Update 時不送出更新，並關閉既有明細編輯', async () => {
    setPermissions([updatePermission]);
    bom.items = [{ code: 'ITEM-001', materialCode: 'MAT-001', quantity: 1 }];
    renderBom();
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: 'edit' }));
    await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.submit(document.querySelector('#bomItemForm')!);
      setPermissions([]);
    });
    expect(updateBomItem).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  }, 30000);

  it('編輯期間撤銷 Update 權限會結束表頭編輯且不能送出更新', async () => {
    setPermissions([updatePermission]);
    const onEditingChange = vi.fn();
    const { container } = renderBom('P', true, onEditingChange);
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    expect(screen.getByRole('button', { name: /儲\s*存$/ })).toBeInTheDocument();
    expect(onEditingChange).toHaveBeenLastCalledWith(true);
    act(() => setPermissions([]));
    expect(screen.queryByRole('button', { name: /儲\s*存$/ })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('原始備註')).toBeDisabled();
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
    await act(async () => { fireEvent.submit(container.querySelector('#bomHeaderForm')!); });
    expect(updateBom).not.toHaveBeenCalled();
    act(() => setPermissions([updatePermission]));
    expect(screen.queryByRole('button', { name: /儲\s*存$/ })).not.toBeInTheDocument();
  });

  it('切換到 BOM 時材料明細 Table 不應產生 scroll.x in virtual table must be number 警告', async () => {
    const errorSpy = vi.spyOn(console, 'error');
    const warnSpy = vi.spyOn(console, 'warn');
    bom.items = [{ code: 'ITEM-001', materialCode: 'MAT-001', quantity: 1 }];
    renderBom('P');
    await screen.findByText('材料明細');

    const allCalls = [...errorSpy.mock.calls, ...warnSpy.mock.calls].map((call) => call.join(' '));
    const virtualScrollWarning = allCalls.find((msg) =>
      msg.includes('`scroll.x` in virtual table must be number') ||
      msg.includes('scroll.x in virtual table must be number')
    );
    expect(virtualScrollWarning).toBeUndefined();
  });

  it('儲存 BOM 表頭時不應使用 antd 靜態 message 函數', async () => {
    const antdMessage = await import('antd').then((m) => m.message);
    const staticSuccessSpy = vi.spyOn(antdMessage, 'success');
    setPermissions([updatePermission]);
    renderBom();
    await activeSwitch();
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    await userEvent.click(screen.getByRole('button', { name: /儲\s*存$/ }));
    await waitFor(() => expect(updateBom).toHaveBeenCalled());

    expect(staticSuccessSpy).not.toHaveBeenCalled();
  });

  it('點擊編輯按鈕時只應進入編輯模式，不得觸發表頭更新送出或立即切回檢視模式', async () => {
    setPermissions([updatePermission]);
    renderBom();
    await activeSwitch();
    const editBtn = screen.getByRole('button', { name: /編\s*輯$/ });
    await userEvent.click(editBtn);

    expect(screen.getByRole('button', { name: /儲\s*存$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取\s*消$/ })).toBeInTheDocument();
    expect(updateBom).not.toHaveBeenCalled();
  });

  it('編輯 BOM 表頭時，明細的「新增物料」按鈕應為 disabled 狀態，結束編輯後恢復 enabled', async () => {
    setPermissions([updatePermission]);
    renderBom();
    await activeSwitch();
    const addBtn = screen.getByRole('button', { name: /新增物料/ });
    expect(addBtn).toBeEnabled();

    // 點擊「編輯」進入表頭編輯模式
    await userEvent.click(screen.getByRole('button', { name: /編\s*輯$/ }));
    expect(screen.getByRole('button', { name: /儲\s*存$/ })).toBeInTheDocument();
    expect(addBtn).toBeDisabled();

    // 點擊「取消」結束表頭編輯模式
    await userEvent.click(screen.getByRole('button', { name: /取\s*消$/ }));
    expect(screen.queryByRole('button', { name: /儲\s*存$/ })).not.toBeInTheDocument();
    expect(addBtn).toBeEnabled();
  });
});
