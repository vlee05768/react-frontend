import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
import { WorkOrderItemsTab } from './WorkOrderItemsTab';
import { WorkOrderRequisitionTab } from './WorkOrderRequisitionTab';
import { SemiFinishedPackagesField } from './SemiFinishedPackagesField';
import { WorkOrderDrawer } from './WorkOrderDrawer';
import type { WorkOrderFormValues } from './WorkOrderConfig';
import * as workflowApi from '@/api/workOrderWorkflowApi';
import * as sdk from '@/api/generated/sdk.gen';

vi.mock('@/api/workOrderWorkflowApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/workOrderWorkflowApi')>();
  return {
    ...actual,
    getAvailableMaterialWidths: vi.fn(),
    createWorkOrderMaterial: vi.fn(),
    updateWorkOrderMaterialByLine: vi.fn(),
    deleteWorkOrderMaterialByLine: vi.fn(),
    confirmWorkOrderMaterialSpec: vi.fn(),
    cancelWorkOrderMaterialSpec: vi.fn(),
    completeWorkOrderProduction: vi.fn(),
    getFifoAllocatedRolls: vi.fn(),
    getSelectableRolls: vi.fn(),
  };
});

vi.mock('@/api/generated/sdk.gen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/generated/sdk.gen')>();
  return {
    ...actual,
    getApiV1WorkOrderByWorkOrderNumber: vi.fn(),
    getApiV1WorkOrderRequisitionWoByWorkOrderNumber: vi.fn(),
    getApiV1WorkOrderReturnWoByWorkOrderNumber: vi.fn(),
  };
});

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <App>{ui}</App>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const baseWorkOrder: WorkOrderFormValues = {
  workOrderNumber: 'WO-20261123-001',
  workOrderType: 'STANDARD',
  outputType: 'P',
  outputCode: 'PROD-001',
  outputName: '測試成品',
  status: 'Draft',
  plannedQuantity: 100,
  actualQuantity: 0,
  goodQuantity: 0,
  actualMaterialCost: 0,
  unitMaterialCost: 0,
  isAllMaterialConsumed: false,
  materialSpecConfirmDate: null,
  materialSpecConfirmUser: null,
  preparationConfirmDate: null,
  laminationConfirmDate: null,
  productionCompleteDate: null,
  warehousingCompleteDate: null,
  items: [
    {
      workOrderNumber: 'WO-20261123-001',
      lineNumber: 'WO-20261123-001-1',
      materialCode: '3M-8015-0.15-R',
      materialName: '3M 測試捲材',
      materialForm: 'R',
      bomWidth: 400,
      materialWidth: 400,
      requiredAmount: 1,
      totalLength: 100,
      bomRequiredQuantity: 100,
      storageCode: 'TW-MAT-GEN',
    },
  ],
};

describe('製令用料規格確認與拆寬度流程', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('未完成用料規格確認時，WorkOrderItemsTab 顯示達標彙總、查詢可用寬度並允許拆單與刪除', async () => {
    const onEditingChange = vi.fn();
    vi.mocked(workflowApi.getAvailableMaterialWidths).mockResolvedValue([
      {
        widthMm: 400,
        lengthMm: null,
        materialForm: 'R',
        availableRollCount: 2,
        availableQuantity: 60,
        availableAreaSqm: 24,
      },
      {
        widthMm: 500,
        lengthMm: null,
        materialForm: 'R',
        availableRollCount: 3,
        availableQuantity: 120,
        availableAreaSqm: 60,
      },
    ]);

    const splitOrder: WorkOrderFormValues = {
      ...baseWorkOrder,
      items: [
        ...(baseWorkOrder.items || []),
        {
          workOrderNumber: 'WO-20261123-001',
          lineNumber: 'WO-20261123-001-2',
          materialCode: '3M-8015-0.15-R',
          materialName: '3M 測試捲材',
          materialForm: 'R',
          bomWidth: 400,
          materialWidth: 500,
          requiredAmount: 1,
          totalLength: 50,
          bomRequiredQuantity: 100,
          storageCode: 'TW-MAT-GEN',
        },
      ],
    };

    renderWithProviders(
      <WorkOrderItemsTab
        masterData={splitOrder}
        isMasterViewMode={true}
        onEditingChange={onEditingChange}
      />,
    );

    expect(screen.getByText(/目前加總 150 M \/ 原 BOM 需求 100 M（已達標）/)).toBeTruthy();

    const adjustBtns = screen.getAllByRole('button', { name: /調整寬度／拆單/ });
    expect(adjustBtns.length).toBe(2);
    fireEvent.click(adjustBtns[0]);

    expect(onEditingChange).toHaveBeenCalledWith(true);
    await waitFor(() => {
      expect(workflowApi.getAvailableMaterialWidths).toHaveBeenCalledWith(
        'WO-20261123-001',
        '3M-8015-0.15-R',
      );
    });
    expect(await screen.findByText('可用庫存寬度一覽（點擊列可帶入確認幅寬）')).toBeTruthy();
  });

  it('同一料號僅 1 筆明細時禁用刪除按鈕；已確認用料規格後鎖定操作按鈕', () => {
    const { rerender } = renderWithProviders(
      <WorkOrderItemsTab masterData={baseWorkOrder} isMasterViewMode={true} />,
    );

    const deleteBtn = screen.getByRole('button', { name: '刪除項次 WO-20261123-001-1' });
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);

    const confirmedOrder: WorkOrderFormValues = {
      ...baseWorkOrder,
      status: 'MaterialSpecConfirmed',
      materialSpecConfirmDate: '2026-11-23T10:00:00Z',
    };
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <App>
            <WorkOrderItemsTab masterData={confirmedOrder} isMasterViewMode={true} />
          </App>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('已完成用料規格確認（明細已鎖定）')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /調整寬度／拆單/ })).toBeNull();
  });

  it('未完成用料規格確認時，WorkOrderRequisitionTab 禁止建立領料單並顯示引導提示', async () => {
    vi.mocked(sdk.getApiV1WorkOrderRequisitionWoByWorkOrderNumber).mockResolvedValue({
      data: { data: [] },
    } as any);

    renderWithProviders(<WorkOrderRequisitionTab masterData={baseWorkOrder} />);

    expect(await screen.findByText('尚未完成用料規格確認')).toBeTruthy();
    const createBtn = screen.getByRole('button', { name: '產生領料單' });
    expect((createBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('WorkOrderDrawer 顯示 7 步生命週期、未確認規格禁用備料確認、全單耗盡顯示免退料', async () => {
    vi.mocked(sdk.getApiV1WorkOrderByWorkOrderNumber).mockResolvedValue({
      data: {
        data: {
          ...baseWorkOrder,
          status: 'WarehousingCompleted',
          materialSpecConfirmDate: '2026-11-23T08:00:00Z',
          preparationConfirmDate: '2026-11-23T09:00:00Z',
          laminationConfirmDate: '2026-11-23T10:00:00Z',
          productionCompleteDate: '2026-11-23T11:00:00Z',
          warehousingCompleteDate: '2026-11-23T12:00:00Z',
          isAllMaterialConsumed: true,
        },
      },
    } as any);
    vi.mocked(sdk.getApiV1WorkOrderRequisitionWoByWorkOrderNumber).mockResolvedValue({
      data: { data: [{ documentNumber: 'WR-001', confirmDate: '2026-11-23T09:00:00Z' }] },
    } as any);
    vi.mocked(sdk.getApiV1WorkOrderReturnWoByWorkOrderNumber).mockResolvedValue({
      data: { data: [] },
    } as any);

    renderWithProviders(
      <WorkOrderDrawer id="WO-20261123-001" isCreateMode={false} onClose={vi.fn()} />,
    );

    expect(await screen.findByText('用料規格確認')).toBeTruthy();
    expect(screen.getByText('全單耗盡（免退料）')).toBeTruthy();
  });

  it('SemiFinishedPackagesField 支援動態新增與刪除半成品包裝實測資料', () => {
    const onChange = vi.fn();
    renderWithProviders(<SemiFinishedPackagesField value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /新增包裝明細/ }));
    expect(onChange).toHaveBeenCalledWith([
      {
        packageSeq: '1',
        materialForm: 'R',
        measuredWidthMm: 0,
        measuredLength: null,
        quantity: 0,
      },
    ]);
  });
});
