import { z } from 'zod';
import type { FieldConfig, TableColumnConfig, SearchFieldConfig } from '@/components/Form/types';
import { DictLabel } from '@/components/Form/DictLabel';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

// 1. Data Dictionary (Single Source of Truth)
export const employeeDictionary = {
  employeeNo: { name: 'employeeNo', label: '員工編號' },
  name: { name: 'name', label: '姓名' },
  departmentCode: { name: 'departmentCode', label: '部門' },
  status: { name: 'status', label: '狀態' },
  phone: { name: 'phone', label: '聯絡電話' },
  email: { name: 'email', label: '電子郵件' },
  hireDate: { name: 'hireDate', label: '到職日期' },
  resignDate: { name: 'resignDate', label: '離職日期' },
  notes: { name: 'notes', label: '備註' },
} as const;

// 2. Form Configuration
export const employeeFormConfig: FieldConfig<any>[] = [
  {
    ...employeeDictionary.employeeNo,
    componentType: 'Input',
    validation: z.string().min(1, '請輸入員工編號'),
    updateDisabled: true, // 主鍵防呆，編輯時禁止修改
  },
  {
    ...employeeDictionary.name,
    componentType: 'Input',
    validation: z.string().min(1, '請輸入姓名'),
  },
  {
    ...employeeDictionary.status,
    componentType: 'Select',
    validation: z.number().min(1, '請選擇狀態'),
    // 使用 function 回傳對應狀態中文作為 Tooltip hint
    ellipsis: (value) => {
      const map: Record<number, string> = { 1: '在職', 2: '離職' };
      return map[value as number] || value;
    },
    componentProps: {
      options: [
        { label: '在職', value: 1 },
        { label: '離職', value: 2 },
      ]
    }
  },
  {
    ...employeeDictionary.departmentCode,
    componentType: 'DictSelect',
    validation: z.string().min(1, '請選擇部門代碼'),
    componentProps: {
      dictKey: 'DEPARTMENT',
      showSearch: true,
      optionFilterProp: '_displayName',
    }
  },
  {
    ...employeeDictionary.phone,
    componentType: 'Input',
    validation: z.string().optional().nullable(),
  },
  {
    ...employeeDictionary.email,
    componentType: 'Input',
    validation: z.string().email('Email 格式不正確').optional().nullable().or(z.literal('')),
    ellipsis: true,
  },
  {
    ...employeeDictionary.hireDate,
    componentType: 'Input',
    validation: z.any().optional().nullable(),
    componentProps: {
      type: 'date',
      style: { width: '100%' }
    }
  },
  {
    ...employeeDictionary.resignDate,
    componentType: 'Input',
    validation: z.any().optional().nullable(),
    componentProps: {
      type: 'date',
      style: { width: '100%' }
    }
  },
  {
    ...employeeDictionary.notes,
    componentType: 'TextArea',
    colSpan: 1,
    validation: z.string().optional().nullable(),
    componentProps: {
      rows: 3
    }
  }
];

// 3. Table Configuration
export const employeeTableColumns: TableColumnConfig<any>[] = [
  {
    ...employeeDictionary.employeeNo,
    render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v,
  },
  {
    ...employeeDictionary.name,
    render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v,
  },
  {
    ...employeeDictionary.departmentCode,
    label: '部門名稱', // Override label for table header if needed
    render: (v: any) => <DictLabel dictKey="DEPARTMENT" value={v} />,
  },
  {
    ...employeeDictionary.phone,
    render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v,
  },
  {
    ...employeeDictionary.hireDate,
    align: 'center',
    render: (v: string) => v ? v.substring(0, 10) : '-',
  },
  {
    ...employeeDictionary.resignDate,
    align: 'center',
    render: (v: string) => v ? v.substring(0, 10) : '-',
  },
  {
    ...employeeDictionary.status,
    align: 'center',
    render: (v: number) => v === 1 ? <CheckOutlined style={{ color: 'green' }} /> : (v === 2 ? <CloseOutlined style={{ color: 'red' }} /> : null),
  },
  {
    ...employeeDictionary.notes,
    render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v,
  },
];

// 4. Search Form Configuration
export const employeeSearchConfig: SearchFieldConfig<any>[] = [
  {
    ...employeeDictionary.employeeNo,
    componentType: 'Input',
    colSpan: 2,
  },
  {
    ...employeeDictionary.name,
    componentType: 'Input',
    colSpan: 2,
  },
  {
    ...employeeDictionary.status,
    componentType: 'Select',
    colSpan: 2,
    componentProps: {
      options: [
        { label: '在職', value: 1 },
        { label: '離職', value: 2 },
      ]
    },
    formatTag: (value: any) => value === 1 ? '在職' : '離職',
  },
  {
    ...employeeDictionary.departmentCode,
    componentType: 'DictSelect',
    colSpan: 2,
    componentProps: {
      dictKey: 'DEPARTMENT',
      showSearch: true,
      optionFilterProp: '_displayName',
    }
  },
  {
    ...employeeDictionary.phone,
    componentType: 'Input',
    colSpan: 2,
  }
];
