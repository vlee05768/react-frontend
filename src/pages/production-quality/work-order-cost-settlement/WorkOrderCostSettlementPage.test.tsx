import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
import { WorkOrderCostSettlementPage } from './WorkOrderCostSettlementPage';
import * as settlementApi from '@/api/workOrderCostSettlementApi';
import * as sdk from '@/api/generated/sdk.gen';
import { useAuthStore } from '@/stores/useAuthStore';

vi.mock('@/api/workOrderCostSettlementApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/workOrderCostSettlementApi')>();
  return {
    ...actual,
    previewWorkOrderCostSettlement: vi.fn(),
    executeWorkOrderCostSettlement: vi.fn(),
  };
});

vi.mock('@/api/generated/sdk.gen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/generated/sdk.gen')>();
  return {
    ...actual,
    getApiV1Product: vi.fn(),
    getApiV1Material: vi.fn(),
  };
});

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <App>
          <WorkOrderCostSettlementPage />
        </App>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const mockPreviewResult: settlementApi.WorkOrderCostSettlementResultDto = {
  isPreview: true,
  recentCostWindowDays: 30,
  settledCount: 2,
  skippedCount: 1,
  upstreamTracedCount: 1,
  downstreamSyncedCount: 1,
  updatedProductCount: 1,
  settledItems: [
    {
      workOrderNumber: 'WO-20261123-001',
      workOrderType: 'STANDARD',
      outputType: 'P',
      outputCode: 'PROD-001',
      outputName: '測試成品',
      materialForm: null,
      warehousingCompleteDate: '2026-11-23T08:00:00Z',
      goodQuantity: 100,
      isAllScrapped: false,
      previousActualMaterialCost: 1000,
      actualMaterialCost: 1200,
      previousUnitMaterialCost: 10,
      unitMaterialCost: 12,
      costPerSqm: null,
      costPerPiece: null,
      isUpstreamTraced: true,
      isDownstreamSynced: false,
    },
    {
      workOrderNumber: 'WO-20261123-002',
      workOrderType: 'STANDARD',
      outputType: 'M',
      outputCode: 'TF-8015-0.15-R',
      outputName: '測試半成品',
      materialForm: 'R',
      warehousingCompleteDate: '2026-11-23T09:00:00Z',
      goodQuantity: 0,
      isAllScrapped: true,
      previousActualMaterialCost: 500,
      actualMaterialCost: 500,
      previousUnitMaterialCost: 0,
      unitMaterialCost: 0,
      costPerSqm: null,
      costPerPiece: null,
      isUpstreamTraced: false,
      isDownstreamSynced: true,
    },
  ],
  skippedItems: [
    {
      workOrderNumber: 'WO-20261123-003',
      workOrderType: 'STANDARD',
      outputType: 'P',
      outputCode: 'PROD-002',
      outputName: '異常成品',
      warehousingCompleteDate: '2026-11-23T10:00:00Z',
      reasonCode: 'PENDING_WIP_ROLLS',
      reasonMessage: '尚有 2 卷 WIP 捲卡未退料',
    },
  ],
  updatedProducts: [
    {
      productCode: 'PROD-001',
      productName: '測試成品',
      previousUnitCost: 10.5,
      updatedUnitCost: 12,
      windowGoodQuantity: 100,
      windowTotalMaterialCost: 1200,
    },
  ],
};

describe('WorkOrderCostSettlementPage 製令成本結算頁', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { userName: 'cost-user', roles: [], permissions: ['ProductionQuality.WorkOrders.CostSettlement'] } });
    vi.mocked(sdk.getApiV1Product).mockResolvedValue({
      data: { data: { data: [{ code: 'PROD-001', name: '測試成品' }] } },
    } as any);
    vi.mocked(sdk.getApiV1Material).mockResolvedValue({
      data: { data: { data: [{ code: 'TF-8015-0.15-R', name: '測試半成品' }] } },
    } as any);
  });

  it('缺少結算權限時阻擋頁面且不呼叫預覽或重算', async () => {
    useAuthStore.setState({ user: { userName: 'readonly', roles: [], permissions: [] } });
    renderPage();
    expect(await screen.findByText('無權限存取製令成本結算')).toBeTruthy();
    expect(settlementApi.previewWorkOrderCostSettlement).not.toHaveBeenCalled();
    expect(settlementApi.executeWorkOrderCostSettlement).not.toHaveBeenCalled();
  });

  it('期間與產出目標皆空時，點擊預覽檢核應阻擋並顯示警告提示', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /預覽檢核/ }));

    expect(
      (await screen.findAllByText('請至少指定「入庫完成日期區間」或「產出類別／產出品號」其中一項篩選條件。')).length,
    ).toBeGreaterThan(0);
    expect(settlementApi.previewWorkOrderCostSettlement).not.toHaveBeenCalled();
  });

  it('選擇產出類別 P 查詢 pageSize: -1 並完成預覽與執行成本結算渲染', async () => {
    vi.mocked(settlementApi.previewWorkOrderCostSettlement).mockResolvedValue(mockPreviewResult);
    vi.mocked(settlementApi.executeWorkOrderCostSettlement).mockResolvedValue({
      ...mockPreviewResult,
      isPreview: false,
    });

    renderPage();

    // 選擇產出類別 P
    const typeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.mouseDown(typeSelect);
    const optionP = await screen.findByText('成品 (P)');
    fireEvent.click(optionP);

    await waitFor(() => {
      expect(sdk.getApiV1Product).toHaveBeenCalledWith({ query: { pageSize: -1 } });
    });

    // 點擊預覽檢核
    fireEvent.click(screen.getByRole('button', { name: /預覽檢核/ }));

    await waitFor(() => {
      expect(settlementApi.previewWorkOrderCostSettlement).toHaveBeenCalledWith({
        startDate: null,
        endDate: null,
        outputType: 'P',
        outputCode: null,
        workOrderNumbers: null,
      });
    });

    expect(await screen.findByText('預覽檢核結果（尚未寫入）')).toBeTruthy();
    expect(screen.getByText('WO-20261123-001')).toBeTruthy();
    expect(screen.getByText('前階溯源')).toBeTruthy();
    expect(screen.getByText('下階同步')).toBeTruthy();
    expect(screen.getAllByText('全數報廢').length).toBeGreaterThan(0);

    // 切換至異常清單分頁
    fireEvent.click(screen.getByRole('tab', { name: /未完單據異常提醒 \(1\)/ }));
    expect(await screen.findByText('尚有 2 卷 WIP 捲卡未退料')).toBeTruthy();

    // 切換至成品主檔成本更新分頁
    fireEvent.click(screen.getByRole('tab', { name: /成品主檔成本更新 \(1\)/ }));
    expect((await screen.findAllByText('PROD-001')).length).toBeGreaterThan(0);

    // 點擊執行成本結算並確認
    fireEvent.click(screen.getByRole('button', { name: /執行成本結算/ }));
    const confirmBtn = await screen.findByRole('button', { name: '確認執行' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(settlementApi.executeWorkOrderCostSettlement).toHaveBeenCalledWith({
        startDate: null,
        endDate: null,
        outputType: 'P',
        outputCode: null,
        workOrderNumbers: null,
      });
    });
    expect(await screen.findByText('已完成成本結算')).toBeTruthy();
  });
});
