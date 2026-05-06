import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';

export const bpTypeOptions = [
  { label: '客戶', value: 'CUSTOMER' },
  { label: '供應商', value: 'SUPPLIER' },
  { label: '皆是', value: 'BOTH' },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  {
    label: '編號',
    name: 'code',
    width: 120,
  },
  {
    label: '名稱',
    name: 'name',
    width: 200,
  },
  {
    label: '統一編號',
    name: 'taxId',
    width: 120,
  },
  {
    label: '東裕客戶',
    name: 'isTYCustomer',
    width: 100,
    render: (val: boolean) => (val ? '是' : '否'),
  },
  {
    label: '廠商客戶檔類型',
    name: 'type',
    width: 150,
    render: (val: string) => {
      const opt = bpTypeOptions.find(o => o.value === val);
      return opt ? opt.label : val;
    }
  },
  {
    label: '電話',
    name: 'phone',
    width: 150,
  },
  {
    label: '傳真',
    name: 'faxNumber',
    width: 150,
  },
];

export const mainFormConfig = (): FormFieldConfig[] => [
  {
    name: 'code',
    label: '編號',
    componentType: 'Input',
    editable: 'createOnly',
    validation: z.string().min(1, '請輸入編號'),
    colSpan: 1,
  },
  {
    name: 'name',
    label: '名稱',
    componentType: 'Input',
    editable: 'always',
    validation: z.string().min(1, '請輸入名稱'),
    colSpan: 1,
  },
  {
    name: 'taxId',
    label: '統一編號',
    componentType: 'Input',
    editable: 'always',
    colSpan: 1,
  },
  {
    name: 'type',
    label: '廠商客戶檔類型',
    componentType: 'Select',
    componentProps: { options: bpTypeOptions },
    editable: 'always',
    colSpan: 1,
  },
  {
    name: 'isTYCustomer',
    label: '東裕客戶',
    componentType: 'Switch',
    editable: 'always',
    colSpan: 1,
  },
  {
    name: 'phone',
    label: '電話',
    componentType: 'Input',
    editable: 'always',
    colSpan: 1,
  },
  {
    name: 'faxNumber',
    label: '傳真',
    componentType: 'Input',
    editable: 'always',
    colSpan: 1,
  },
  {
    name: 'website',
    label: '官方網站',
    componentType: 'Input',
    editable: 'always',
    colSpan: 2,
  },
  {
    name: 'address',
    label: '地址',
    componentType: 'Input',
    editable: 'always',
    colSpan: 2,
  },
  {
    name: 'notes',
    label: '備註',
    componentType: 'TextArea',
    editable: 'always',
    colSpan: 2,
  },
];
