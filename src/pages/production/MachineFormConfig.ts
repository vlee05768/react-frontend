import { z } from 'zod';
import type { FieldConfig } from '@/components/Form/types';

export const getMachineFormConfig = (): FieldConfig<any>[] => [
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
    name: 'capacity',
    label: '產能',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
];
