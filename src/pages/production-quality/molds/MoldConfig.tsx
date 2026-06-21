import type { SearchFieldConfig } from '@/components/Form/types';
import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { DictLabel } from '@/components/Form/DictLabel';
import { Tag } from 'antd';

export const mainDictionary = {
  code: { name: 'code', label: '編號' },
  name: { name: 'name', label: '名稱' },
  type: { name: 'type', label: '類型' },
  shape: { name: 'shape', label: '形狀' },
  dimensionLMm: { name: 'dimensionLMm', label: '長度 (mm)' },
  dimensionWMm: { name: 'dimensionWMm', label: '寬度 (mm)' },
  dimensionHMm: { name: 'dimensionHMm', label: '高度 (mm)' },
  isShareable: { name: 'isShareable', label: '可共用' },
  isArrived: { name: 'isArrived', label: '到貨狀態' },
  availableProductionQuantity: { name: 'availableProductionQuantity', label: '可用生產數量' },
  totalProductionQuantity: { name: 'totalProductionQuantity', label: '累計生產數量' },
  description: { name: 'description', label: '描述' },
  notes: { name: 'notes', label: '備註' },
} as const;

export const mainFormConfig = (): FormFieldConfig[] => [
  { 
    ...mainDictionary.code, 
    componentType: 'Input', 
    validation: z.string()
      .min(1, '編號為必填欄位')
      .max(50, '編號長度不可超過 50 個字元')
      .regex(/^[A-Z0-9_\-]+$/, '編號僅能包含大寫英數字及符號（_、-）且禁止中文'), 
    editable: 'createOnly',
    onChange: (val, _, setValue) => {
      const upper = (val || "").replace(/[\u4e00-\u9fff]/g, "").toUpperCase();
      setValue("code", upper);
    }
  },
  { 
    ...mainDictionary.name, 
    componentType: 'Input', 
    validation: z.string()
      .min(1, '名稱為必填欄位')
      .max(255, '名稱長度不可超過 255 個字元'), 
    editable: 'always' 
  },
  { 
    ...mainDictionary.type, 
    componentType: 'DictSelect', 
    validation: z.string().min(1, '請選擇類型'), 
    editable: 'always', 
    componentProps: { dictKey: 'MOLD_TYPE' } 
  },
  { ...mainDictionary.shape, componentType: 'DictSelect', validation: z.any().optional().nullable(), editable: 'always', componentProps: { dictKey: 'MOLD_SHAPE' } },
  { ...mainDictionary.dimensionLMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.dimensionWMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.dimensionHMm, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.availableProductionQuantity, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'always', componentProps: { min: 0, style: { width: '100%' } } },
  { ...mainDictionary.totalProductionQuantity, componentType: 'InputNumber', validation: z.any().optional().nullable(), editable: 'never', componentProps: { min: 0, style: { width: '100%' } } },
  { ...mainDictionary.isShareable, componentType: 'Switch', validation: z.boolean().optional(), editable: 'always' },
  { ...mainDictionary.isArrived, componentType: 'Switch', validation: z.boolean().optional(), editable: 'always' },
  { ...mainDictionary.description, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always' ,colSpan: 1},
  { ...mainDictionary.notes, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always'  ,colSpan: 1},
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { ...mainDictionary.code, sortable: { multiple: 1 }, width: 150, ellipsis: true },
  { ...mainDictionary.name, sortable: { multiple: 2 }, width: 220, ellipsis: true },
  { ...mainDictionary.isArrived, width: 100, align: 'center', render: (v: boolean | undefined | null) => v === true ? <Tag color="green">已到貨</Tag> : <Tag color="orange">未到貨</Tag> },
  { ...mainDictionary.isShareable, width: 80, align: 'center', render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null) },
  { ...mainDictionary.type, sortable: { multiple: 3 }, width: 100, render: (v: any) => <DictLabel dictKey="MOLD_TYPE" value={v} />, ellipsis: true },
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
  { name: 'Shape', label: '形狀', componentType: 'DictSelect', colSpan: 2, componentProps: { dictKey: 'MOLD_SHAPE' } },
  { 
    name: 'IsArrived', 
    label: '到貨狀態', 
    componentType: 'Select', 
    colSpan: 2, 
    componentProps: { 
      options: [
        { label: '全部', value: undefined },
        { label: '已到貨', value: true },
        { label: '未到貨', value: false }
      ],
      allowClear: true
    } 
  },
];
