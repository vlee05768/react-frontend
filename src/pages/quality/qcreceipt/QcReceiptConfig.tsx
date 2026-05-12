import { DictSelect } from '@/components/Form/DictSelect';






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
];

import type { TableColumnConfig, FormFieldConfig } from '@/components/Form/types';
import { Tag } from 'antd';
import dayjs from 'dayjs';


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
  { label: '單據號碼', name: 'documentNumber', width: 100 },
  { 
    label: '檢驗日期', 
    name: 'documentDate', 
    width: 80,
    render: (val: string) => val ? dayjs(val).format('YYYY-MM-DD') : '-' 
  },
  { 
    label: '檢驗狀態', 
    name: 'status', 
    width: 100,
    align: 'center',
    render: (status: string, record: any) => getStatusTag(status, record?.confirmDate, record?.closeDate)
  },
  { label: '檢驗人員', name: 'responsibleUserName', width: 100, render: (v: string) => v || '-' },
  { label: '備註', name: 'notes', width: 200, ellipsis: true },
];

export const mainFormConfig = (): FormFieldConfig[] => [
  { name: 'documentNumber', label: '單據號碼', componentType: 'Input', editable: 'never', autoGenerate: true, colSpan: 2 },
  { name: 'documentDate', label: '檢驗日期', componentType: 'DatePicker', editable: 'always', colSpan: 2 },
  { 
    name: 'status', 
    label: '狀態', 
    componentType: 'Input', 
    editable: 'never',
    customRender: (_field, context) => getStatusTag(context.values.status, context.values.confirmDate, context.values.closeDate),
    colSpan: 2 
  },
  { 
    name: 'responsibleEmployeeCode', 
    label: '檢驗人員', 
    componentType: 'Custom', 
    editable: 'always', 
    customRender: (field) => <DictSelect {...field} dictKey="EMPLOYEE" />,
    colSpan: 2 
  },
  { name: 'notes', label: '備註', componentType: 'TextArea', editable: 'always', componentProps: { rows: 3 }, colSpan: 1 },
];
