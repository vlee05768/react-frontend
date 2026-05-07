import type { SearchFieldConfig } from '@/components/Form/types';
import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

// ==========================================
// 1. 主表 (Master) 設定
// ==========================================
export const mainDictionary = {
  userName: { name: 'userName', label: '帳號' },
  name: { name: 'name', label: '姓名' },
  employeeCode: { name: 'employeeCode', label: '員工編號' },
  position: { name: 'position', label: '職位' },
  email: { name: 'email', label: '電子郵件' },
  department: { name: 'department', label: '部門' },
  extensionNumber: { name: 'extensionNumber', label: '分機號碼' },
  mobile: { name: 'mobile', label: '手機號碼' },
  phoneNumber: { name: 'phoneNumber', label: '電話號碼' },
  roles: { name: 'roles', label: '角色' },
  isActive: { name: 'isActive', label: '啟動狀態' },
} as const;

export const mainFormConfig = (roleOptions: { label: string, value: string }[] = []): FormFieldConfig[] => [
  { ...mainDictionary.userName, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'createOnly' },
  { ...mainDictionary.name, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.employeeCode, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.position, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.email, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.department, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.extensionNumber, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.mobile, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.phoneNumber, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { 
    ...mainDictionary.roles, 
    componentType: 'Select', 
    validation: z.any().optional().nullable(), 
    editable: 'always',
    colSpan: 1,
    componentProps: {
      mode: 'multiple',
      options: roleOptions
    }
  },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { ...mainDictionary.isActive, width: 80, align: 'center', render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null) },
  { ...mainDictionary.userName, width: 120 },
  { ...mainDictionary.name, width: 120 },
  { ...mainDictionary.employeeCode, width: 120 },
  { ...mainDictionary.position, width: 120 },
  { ...mainDictionary.email, width: 200 },
  { ...mainDictionary.department, width: 120 },
  { ...mainDictionary.extensionNumber, width: 120 },
  { ...mainDictionary.mobile, width: 120 },
  { ...mainDictionary.phoneNumber, width: 120 },
  { ...mainDictionary.roles, width: 150, render: (v: string[]) => v?.join(', ') || '-' },
];

// ==========================================
// 2. 明細表 (Details) 設定 (此模組無明細)
// ==========================================
export const detailDictionaries = {} as const;
export const detailFormConfigs = {};
export const detailTableColumns = {};


export const userSearchFormConfig = (): SearchFieldConfig[] => [
  { name: 'userName', label: '帳號', componentType: 'Input', colSpan: 12 },
  { name: 'name', label: '姓名', componentType: 'Input', colSpan: 12 },
  { name: 'employeeCode', label: '員工代碼', componentType: 'Input', colSpan: 12 },
];
