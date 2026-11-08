import type { PurchaseOrderItemDto } from '@/api/generated/types.gen';

// 保留窄化邊界：SDK 欄位仍可能收到後端未知字串，僅讓 R／S／null 進入表單。
export type MaterialForm = 'R' | 'S' | null;
export type PurchaseOrderItemWithMaterialForm = PurchaseOrderItemDto & {
  readonly materialForm?: MaterialForm;
};

export function adaptPurchaseOrderItem(item: PurchaseOrderItemDto): PurchaseOrderItemWithMaterialForm {
  const value: unknown = 'materialForm' in item ? item.materialForm : undefined;
  return {
    ...item,
    materialForm: value === 'R' || value === 'S' || value === null ? value : undefined,
  };
}
