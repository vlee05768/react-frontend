import { z } from 'zod';
import type { FieldConfig } from '@/components/Form/types';

export const getRoleFormConfig = (): FieldConfig<any>[] => [
  {
    name: 'name',
    label: '姓名',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'caption',
    label: '角色標題',
    componentType: 'Input',
    validation: z.any().optional().nullable(),
  },
  {
    name: 'description',
    label: '描述',
    componentType: 'TextArea',
    validation: z.any().optional().nullable(),
  },
];
