import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';

export const contactTableColumns = (): TableColumnConfig[] => [
  {
    label: '姓名',
    name: 'name',
    width: 120,
  },
  {
    label: '職稱',
    name: 'jobTitle',
    width: 120,
  },
  {
    label: '電話',
    name: 'phone',
    width: 120,
  },
  {
    label: '分機',
    name: 'phoneExtension',
    width: 80,
  },
  {
    label: '行動電話',
    name: 'mobilePhone',
    width: 150,
  },
  {
    label: '電子郵件',
    name: 'email',
    width: 200,
  }
];

export const contactFormConfig = (): FormFieldConfig[] => [
  {
    name: 'name',
    label: '姓名',
    componentType: 'Input',
    editable: 'always',
    validation: z.string().min(1, '請輸入姓名'),
    colSpan: 4,
  },
  {
    name: 'jobTitle',
    label: '職稱',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'phone',
    label: '電話',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'phoneExtension',
    label: '分機',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'mobilePhone',
    label: '行動電話',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'email',
    label: '電子郵件',
    componentType: 'Input',
    editable: 'always',
    colSpan: 4,
  },
  {
    name: 'address',
    label: '地址',
    componentType: 'Input',
    editable: 'always',
    colSpan: 1,
  },
  {
    name: 'notes',
    label: '備註',
    componentType: 'TextArea',
    editable: 'always',
    colSpan: 1,
  },
];
