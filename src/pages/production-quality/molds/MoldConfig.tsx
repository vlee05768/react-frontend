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
  availableProductionQuantity: { name: 'availableProductionQuantity', label: '可用生產數量' },
  totalProductionQuantity: { name: 'totalProductionQuantity', label: '累計生產數量' },
  description: { name: 'description', label: '描述' },
  notes: { name: 'notes', label: '備註' },
} as const;

export const mainFormConfig = (): FormFieldConfig[] => [
  { ...mainDictionary.code, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'createOnly' },
  { ...mainDictionary.name, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.type, componentType: 'DictSelect', validation: z.any().optional().nullable(), editable: 'always', componentProps: { dictKey: 'MOLD_TYPE' } },
  { ...mainDictionary.supplierCode, componentType: 'AsyncSelect', validation: z.any().optional().nullable(), editable: 'always', componentProps: { configKey: 'TOOLING_SUPPLIER', allowClear: true } },
  { ...mainDictionary.shape, componentType: 'DictSelect', validation: z.any().optional().nullable(), editable: 'always', componentProps: { dictKey: 'MOLD_SHAPE' } },
  { ...mainDictionary.dimensionLMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.dimensionWMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.dimensionHMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.availableProductionQuantity, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always', componentProps: { min: 0, style: { width: '100%' } } },
  { ...mainDictionary.totalProductionQuantity, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'never', componentProps: { min: 0, style: { width: '100%' } } },
  { ...mainDictionary.isShareable, componentType: 'Switch', validation: z.boolean().optional(), editable: 'always' },
  { ...mainDictionary.description, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always' ,colSpan: 1},
  { ...mainDictionary.notes, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always'  ,colSpan: 1},
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { ...mainDictionary.code, sortable: { multiple: 1 }, width: 150, ellipsis: true },
  { ...mainDictionary.name, sortable: { multiple: 2 }, width: 220, ellipsis: true },
  { ...mainDictionary.isShareable, width: 80, align: 'center', render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null) },
  { ...mainDictionary.type, sortable: { multiple: 3 }, width: 100, render: (v: any) => <DictLabel dictKey="MOLD_TYPE" value={v} />, ellipsis: true },
  { ...mainDictionary.supplierCode, width: 210, render: (v: any) => <DictLabel dictKey="TOOLING_SUPPLIER" value={v} />, ellipsis: true },
  { ...mainDictionary.shape, width: 100, render: (v: any) => <DictLabel dictKey="MOLD_SHAPE" value={v} />, ellipsis: true },
  { ...mainDictionary.dimensionLMm, width: 120, align: 'right', ellipsis: true },
  { ...mainDictionary.dimensionWMm, width: 120, align: 'right', ellipsis: true },
  { ...mainDictionary.dimensionHMm, width: 120, align: 'right', ellipsis: true },
  { ...mainDictionary.availableProductionQuantity, width: 130, align: 'right', ellipsis: true },
  { ...mainDictionary.totalProductionQuantity, width: 130, align: 'right', ellipsis: true },
  { ...mainDictionary.description, width: 200, ellipsis: true },
  { ...mainDictionary.notes, width: 200, ellipsis: true },
];

export const detailDictionaries = {} as const;
export const detailFormConfigs = {};
export const detailTableColumns = {};


export const moldSearchFormConfig = (): SearchFieldConfig[] => [
  { name: 'CodeOrName', label: '編號或名稱', componentType: 'Input', colSpan: 2 },
  { name: 'Type', label: '類型', componentType: 'DictSelect', colSpan: 2, componentProps: { dictKey: 'MOLD_TYPE' } },
  { name: 'SupplierCode', label: '供應商', componentType: 'AsyncSelect', colSpan: 2, componentProps: { configKey: 'TOOLING_SUPPLIER', allowClear: true } },
  { name: 'Shape', label: '形狀', componentType: 'DictSelect', colSpan: 2, componentProps: { dictKey: 'MOLD_SHAPE' } },
];
