import type { SearchFieldConfig } from '@/components/Form/types';
import { z } from 'zod';
import type { FormFieldConfig, TableColumnConfig } from '@/components/Form/types';

export const mainDictionary = {
  code: { name: 'code', label: '編號' },
  name: { name: 'name', label: '名稱' },
  type: { name: 'type', label: '類型' },
  capacity: { name: 'capacity', label: '產能' },
} as const;

export const mainFormConfig = (): FormFieldConfig[] => [
  { ...mainDictionary.code, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'createOnly' },
  { ...mainDictionary.name, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.type, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
  { ...mainDictionary.capacity, componentType: 'Input', validation: z.any().optional().nullable(), editable: 'always' },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { ...mainDictionary.code, width: 120 },
  { ...mainDictionary.name, width: 150 },
  { ...mainDictionary.type, width: 120 },
  { ...mainDictionary.capacity, width: 150 },
];

export const detailDictionaries = {} as const;
export const detailFormConfigs = {};
export const detailTableColumns = {};


export const machineSearchFormConfig = (): SearchFieldConfig[] => [
  { name: 'CodeOrName', label: '編號或名稱', componentType: 'Input', colSpan: 2 },
];
