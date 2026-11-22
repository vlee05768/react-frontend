import type { SearchFieldConfig, TableColumnConfig } from '@/components/Form/types';
import type { DeletionAuditDto } from '@/api/deletionAudits';
import { Tag, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';

/**
 * 將 ISO UTC 時間安全格式化為台北時間（UTC+8）字串
 * 格式：YYYY-MM-DD HH:mm:ss (UTC+8)
 */
export function formatTaipeiDateTime(utcDateStr?: string | null): string {
  if (!utcDateStr) return '-';
  const d = new Date(utcDateStr);
  if (isNaN(d.getTime())) return '-';
  const utcMs = d.getTime();
  const taipeiDate = new Date(utcMs + 8 * 60 * 60 * 1000);
  const year = taipeiDate.getUTCFullYear();
  const month = String(taipeiDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(taipeiDate.getUTCDate()).padStart(2, '0');
  const hours = String(taipeiDate.getUTCHours()).padStart(2, '0');
  const minutes = String(taipeiDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(taipeiDate.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} (UTC+8)`;
}

export function getDeletionModeTag(mode?: string | null) {
  if (!mode) return <span className="inline-block leading-[24px] align-middle w-full text-center">-</span>;
  if (mode === 'HardDelete') {
    return <Tag color="error" className="m-0">實體刪除</Tag>;
  }
  if (mode === 'SoftDelete') {
    return <Tag color="warning" className="m-0">軟刪除</Tag>;
  }
  return <Tag className="m-0">{mode}</Tag>;
}

export function getOutcomeTag(outcome?: string | null) {
  if (!outcome) return <span className="inline-block leading-[24px] align-middle w-full text-center">-</span>;
  if (outcome === 'Success' || outcome === '成功') {
    return <Tag color="success" className="m-0">成功</Tag>;
  }
  if (outcome === 'Failed' || outcome === '失敗') {
    return <Tag color="error" className="m-0">失敗</Tag>;
  }
  return <Tag className="m-0">{outcome}</Tag>;
}

export function deletionAuditTableColumns(): TableColumnConfig[] {
  return [
    {
      label: '發生時間 (UTC+8)',
      name: 'occurredAtUtc',
      width: 195,
      align: 'center',
      sortable: { multiple: 1 },
      render: (val: string) => (
        <span className="inline-block leading-[24px] align-middle w-full text-center font-mono">
          {formatTaipeiDateTime(val)}
        </span>
      ),
    },
    {
      label: '資料類型',
      name: 'entityType',
      width: 140,
      sortable: { multiple: 2 },
      render: (val: string) => (
        <span className="inline-block leading-[24px] align-middle w-full text-left font-medium">
          {val || '-'}
        </span>
      ),
    },
    {
      label: '單號／識別碼',
      name: 'entityCode',
      width: 160,
      sortable: { multiple: 3 },
      render: (val: string) => (
        <span className="inline-block leading-[24px] align-middle w-full text-left font-mono">
          {val || '-'}
        </span>
      ),
    },
    {
      label: '刪除模式',
      name: 'deletionMode',
      width: 110,
      align: 'center',
      sortable: { multiple: 4 },
      render: (val: string) => (
        <div className="inline-flex items-center h-[24px] align-middle">
          {getDeletionModeTag(val)}
        </div>
      ),
    },
    {
      label: '操作結果',
      name: 'outcome',
      width: 100,
      align: 'center',
      sortable: { multiple: 5 },
      render: (val: string) => (
        <div className="inline-flex items-center h-[24px] align-middle">
          {getOutcomeTag(val)}
        </div>
      ),
    },
    {
      label: '操作者',
      name: 'actorName',
      width: 130,
      render: (val: string, record: any) => {
        const displayName = val || (record.actorUserId ? `User #${record.actorUserId}` : '-');
        return (
          <span className="inline-block leading-[24px] align-middle w-full text-left">
            {displayName}
          </span>
        );
      },
    },
    {
      label: '上層單據編號',
      name: 'relatedDocumentCode',
      width: 150,
      render: (val: string) => (
        <span className="inline-block leading-[24px] align-middle w-full text-left font-mono">
          {val || '-'}
        </span>
      ),
    },
    {
      label: '明細行號',
      name: 'detailLineNumber',
      width: 90,
      align: 'center',
      render: (val: string) => (
        <span className="inline-block leading-[24px] align-middle w-full text-center font-mono">
          {val || '-'}
        </span>
      ),
    },
    {
      label: '事件類型',
      name: 'eventType',
      width: 160,
      render: (val: string) => (
        <span className="inline-block leading-[24px] align-middle w-full text-left font-mono">
          {val || '-'}
        </span>
      ),
    },
    {
      label: '來源',
      name: 'source',
      width: 100,
      align: 'center',
      render: (val: string) => (
        <span className="inline-block leading-[24px] align-middle w-full text-center">
          {val || '-'}
        </span>
      ),
    },
    {
      label: '關聯識別碼',
      name: 'correlationId',
      width: 180,
      render: (val: string) => (
        <span className="inline-block leading-[24px] align-middle w-full text-left font-mono text-xs text-[var(--ant-color-text-secondary)]">
          {val || '-'}
        </span>
      ),
    },
  ];
}

export function buildActionColumn(onViewSnapshot: (record: DeletionAuditDto) => void) {
  return {
    title: '操作',
    key: 'actions',
    fixed: 'left' as const,
    width: 120,
    align: 'center' as const,
    render: (_: unknown, record: DeletionAuditDto) => (
      <div className="inline-flex items-center h-[24px] align-middle">
        <Button
          type="primary"
          ghost
          size="small"
          className="m-0"
          icon={<EyeOutlined />}
          onClick={() => onViewSnapshot(record)}
        >
          檢視快照
        </Button>
      </div>
    ),
  };
}

export function deletionAuditSearchConfig(): SearchFieldConfig[] {
  return [
    {
      name: 'dateRange',
      label: '發生時間區間',
      componentType: 'DateRangePicker',
      colSpan: 2,
    },
    {
      name: 'actor',
      label: '操作者',
      componentType: 'Input',
      componentProps: { placeholder: '請輸入操作者帳號、姓名或 SYSTEM' },
      colSpan: 2,
    },
    {
      name: 'entityType',
      label: '資料類型',
      componentType: 'Input',
      componentProps: { placeholder: '例如 Order, Material, User...' },
      colSpan: 2,
    },
    {
      name: 'entityCode',
      label: '單號／識別碼',
      componentType: 'Input',
      componentProps: { placeholder: '請輸入單號或識別碼' },
      colSpan: 2,
    },
    {
      name: 'relatedDocumentCode',
      label: '上層單據號',
      componentType: 'Input',
      componentProps: { placeholder: '請輸入上層單據編號' },
      colSpan: 2,
    },
    {
      name: 'outcome',
      label: '操作結果',
      componentType: 'Select',
      componentProps: {
        placeholder: '請選擇操作結果',
        options: [
          { label: '全部結果', value: '' },
          { label: '成功 (Success)', value: 'Success' },
          { label: '失敗 (Failed)', value: 'Failed' },
        ],
      },
      colSpan: 2,
    },
    {
      name: 'deletionMode',
      label: '刪除模式',
      componentType: 'Select',
      componentProps: {
        placeholder: '請選擇刪除模式',
        options: [
          { label: '全部模式', value: '' },
          { label: '實體刪除 (HardDelete)', value: 'HardDelete' },
          { label: '軟刪除 (SoftDelete)', value: 'SoftDelete' },
        ],
      },
      colSpan: 2,
    },
  ];
}
