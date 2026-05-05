import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

export const mainDictionary = {
  code: { name: 'code', label: '儲位編碼' },
  name: { name: 'name', label: '儲位名稱' },
  type: { name: 'type', label: '儲位類型' },
  location: { name: 'location', label: '地區' },
  area: { name: 'area', label: '區域' },
  isCalculateInventory: { name: 'isCalculateInventory', label: '計算庫存' },
  isActive: { name: 'isActive', label: '狀態' },
  notes: { name: 'notes', label: '備註' },
} as const;

export const mainFormConfig = (): FormFieldConfig[] => [
  { ...mainDictionary.code, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'createOnly' },
  { ...mainDictionary.name, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.type, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.location, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.area, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.isCalculateInventory, componentType: 'Switch', validation: z.boolean().optional(), editable: 'always' },
  { ...mainDictionary.isActive, componentType: 'Switch', validation: z.boolean().optional(), editable: 'always' },
  { ...mainDictionary.notes, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always' },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { ...mainDictionary.code, width: 120 },
  { ...mainDictionary.name, width: 150 },
  { ...mainDictionary.type, width: 120 },
  { ...mainDictionary.location, width: 120 },
  { ...mainDictionary.area, width: 120 },
  { ...mainDictionary.isCalculateInventory, width: 100, align: 'center', render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null) },
  { ...mainDictionary.isActive, width: 80, align: 'center', render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null) },
  { ...mainDictionary.notes, width: 200 },
];

export const detailDictionaries = {} as const;
export const detailFormConfigs = {};
export const detailTableColumns = {};
