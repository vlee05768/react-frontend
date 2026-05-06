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
    name: 'name',
    label: '公司名稱',
    componentType: 'Input',
    editable: 'always',
    validation: z.string().min(1, '請輸入公司名稱'),
    group: '基本資訊',
    colSpan: 2,
  },
  {
    name: 'type',
    label: '夥伴類型',
    componentType: 'Select',
    componentProps: { options: bpTypeOptions },
    editable: 'always',
    group: '基本資訊',
    colSpan: 1,
  },
  {
    name: 'taxId',
    label: '統一編號',
    componentType: 'Input',
    editable: 'always',
    group: '基本資訊',
    colSpan: 1,
  },
  {
    name: 'address',
    label: '公司登記地址',
    componentType: 'Input',
    editable: 'always',
    group: '基本資訊',
    colSpan: 2,
  },
  {
    name: 'phone',
    label: '公司電話',
    componentType: 'Input',
    editable: 'always',
    group: '基本資訊',
    colSpan: 1,
  },
  {
    name: 'faxNumber',
    label: '公司傳真',
    componentType: 'Input',
    editable: 'always',
    group: '基本資訊',
    colSpan: 1,
  },
  {
    name: 'code',
    label: '編號',
    componentType: 'Input',
    editable: 'createOnly',
    validation: z.string().min(1, '請輸入編號'),
    group: '基本資訊',
    colSpan: 2,
  },
  {
    name: 'isTYCustomer',
    label: '東裕客戶',
    componentType: 'Switch',
    editable: 'always',
    group: '基本資訊',
    colSpan: 2,
  },
  {
    name: 'paymentTerms',
    label: '收/付款條件',
    componentType: 'Input',
    editable: 'always',
    group: '商業條款',
    colSpan: 2,
  },
  {
    name: 'creditLimit',
    label: '信用額度',
    componentType: 'InputNumber',
    editable: 'always',
    group: '商業條款',
    colSpan: 1,
  },
  {
    name: 'leadTimeDays',
    label: '預計交期(天)',
    componentType: 'InputNumber',
    editable: 'always',
    group: '商業條款',
    colSpan: 1,
  },
  {
    name: 'website',
    label: '官方網站',
    componentType: 'Input',
    editable: 'always',
    group: '其他資訊',
    colSpan: 2,
  },
  {
    name: 'notes',
    label: '備註',
    componentType: 'TextArea',
    editable: 'always',
    group: '其他資訊',
    colSpan: 2,
  },
];
