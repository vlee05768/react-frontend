import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { App } from 'antd';
import { SnapshotModal } from './SnapshotModal';
import type { DeletionAuditDto } from '@/api/deletionAudits';

describe('SnapshotModal', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const sampleRecord: DeletionAuditDto = {
    id: 101,
    eventId: 'c0a80101-0000-0000-0000-000000000001',
    eventVersion: 1,
    occurredAtUtc: '2026-11-22T04:30:00.000Z',
    eventType: 'Order.Delete',
    outcome: 'Success',
    actorUserId: 12,
    actorName: '王小明',
    entityType: 'Order',
    entityCode: 'SO-20261122-001',
    deletionMode: 'HardDelete',
    relatedDocumentCode: 'PO-2026-999',
    detailLineNumber: '1',
    correlationId: 'corr-xyz-12345',
    transactionId: 'b0a80101-0000-0000-0000-000000000002',
    source: 'WebApi',
    beforeSnapshotJson: JSON.stringify({
      orderNumber: 'SO-20261122-001',
      totalAmount: 50000,
      customerCode: 'CUST-001',
    }),
    failureReason: null,
  };

  it('有效 JSON 快照應自動格式化排版顯示', () => {
    render(
      <App>
        <SnapshotModal open={true} record={sampleRecord} onClose={() => undefined} />
      </App>
    );

    expect(screen.getByText('刪除稽核快照與關聯資訊')).toBeInTheDocument();
    expect(screen.getByText('SO-20261122-001')).toBeInTheDocument();
    expect(screen.getByText('實體刪除')).toBeInTheDocument();
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('corr-xyz-12345')).toBeInTheDocument();

    const snapshotEl = screen.getByTestId('snapshot-content');
    expect(snapshotEl.textContent).toContain('"orderNumber": "SO-20261122-001"');
    expect(snapshotEl.textContent).toContain('"totalAmount": 50000');
  });

  it('非有效 JSON 快照應原樣以純文字安全顯示，不拋出錯誤', () => {
    const rawRecord: DeletionAuditDto = {
      ...sampleRecord,
      beforeSnapshotJson: 'Malformed JSON: { missing quote }',
    };

    render(
      <App>
        <SnapshotModal open={true} record={rawRecord} onClose={() => undefined} />
      </App>
    );

    const snapshotEl = screen.getByTestId('snapshot-content');
    expect(snapshotEl.textContent).toBe('Malformed JSON: { missing quote }');
  });

  it('無快照資料時應顯示友善提示', () => {
    const emptyRecord: DeletionAuditDto = {
      ...sampleRecord,
      beforeSnapshotJson: null,
    };

    render(
      <App>
        <SnapshotModal open={true} record={emptyRecord} onClose={() => undefined} />
      </App>
    );

    expect(screen.getByTestId('snapshot-empty')).toBeInTheDocument();
    expect(screen.getByText('無刪除前業務快照資料')).toBeInTheDocument();
  });

  it('若有失敗原因應顯示失敗 Alert 提示', () => {
    const failedRecord: DeletionAuditDto = {
      ...sampleRecord,
      outcome: 'Failed',
      failureReason: '單據已過帳，業務規則禁止刪除',
    };

    render(
      <App>
        <SnapshotModal open={true} record={failedRecord} onClose={() => undefined} />
      </App>
    );

    expect(screen.getByText('刪除操作失敗原因')).toBeInTheDocument();
    expect(screen.getByText('單據已過帳，業務規則禁止刪除')).toBeInTheDocument();
  });

  it('點擊關閉按鈕應呼叫 onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <App>
        <SnapshotModal open={true} record={sampleRecord} onClose={onClose} />
      </App>
    );

    const closeBtn = screen.getByRole('button', { name: /關閉/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
