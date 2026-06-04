import type { SearchFieldConfig } from "@/components/Form/types";

export const inventoryTypeOptions = [
  { label: '原料', value: 'M' },
  { label: '成品', value: 'P' },
];

export const searchFields: SearchFieldConfig[] = [
  {
    name: 'StorageCode',
    label: '儲位編號',
    componentType: 'Input',
  },
  {
    name: 'InventoryCode',
    label: '物料編號',
    componentType: 'Input',
  },
  {
    name: 'Type',
    label: '庫存類型',
    componentType: 'Select',
    componentProps: {
      options: inventoryTypeOptions,
    }
  },
];
