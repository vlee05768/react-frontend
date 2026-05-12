import { DictSelect } from '@/components/Form/DictSelect';


export const statusOptions = [
  { label: '待確認', value: 'Unconfirmed' },
  { label: '已確認', value: 'Confirmed' },
  { label: '已結案', value: 'Closed' },
];

export const getStatusTagProps = (status: string) => {
  switch (status) {
    case 'Confirmed':
      return { color: 'success', text: '已確認' };
    case 'Closed':
      return { color: 'default', text: '已結案' };
    case 'Unconfirmed':
    default:
      return { color: 'warning', text: '待確認' };
  }
};

export const qcReceiptSearchConfig = (): any[] => [
  {
    name: 'documentNumber',
    label: '單據號碼',
    componentType: 'Input',
    colSpan: 2,
  },
  {
    name: 'status',
    label: '檢驗狀態',
    componentType: 'Select',
    componentProps: { options: statusOptions },
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


export const getStatusTag = (status: string) => {
  const props = getStatusTagProps(status);
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
    render: (status: string) => getStatusTag(status)
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
    customRender: (_field, context) => getStatusTag(context.values.status),
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
