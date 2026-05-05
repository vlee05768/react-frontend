import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';

import { Tooltip, Tag } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import { JsonEditorField } from '@/components/Form/JsonEditorField';

// ==========================================
// 1. 類別 (Master) 設定
// ==========================================
export const categoryDictionary = {
  type: { name: 'type', label: '類型' }, // ERPSystem
  code: { name: 'code', label: '類別代碼' },
  desc: { name: 'desc', label: '類別名稱' },
} as const;

export const categoryFormConfig = (): FormFieldConfig[] => [
  { ...categoryDictionary.type, componentType: 'Input', validation: z.string().min(1), editable: 'never', hidden: true },
  { ...categoryDictionary.code, componentType: 'Input', validation: z.string().min(1, '類別代碼為必填'), editable: 'createOnly', colSpan: 1 },
  { ...categoryDictionary.desc, componentType: 'Input', validation: z.string().min(1, '類別名稱為必填'), editable: 'always', colSpan: 1 },
];

export const categoryTableColumns = (): TableColumnConfig[] => [
  { ...categoryDictionary.code, width: 120 },
  { ...categoryDictionary.desc, width: 150 },
];

// ==========================================
// 2. 項目 (Detail) 設定
// ==========================================
export const itemDictionary = {
  type: { name: 'type', label: '類型' }, // Dynamic based on category code
  code: { name: 'code', label: '項目代碼' },
  desc: { name: 'desc', label: '項目說明' },
  code2: { name: 'code2', label: '代碼 2' },
  desc2: { name: 'desc2', label: '說明 2' },
  code3: { name: 'code3', label: '代碼 3' },
  desc3: { name: 'desc3', label: '說明 3' },
  num1: { name: 'num1', label: '數字 1' },
  num2: { name: 'num2', label: '數字 2' },
  spc: { name: 'spc', label: '特殊欄位 (SPC)' },
} as const;

export const itemFormConfig = (): FormFieldConfig[] => [
  { ...itemDictionary.type, componentType: 'Input', validation: z.string().min(1), editable: 'never', hidden: true },
  { ...itemDictionary.code, componentType: 'Input', validation: z.string().min(1, '項目代碼為必填'), editable: 'createOnly', colSpan: 2 },
  { ...itemDictionary.desc, componentType: 'Input', validation: z.string().min(1, '項目說明為必填'), editable: 'always', colSpan: 2 },
  { ...itemDictionary.code2, componentType: 'Input', validation: z.string().nullable().optional(), editable: 'always', colSpan: 2 },
  { ...itemDictionary.desc2, componentType: 'Input', validation: z.string().nullable().optional(), editable: 'always', colSpan: 2 },
  { ...itemDictionary.code3, componentType: 'Input', validation: z.string().nullable().optional(), editable: 'always', colSpan: 2 },
  { ...itemDictionary.desc3, componentType: 'Input', validation: z.string().nullable().optional(), editable: 'always', colSpan: 2 },
  { ...itemDictionary.num1, componentType: 'InputNumber', validation: z.number().nullable().optional(), editable: 'always', colSpan: 2 },
  { ...itemDictionary.num2, componentType: 'InputNumber', validation: z.number().nullable().optional(), editable: 'always', colSpan: 2 },
  { ...itemDictionary.spc, componentType: 'Custom', customRender: (field) => <JsonEditorField value={field.value} onChange={field.onChange} disabled={field.disabled} />, validation: z.string().nullable().optional(), editable: 'always', colSpan: 1 },
];

export const itemTableColumns = (): TableColumnConfig[] => [
  { ...itemDictionary.code, width: 120 },
  { ...itemDictionary.desc, width: 150 },
  { ...itemDictionary.code2, width: 100 },
  { ...itemDictionary.desc2, width: 120 },
  { ...itemDictionary.code3, width: 100 },
  { ...itemDictionary.desc3, width: 120 },
  { ...itemDictionary.num1, width: 80, align: 'right' },
  { ...itemDictionary.num2, width: 80, align: 'right' },
    { 
    ...itemDictionary.spc, 
    width: 120,
    align: 'center',
    render: (value: any) => {
      if (!value || typeof value !== 'string' || value.trim() === '') return <span className="text-gray-500">-</span>;
      
      let formattedJson = value;
      let isValidJson = false;
      try {
        const parsed = JSON.parse(value);
        formattedJson = JSON.stringify(parsed, null, 2);
        isValidJson = true;
      } catch (e) {
        isValidJson = false;
      }

      return (
        <Tooltip 
          title={
            <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {formattedJson}
            </pre>
          } 
          color="#282c34"
          styles={{ container: { maxWidth: '500px', maxHeight: '400px', overflow: 'auto' } }}
        >
          <Tag icon={<CodeOutlined />} color={isValidJson ? "cyan" : "red"} className="cursor-pointer cursor-help m-0">
            {isValidJson ? 'JSON' : 'Text'}
          </Tag>
        </Tooltip>
      );
    }
  },
];
