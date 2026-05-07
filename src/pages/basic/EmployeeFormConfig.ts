import { z } from 'zod';
import type { FieldConfig } from '@/components/Form/types';

export const getEmployeeFormConfig = (): FieldConfig<any>[] => [
  {
    name: 'employeeNo',
    label: '員工編號',
    componentType: 'Input',
    validation: z.string().min(1, '請輸入員工編號'),
    updateDisabled: true, // 主鍵防呆，編輯時禁止修改
  },
  {
    name: 'name',
    label: '姓名',
    componentType: 'Input',
    validation: z.string().min(1, '請輸入姓名'),
  },
  {
    name: 'status',
    label: '狀態',
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
    name: 'departmentCode',
    label: '部門代碼',
    componentType: 'DictSelect',
    validation: z.string().min(1, '請選擇部門代碼'),
    componentProps: {
      dictKey: 'DEPARTMENT',
      showSearch: true,
      optionFilterProp: '_displayName',
    }
  },
  {
    name: 'phone',
    label: '聯絡電話',
    componentType: 'Input',
    validation: z.string().optional().nullable(),
  },
  {
    name: 'email',
    label: '電子郵件',
    componentType: 'Input',
    validation: z.string().email('Email 格式不正確').optional().nullable().or(z.literal('')),
    // 啟用 ellipsis (文字過長顯示 ... 並加上 Tooltip)
    // 可以是 boolean，也可以是 function (動態回傳自訂的 tooltip 文字)
    ellipsis: true,
  },
  {
    name: 'hireDate',
    label: '到職日期',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
    componentProps: {
      type: 'date',
      style: { width: '100%' }
    }
  },
  {
    name: 'resignDate',
    label: '離職日期',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
    componentProps: {
      type: 'date',
      style: { width: '100%' }
    }
  },
  {
    name: 'notes',
    label: '備註',
    componentType: 'TextArea',
    colSpan: 1,
    validation: z.string().optional().nullable(),
    componentProps: {
      rows: 3
    }
  }
];
