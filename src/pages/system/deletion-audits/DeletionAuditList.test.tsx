import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import DeletionAuditList from './DeletionAuditList';
import { useDeletionAuditQueryStore } from '@/stores/systemStore';
import type { DeletionAuditDto, ApiResponse, PagedResult } from '@/api/deletionAudits';

const { mockGetDeletionAudits, mockHasPermission } = vi.hoisted(() => ({
  mockGetDeletionAudits: vi.fn(),
  mockHasPermission: vi.fn(),
}));

vi.mock('@/api/deletionAudits', async () => {
  const actual = await vi.importActual<typeof import('@/api/deletionAudits')>('@/api/deletionAudits');
  return {
    ...actual,
    getDeletionAudits: mockGetDeletionAudits,
  };
});

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    hasPermission: mockHasPermission,
  }),
}));

describe('DeletionAuditList', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
  });

  const sampleItems: DeletionAuditDto[] = [
    {
      id: 1,
      eventId: 'evt-001',
      eventVersion: 1,
      occurredAtUtc: '2026-11-22T04:00:00.000Z',
      eventType: 'Material.Delete',
      outcome: 'Success',
      actorUserId: 10,
      actorName: '張管理員',
      entityType: 'Material',
      entityCode: 'MAT-3M-001',
      deletionMode: 'HardDelete',
      relatedDocumentCode: null,
      detailLineNumber: null,
      correlationId: 'corr-001',
      transactionId: 'tx-001',
      source: 'AdminPortal',
      beforeSnapshotJson: JSON.stringify({ materialCode: 'MAT-3M-001', price: 100 }),
      failureReason: null,
    },
    {
      id: 2,
      eventId: 'evt-002',
      eventVersion: 1,
      occurredAtUtc: '2026-11-22T06:30:00.000Z',
      eventType: 'Order.Delete',
      outcome: 'Failed',
      actorUserId: null,
      actorName: 'SYSTEM',
      entityType: 'Order',
      entityCode: 'SO-2026-999',
      deletionMode: 'SoftDelete',
      relatedDocumentCode: 'PO-REL-01',
      detailLineNumber: '3',
      correlationId: 'corr-002',
      transactionId: null,
      source: 'WorkerService',
      beforeSnapshotJson: 'raw text snapshot',
      failureReason: '單據正在處理中，不可刪除',
    },
  ];

  const mockSuccessResponse: ApiResponse<PagedResult<DeletionAuditDto>> = {
    success: true,
    message: '查詢成功',
    data: {
      pageNumber: 1,
      pageSize: 20,
      totalPages: 1,
      totalRecords: 2,
      data: sampleItems,
    },
  };

  afterEach(() => {
    vi.clearAllMocks();
    useDeletionAuditQueryStore.getState().resetParams();
  });

  const renderWithProviders = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <App>
            <DeletionAuditList />
          </App>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('無 audit:read 權限時應顯示 403 警告且不發出查詢請求', () => {
    mockHasPermission.mockReturnValue(false);

    renderWithProviders();

    expect(screen.getByTestId('no-permission-warning')).toBeInTheDocument();
    expect(screen.getByText(/需要 audit:read 權限/i)).toBeInTheDocument();
    expect(mockGetDeletionAudits).not.toHaveBeenCalled();
  });

  it('擁有 audit:read 權限時應渲染刪除稽核列表與台北時間 (UTC+8)', async () => {
    mockHasPermission.mockReturnValue(true);
    mockGetDeletionAudits.mockResolvedValue(mockSuccessResponse);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('MAT-3M-001')).toBeInTheDocument();
    });

    expect(screen.getByText('刪除稽核查詢')).toBeInTheDocument();
    expect(screen.getByText('SO-2026-999')).toBeInTheDocument();

    // 檢查台北時間 (2026-11-22 04:00 UTC -> 12:00 UTC+8)
    expect(screen.getByText('2026-11-22 12:00:00 (UTC+8)')).toBeInTheDocument();
    // (2026-11-22 06:30 UTC -> 14:30 UTC+8)
    expect(screen.getByText('2026-11-22 14:30:00 (UTC+8)')).toBeInTheDocument();

    // 檢查 Tag 顯示
    expect(screen.getByText('實體刪除')).toBeInTheDocument();
    expect(screen.getByText('軟刪除')).toBeInTheDocument();
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('失敗')).toBeInTheDocument();
  });

  it('點擊操作欄「檢視快照」按鈕應彈出快照 Modal 並顯示詳細資訊', async () => {
    const user = userEvent.setup();
    mockHasPermission.mockReturnValue(true);
    mockGetDeletionAudits.mockResolvedValue(mockSuccessResponse);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText('MAT-3M-001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /檢視快照/i });
    expect(viewButtons.length).toBeGreaterThan(0);

    await user.click(viewButtons[0]);

    // Modal 應該被開啟
    expect(screen.getByText('刪除稽核快照與關聯資訊')).toBeInTheDocument();
    expect(screen.getAllByText('MAT-3M-001').length).toBeGreaterThan(1);
    expect(screen.getAllByText('corr-001').length).toBeGreaterThan(1);
  });

  it('點擊「進階查詢」可開啟查詢條件 Modal', async () => {
    const user = userEvent.setup();
    mockHasPermission.mockReturnValue(true);
    mockGetDeletionAudits.mockResolvedValue(mockSuccessResponse);

    renderWithProviders();

    const searchBtn = screen.getByRole('button', { name: /進階查詢/i });
    await user.click(searchBtn);

    expect(screen.getByText('查詢條件設定')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /執行查詢/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /清除條件/i })).toBeInTheDocument();
  });
});
