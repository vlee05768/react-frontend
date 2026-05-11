import { SearchFieldConfig } from '@/types';

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

export const productionReceiptSearchConfig = (): SearchFieldConfig[] => [
  {
    name: 'documentNumber',
    label: '單據號碼',
    componentType: 'Input',
    colSpan: 24,
  },
  {
    name: 'status',
    label: '狀態',
    componentType: 'Select',
    componentProps: { options: statusOptions },
    colSpan: 24,
  },
  {
    name: 'dateRange',
    label: '單據日期',
    componentType: 'DateRangePicker',
    colSpan: 24,
  },
];
