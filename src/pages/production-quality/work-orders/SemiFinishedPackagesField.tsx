import React from 'react';
import { Button, Input, InputNumber, Select, Table, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { SemiFinishedPackagePayload, MaterialFormType } from '@/api/workOrderWorkflowApi';

interface SemiFinishedPackagesFieldProps {
  value?: SemiFinishedPackagePayload[];
  onChange?: (val: SemiFinishedPackagePayload[]) => void;
  disabled?: boolean;
}

export const SemiFinishedPackagesField: React.FC<SemiFinishedPackagesFieldProps> = ({
  value = [],
  onChange,
  disabled = false,
}) => {
  const rows = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    const nextSeq = String(rows.length + 1);
    const nextRow: SemiFinishedPackagePayload = {
      packageSeq: nextSeq,
      materialForm: rows[rows.length - 1]?.materialForm || 'R',
      measuredWidthMm: 0,
      measuredLength: null,
      quantity: 0,
    };
    onChange?.([...rows, nextRow]);
  };

  const handleRemove = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange?.(next);
  };

  const handleUpdate = <K extends keyof SemiFinishedPackagePayload>(
    index: number,
    key: K,
    fieldVal: SemiFinishedPackagePayload[K],
  ) => {
    const next = rows.map((row, i) => {
      if (i !== index) return row;
      const updated = { ...row, [key]: fieldVal };
      if (key === 'materialForm' && fieldVal === 'R') {
        updated.measuredLength = null;
      }
      return updated;
    });
    onChange?.(next);
  };

  const columns = [
    {
      title: '包裝序號',
      dataIndex: 'packageSeq',
      key: 'packageSeq',
      width: 110,
      render: (_: unknown, record: SemiFinishedPackagePayload, index: number) => (
        <Input
          size="small"
          disabled={disabled}
          value={record.packageSeq}
          placeholder="如 P1"
          maxLength={50}
          onChange={(e) => handleUpdate(index, 'packageSeq', e.target.value)}
        />
      ),
    },
    {
      title: '型態',
      dataIndex: 'materialForm',
      key: 'materialForm',
      width: 110,
      render: (_: unknown, record: SemiFinishedPackagePayload, index: number) => (
        <Select<MaterialFormType>
          size="small"
          disabled={disabled}
          value={record.materialForm}
          style={{ width: '100%' }}
          options={[
            { label: '捲料 (R)', value: 'R' },
            { label: '片料 (S)', value: 'S' },
          ]}
          onChange={(val) => handleUpdate(index, 'materialForm', val)}
        />
      ),
    },
    {
      title: '實測寬度 (mm)',
      dataIndex: 'measuredWidthMm',
      key: 'measuredWidthMm',
      width: 130,
      render: (_: unknown, record: SemiFinishedPackagePayload, index: number) => (
        <InputNumber
          size="small"
          disabled={disabled}
          min={0.0001}
          precision={2}
          style={{ width: '100%' }}
          value={record.measuredWidthMm}
          onChange={(val) => handleUpdate(index, 'measuredWidthMm', Number(val ?? 0))}
        />
      ),
    },
    {
      title: '片料實測長度 (mm)',
      dataIndex: 'measuredLength',
      key: 'measuredLength',
      width: 150,
      render: (_: unknown, record: SemiFinishedPackagePayload, index: number) =>
        record.materialForm === 'S' ? (
          <InputNumber
            size="small"
            disabled={disabled}
            min={0.0001}
            precision={2}
            style={{ width: '100%' }}
            placeholder="片料必填 (mm)"
            value={record.measuredLength ?? undefined}
            onChange={(val) =>
              handleUpdate(index, 'measuredLength', val != null ? Number(val) : null)
            }
          />
        ) : (
          <span
            style={{
              display: 'inline-block',
              lineHeight: '24px',
              verticalAlign: 'middle',
              width: '100%',
              textAlign: 'center',
              color: 'var(--ant-color-text-description)',
            }}
          >
            —
          </span>
        ),
    },
    {
      title: '包裝數量 (M / PCS)',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 150,
      render: (_: unknown, record: SemiFinishedPackagePayload, index: number) => (
        <InputNumber
          size="small"
          disabled={disabled}
          min={0.0001}
          precision={4}
          style={{ width: '100%' }}
          placeholder={record.materialForm === 'R' ? '長度 (M)' : '片數 (PCS)'}
          value={record.quantity}
          onChange={(val) => handleUpdate(index, 'quantity', Number(val ?? 0))}
        />
      ),
    },
    ...(!disabled
      ? [
          {
            title: '操作',
            key: 'action',
            width: 72,
            align: 'center' as const,
            render: (_: unknown, __: SemiFinishedPackagePayload, index: number) => (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '24px',
                  verticalAlign: 'middle',
                }}
              >
                <Button
                  type="text"
                  danger
                  size="small"
                  aria-label={`刪除第 ${index + 1} 筆包裝`}
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemove(index)}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
          半成品產出須填寫各包裝實測資料（捲料填實測寬度與長度 M；片料填實測寬度、長度 mm 與片數 PCS）。
        </Typography.Text>
        {!disabled && (
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增包裝明細
          </Button>
        )}
      </div>
      <Table<SemiFinishedPackagePayload>
        size="small"
        bordered
        pagination={false}
        scroll={{ x: 'max-content' }}
        rowKey={(record) => record.packageSeq}
        dataSource={rows}
        columns={columns}
        locale={{ emptyText: '尚未新增半成品包裝實測資料，請點擊右上角「新增包裝明細」' }}
      />
    </div>
  );
};
