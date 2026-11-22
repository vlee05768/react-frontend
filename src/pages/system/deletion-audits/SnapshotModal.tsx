import React, { useMemo } from 'react';
import { Modal, Descriptions, Button, Alert, App } from 'antd';
import { CopyOutlined, CloseOutlined } from '@ant-design/icons';
import type { DeletionAuditDto } from '@/api/deletionAudits';
import { formatTaipeiDateTime, getDeletionModeTag, getOutcomeTag } from './DeletionAuditConfig';

interface SnapshotModalProps {
  open: boolean;
  record: DeletionAuditDto | null;
  onClose: () => void;
}

export function SnapshotModal({ open, record, onClose }: SnapshotModalProps): React.ReactElement {
  const { message } = App.useApp();

  const { formattedSnapshot, isJson } = useMemo(() => {
    if (!record?.beforeSnapshotJson) {
      return { formattedSnapshot: '', isJson: false };
    }
    try {
      const parsed = JSON.parse(record.beforeSnapshotJson);
      return {
        formattedSnapshot: JSON.stringify(parsed, null, 2),
        isJson: true,
      };
    } catch {
      return {
        formattedSnapshot: record.beforeSnapshotJson,
        isJson: false,
      };
    }
  }, [record?.beforeSnapshotJson]);

  const handleCopySnapshot = () => {
    if (!formattedSnapshot) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(formattedSnapshot).then(() => {
        message.success('已複製刪除前快照至剪貼簿');
      }).catch(() => {
        message.warning('剪貼簿存取受限，請手動選取複製');
      });
    }
  };

  const handleCopyText = (text?: string | null, label = '內容') => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        message.success(`已複製 ${label}`);
      }).catch(() => {
        message.warning('剪貼簿存取受限，請手動選取複製');
      });
    }
  };

  const descriptionItems = useMemo(() => {
    if (!record) return [];
    return [
      {
        key: 'occurredAtUtc',
        label: '發生時間',
        children: formatTaipeiDateTime(record.occurredAtUtc),
      },
      {
        key: 'outcome',
        label: '操作結果',
        children: getOutcomeTag(record.outcome),
      },
      {
        key: 'entityType',
        label: '資料類型',
        children: record.entityType || '-',
      },
      {
        key: 'entityCode',
        label: '單號／識別碼',
        children: (
          <span className="font-mono font-medium">
            {record.entityCode || '-'}
          </span>
        ),
      },
      {
        key: 'deletionMode',
        label: '刪除模式',
        children: getDeletionModeTag(record.deletionMode),
      },
      {
        key: 'actor',
        label: '操作者',
        children: record.actorName || (record.actorUserId ? `User #${record.actorUserId}` : 'SYSTEM'),
      },
      {
        key: 'relatedDoc',
        label: '上層單據號',
        children: record.relatedDocumentCode ? (
          <span className="font-mono">{record.relatedDocumentCode}</span>
        ) : '-',
      },
      {
        key: 'detailLine',
        label: '明細行號',
        children: record.detailLineNumber || '-',
      },
      {
        key: 'source',
        label: '事件來源',
        children: record.source || '-',
      },
      {
        key: 'correlationId',
        label: '關聯識別碼 (CorrelationId)',
        span: 3,
        children: (
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs break-all">{record.correlationId || '-'}</span>
            {record.correlationId && (
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopyText(record.correlationId, 'CorrelationId')}
              />
            )}
          </div>
        ),
      },
      {
        key: 'transactionId',
        label: '交易識別碼 (TransactionId)',
        span: 3,
        children: (
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs break-all">{record.transactionId || '-'}</span>
            {record.transactionId && (
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopyText(record.transactionId, 'TransactionId')}
              />
            )}
          </div>
        ),
      },
      {
        key: 'eventId',
        label: '事件識別碼 (EventId)',
        span: 3,
        children: (
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs break-all">{record.eventId || '-'}</span>
            {record.eventId && (
              <Button
                size="small"
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCopyText(record.eventId, 'EventId')}
              />
            )}
          </div>
        ),
      },
    ];
  }, [record]);

  return (
    <Modal
      title={
        <div className="font-semibold text-lg pb-2 border-b border-[var(--ant-color-border-secondary)]">
          刪除稽核快照與關聯資訊
        </div>
      }
      open={open}
      onCancel={onClose}
      width={780}
      footer={
        <div className="pt-2 flex justify-end">
          <Button icon={<CloseOutlined />} onClick={onClose}>
            關閉
          </Button>
        </div>
      }
      styles={{
        body: {
          maxHeight: '72vh',
          overflowY: 'auto',
          padding: '16px 20px',
        },
      }}
    >
      {record && (
        <div className="flex flex-col gap-4">
          {record.failureReason && (
            <Alert
              type="error"
              showIcon
              title="刪除操作失敗原因"
              description={record.failureReason}
            />
          )}

          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
            items={descriptionItems}
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-[14px] text-[var(--ant-color-text)]">
                刪除前業務資料快照 (BeforeSnapshotJson)
                {isJson && (
                  <span className="ml-2 font-normal text-xs text-[var(--ant-color-text-tertiary)]">
                    (已格式化 JSON)
                  </span>
                )}
              </span>
              {formattedSnapshot && (
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={handleCopySnapshot}
                >
                  複製快照
                </Button>
              )}
            </div>

            {formattedSnapshot ? (
              <pre
                data-testid="snapshot-content"
                className="p-3 rounded bg-[var(--ant-color-fill-quaternary)] text-[var(--ant-color-text)] font-mono text-xs overflow-auto max-h-[320px] border border-[var(--ant-color-border-secondary)] whitespace-pre-wrap break-all leading-relaxed"
              >
                {formattedSnapshot}
              </pre>
            ) : (
              <div
                data-testid="snapshot-empty"
                className="p-6 text-center text-[var(--ant-color-text-quaternary)] bg-[var(--ant-color-fill-quaternary)] rounded border border-[var(--ant-color-border-secondary)] text-sm"
              >
                無刪除前業務快照資料
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
