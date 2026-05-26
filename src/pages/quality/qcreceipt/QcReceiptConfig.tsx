import { DictSelect } from '@/components/Form/DictSelect';
import type { TableColumnConfig, FormFieldConfig } from '@/components/Form/types';
import { Tag } from 'antd';
import dayjs from 'dayjs';

export const qcReceiptSearchConfig = (): any[] => [
  {
    name: 'documentNumber',
    label: '單據號碼',
    componentType: 'Input',
    colSpan: 2,
  },
  {
    name: 'dateRange',
    label: '檢驗日期',
    componentType: 'DateRangePicker',
    colSpan: 2,
  },
  {
    name: 'status',
    label: '狀態',
    componentType: 'Select',
    componentProps: {
      options: [
        { label: '待確認', value: 'Unconfirmed' },
        { label: '已確認', value: 'Confirmed' },
        { label: '已結案', value: 'Closed' },
      ],
      allowClear: true,
    },
    colSpan: 2,
  },
];

export const getStatusTagProps = (
  status?: string | null,
  confirmDate?: string | null,
  closeDate?: string | null
) => {
  if (closeDate) return { color: "default", text: "已結案" };
  if (confirmDate) return { color: "success", text: "已確認" };

  if (!status) return { color: "warning", text: "待確認" };
  switch (status.toUpperCase()) {
    case "CONFIRMED":
      return { color: "success", text: "已確認" };
    case "CLOSED":
      return { color: "default", text: "已結案" };
    case "UNCONFIRMED":
    default:
      return { color: "warning", text: "待確認" };
  }
};

export const getStatusTag = (
  status?: string | null,
  confirmDate?: string | null,
  closeDate?: string | null
) => {
  const props = getStatusTagProps(status, confirmDate, closeDate);
  return <Tag color={props.color}>{props.text}</Tag>;
};

export const mainTableColumns = (): TableColumnConfig[] => [
  { label: '單據號碼', name: 'documentNumber', sortable: { multiple: 1 }, width: 120 },
  { 
    label: '檢驗日期', 
    name: 'documentDate', 
    sortable: { multiple: 2 },
    width: 80,
    render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '-' 
  },
  { 
    label: '檢驗狀態', 
    name: 'status', 
    sortable: { multiple: 3 },
    width: 100,
    align: 'center',
    render: (status: string, record: any) => getStatusTag(status, record?.confirmDate, record?.closeDate)
  },
  { label: '檢驗人員', name: 'responsibleUserName', width: 100, render: (v: string) => v || '-' },
  { label: '備註', name: 'notes', width: 200, ellipsis: true },
];

export const mainFormConfig = (): FormFieldConfig[] => [
  { name: 'documentNumber', label: '單據號碼', componentType: 'Input', editable: 'never', autoGenerate: true, colSpan: 3 },
  { name: 'documentDate', label: '檢驗日期', componentType: 'DatePicker', editable: 'always', colSpan: 3 },
  { 
    name: 'responsibleEmployeeCode', 
    label: '檢驗人員', 
    componentType: 'Custom', 
    editable: 'always', 
    customRender: (field) => <DictSelect {...field} dictKey="EMPLOYEE" />,
    colSpan: 3 
  },
  { name: 'notes', label: '備註', componentType: 'TextArea', editable: 'always', componentProps: { rows: 3 }, colSpan: 1 },
];

export const itemTableColumns = (): TableColumnConfig[] => [
  { label: '對應單據項次', name: 'referenceNumber', width: 180 },
  { label: '料號', name: 'inventoryCode', width: 150 },
  { label: '品名', name: 'inventoryName', width: 150 },
  { label: '來源儲位', name: 'sourceStorageCode', width: 120 },
  { 
    label: '本次QC量', 
    name: 'drawnQuantity', 
    width: 100, 
    align: 'right',
    render: (val: number) => <span style={{ color: 'var(--ant-color-warning)' }}>{val?.toLocaleString() || '0'}</span>
  },
  { label: '良品倉', name: 'goodTargetStorageCode', width: 120, render: (v: string) => v || 'TW-GEN-INV' },
  { 
    label: '良品量', 
    name: 'goodQuantity', 
    width: 100, 
    align: 'right',
    render: (val: number) => <span style={{ color: 'var(--ant-color-success)' }}>{val?.toLocaleString() || '0'}</span>
  },
  { label: '報廢倉', name: 'scrapTargetStorageCode', width: 130, render: (v: string) => v || 'TW-GEN-SCRAP' },
  { 
    label: '報廢量', 
    name: 'scrapQuantity', 
    width: 100, 
    align: 'right',
    render: (val: number) => <span style={{ color: 'var(--ant-color-error)' }}>{val?.toLocaleString() || '0'}</span>
  },
  { label: '備註', name: 'notes', width: 200, ellipsis: true },
];

export const itemFormConfig = (): FormFieldConfig[] => [
  { name: 'referenceNumber', label: '對應單據項次', componentType: 'Input', editable: 'never', colSpan: 4 },
  { name: 'inventoryCode', label: '料號', componentType: 'Input', editable: 'never', colSpan: 4 },
  { name: 'inventoryName', label: '品名', componentType: 'Input', editable: 'never', colSpan: 4 },
  { name: 'drawnQuantity', label: '本次QC量', componentType: 'InputNumber', editable: 'never', colSpan: 4, componentProps: { className: 'qc-qty-warning w-full' } },
  { name: 'goodTargetStorageCode', label: '良品倉', componentType: 'Input', editable: 'never', colSpan: 4 },
  { name: 'goodQuantity', label: '良品量', componentType: 'InputNumber', editable: 'never', colSpan: 4, componentProps: { className: 'qc-qty-success w-full' } },
  { name: 'scrapTargetStorageCode', label: '報廢倉', componentType: 'Input', editable: 'never', colSpan: 4 },
  { name: 'scrapQuantity', label: '報廢量', componentType: 'InputNumber', editable: 'never', colSpan: 4, componentProps: { className: 'qc-qty-error w-full' } },
  { name: 'sourceStorageCode', label: '來源儲位', componentType: 'Input', editable: 'never', colSpan: 4 },
  { name: 'notes', label: '備註', componentType: 'TextArea', editable: 'never', colSpan: 1 },
];
