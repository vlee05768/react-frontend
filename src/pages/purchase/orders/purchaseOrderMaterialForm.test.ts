import { describe, expect, it } from 'vitest';
import type { PurchaseOrderItemDto } from '@/api/generated/types.gen';
import { adaptPurchaseOrderItem } from './purchaseOrderMaterialForm';

describe('purchase order response materialForm adapter', () => {
  it.each(['R', 'S', null] as const)('preserves the API value %s', (materialForm) => {
    const dto: PurchaseOrderItemDto = { goodsCode: 'OX-SR-0.1-R', materialForm } as PurchaseOrderItemDto;
    expect(adaptPurchaseOrderItem(dto)).toEqual({ goodsCode: 'OX-SR-0.1-R', materialForm });
  });

  it('distinguishes an older response without the field from explicit null', () => {
    expect(adaptPurchaseOrderItem({ goodsCode: 'OX-SR-0.1-R' }).materialForm).toBeUndefined();
    const dto = JSON.parse('{"materialForm":null}') as PurchaseOrderItemDto;
    expect(adaptPurchaseOrderItem(dto).materialForm).toBeNull();
  });

  it('does not treat unexpected values as a valid material form', () => {
    const dto = JSON.parse('{"materialForm":"unexpected"}') as PurchaseOrderItemDto;
    expect(adaptPurchaseOrderItem(dto).materialForm).toBeUndefined();
  });
});
