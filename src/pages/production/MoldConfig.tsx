import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

export const mainDictionary = {
  code: { name: 'code', label: '編號' },
  name: { name: 'name', label: '名稱' },
  type: { name: 'type', label: '類型' },
  supplierCode: { name: 'supplierCode', label: '供應商編號' },
  shape: { name: 'shape', label: '形狀' },
  dimensionLMm: { name: 'dimensionLMm', label: '長度 (mm)' },
  dimensionWMm: { name: 'dimensionWMm', label: '寬度 (mm)' },
  dimensionHMm: { name: 'dimensionHMm', label: '高度 (mm)' },
  isShareable: { name: 'isShareable', label: '可共用' },
  description: { name: 'description', label: '描述' },
  notes: { name: 'notes', label: '備註' },
} as const;

export const mainFormConfig = (): FormFieldConfig[] => [
  { ...mainDictionary.code, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'createOnly' },
  { ...mainDictionary.name, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.type, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.supplierCode, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.shape, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.dimensionLMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.dimensionWMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.dimensionHMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.isShareable, componentType: 'Switch', validation: z.boolean().optional(), editable: 'always' },
  { ...mainDictionary.description, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always' ,colSpan: 1},
  { ...mainDictionary.notes, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always'  ,colSpan: 1},
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { ...mainDictionary.code, width: 120 },
  { ...mainDictionary.name, width: 150 },
  { ...mainDictionary.type, width: 120 },
  { ...mainDictionary.supplierCode, width: 120 },
  { ...mainDictionary.shape, width: 120 },
  { ...mainDictionary.dimensionLMm, width: 120, align: 'right' },
  { ...mainDictionary.dimensionWMm, width: 120, align: 'right' },
  { ...mainDictionary.dimensionHMm, width: 120, align: 'right' },
  { ...mainDictionary.isShareable, width: 100, align: 'center', render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null) },
  { ...mainDictionary.description, width: 200 },
  { ...mainDictionary.notes, width: 200 },
];

export const detailDictionaries = {} as const;
export const detailFormConfigs = {};
export const detailTableColumns = {};
