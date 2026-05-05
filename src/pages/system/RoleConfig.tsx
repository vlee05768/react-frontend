import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';

export const mainDictionary = {
  name: { name: 'name', label: '編號' },
  caption: { name: 'caption', label: '名稱' },
  description: { name: 'description', label: '描述' },
} as const;

export const mainFormConfig = (): FormFieldConfig[] => [
  { ...mainDictionary.name, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'createOnly', colSpan: 2 },
  { ...mainDictionary.caption, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always', colSpan: 2 },
  { ...mainDictionary.description, componentType: 'TextArea', validation: z.any().optional().nullable(), editable: 'always', colSpan: 1 },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { ...mainDictionary.name, width: 150 },
  { ...mainDictionary.caption, width: 150 },
  { ...mainDictionary.description, width: 200 },
];

export const detailDictionaries = {} as const;
export const detailFormConfigs = {};
export const detailTableColumns = {};
