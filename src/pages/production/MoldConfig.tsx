import type { SearchFieldConfig } from '@/components/Form/types';
import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DictLabel } from '@/components/Form/DictLabel';

export const mainDictionary = {
  code: { name: 'code', label: '編號' },
  name: { name: 'name', label: '名稱' },
  type: { name: 'type', label: '類型' },
  supplierCode: { name: 'supplierCode', label: '供應商' },
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
  { ...mainDictionary.type, componentType: 'DictSelect', validation: z.any().optional().nullable(), editable: 'always', componentProps: { dictKey: 'MOLD_TYPE' } },
  { ...mainDictionary.supplierCode, componentType: 'DictSelect', validation: z.any().optional().nullable(), editable: 'always', componentProps: { dictKey: 'BP_SUPPLIER', showSearch: true, optionFilterProp: '_displayName' } },
  { ...mainDictionary.shape, componentType: 'DictSelect', validation: z.any().optional().nullable(), editable: 'always', componentProps: { dictKey: 'MOLD_SHAPE' } },
  { ...mainDictionary.dimensionLMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.dimensionWMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.dimensionHMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.isShareable, componentType: 'Switch', validation: z.boolean().optional(), editable: 'always' },
  { ...mainDictionary.description, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always' ,colSpan: 1},
  { ...mainDictionary.notes, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always'  ,colSpan: 1},
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { ...mainDictionary.code, sortable: { multiple: 1 }, width: 140 },
  { ...mainDictionary.name, sortable: { multiple: 2 }, width: 220 },
  { ...mainDictionary.isShareable, width: 100, align: 'center', render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null) },
  { ...mainDictionary.type, sortable: { multiple: 3 }, width: 100, render: (v: any) => <DictLabel dictKey="MOLD_TYPE" value={v} /> },
  { ...mainDictionary.supplierCode, width: 210, render: (v: any) => <DictLabel dictKey="BP_SUPPLIER" value={v} /> },
  { ...mainDictionary.shape, width: 100, render: (v: any) => <DictLabel dictKey="MOLD_SHAPE" value={v} /> },
  { ...mainDictionary.dimensionLMm, width: 120, align: 'right' },
  { ...mainDictionary.dimensionWMm, width: 120, align: 'right' },
  { ...mainDictionary.dimensionHMm, width: 120, align: 'right' },
  { ...mainDictionary.description, width: 200 },
  { ...mainDictionary.notes, width: 200 },
];

export const detailDictionaries = {} as const;
export const detailFormConfigs = {};
export const detailTableColumns = {};


export const moldSearchFormConfig = (): SearchFieldConfig[] => [
  { name: 'CodeOrName', label: '編號或名稱', componentType: 'Input', colSpan: 2 },
  { name: 'Type', label: '類型', componentType: 'DictSelect', colSpan: 2, componentProps: { dictKey: 'MOLD_TYPE' } },
  { name: 'SupplierCode', label: '供應商', componentType: 'DictSelect', colSpan: 2, componentProps: { dictKey: 'BP_SUPPLIER', showSearch: true, optionFilterProp: '_displayName' } },
  { name: 'Shape', label: '形狀', componentType: 'DictSelect', colSpan: 2, componentProps: { dictKey: 'MOLD_SHAPE' } },
];
