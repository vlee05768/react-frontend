import { z } from 'zod';
import type { FieldConfig } from '@/components/Form/types';

export const getStorageFormConfig = (): FieldConfig<any>[] => [
  {
    name: 'code',
    label: '儲位編碼',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'name',
    label: '儲位名稱',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'type',
    label: '儲位類型',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'location',
    label: '地區',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'area',
    label: '區域',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'isCalculateInventory',
    label: '計算庫存',
    componentType: 'Switch',
    validation: z.boolean().optional(),
  },
  {
    name: 'isActive',
    label: '狀態',
    componentType: 'Switch',
    validation: z.boolean().optional(),
  },
  {
    name: 'notes',
    label: '備註',
    componentType: 'TextArea',
    validation: z.any().optional().nullable(),
  },
];
