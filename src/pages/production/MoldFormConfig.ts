import { z } from 'zod';
import type { FieldConfig } from '@/components/Form/types';

export const getMoldFormConfig = (): FieldConfig<any>[] => [
  {
    name: 'code',
    label: '編號',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'name',
    label: '姓名',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'type',
    label: '類型',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'supplierCode',
    label: '供應商編號',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'shape',
    label: '形狀',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'dimensionLMm',
    label: '長度 (mm)',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'dimensionWMm',
    label: '寬度 (mm)',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'dimensionHMm',
    label: '高度 (mm)',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'isShareable',
    label: '可共用',
    componentType: 'Switch',
    validation: z.boolean().optional(),
  },
  {
    name: 'description',
    label: '描述',
    componentType: 'TextArea',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'notes',
    label: '備註',
    componentType: 'TextArea',
    validation: z.any().optional().nullable(),
  },
];
