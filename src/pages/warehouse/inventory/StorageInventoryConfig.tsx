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
    colSpan: 2,
  },
  {
    name: 'InventoryCode',
    label: '物料編號',
    componentType: 'Input',
    colSpan: 2,
  },
];
