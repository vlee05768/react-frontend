import { z } from 'zod';
import type { FieldConfig } from '@/components/Form/types';

export const getUserFormConfig = (): FieldConfig<any>[] => [
  {
    name: 'isActive',
    label: '狀態',
    componentType: 'Switch',
    validation: z.boolean().optional(),
  },
  {
    name: 'userName',
    label: '帳號',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
    updateDisabled: true,
  },
  {
    name: 'name',
    label: '姓名',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'employeeCode',
    label: '員工編號',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'position',
    label: '職位',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'email',
    label: '電子郵件',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'department',
    label: '部門',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'extensionNumber',
    label: '分機號碼',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'mobile',
    label: '手機號碼',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'phoneNumber',
    label: '電話號碼',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'roles',
    label: '角色',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
];
