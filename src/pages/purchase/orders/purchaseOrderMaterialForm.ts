import type { PurchaseOrderItemDto } from '@/api/generated/types.gen';

// Temporary response extension until the SDK is regenerated from the updated Swagger.
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
