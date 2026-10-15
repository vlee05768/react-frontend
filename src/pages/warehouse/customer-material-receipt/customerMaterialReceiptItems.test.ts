import { describe, expect, it } from 'vitest';
import {
  buildUpdateCustomerMaterialReceiptItemDto,
  calculateCustomerMaterialReceiptAreaSqm,
  isCustomerMaterialReceiptItemEditable,
} from './CustomerMaterialReceiptItemsTab';

describe('customer material receipt item editing', () => {
  it('calculates sheet area with both width and length', () => {
    expect(calculateCustomerMaterialReceiptAreaSqm({
      materialForm: 'S',
      isRoll: false,
      rollCount: 10,
      width: 500,
      length: 1000,
      physicalQuantity: 10,
    })).toBe(5);
  });

  it('builds an update DTO from all editable item fields without create-only fields', () => {
    expect(buildUpdateCustomerMaterialReceiptItemDto({
      isRoll: false,
      materialForm: 'S',
      rollCount: 2,
      width: 500,
      length: 1000,
      physicalQuantity: 2,
      quantity: 1,
      packageSeq: 'PKG-01',
      targetStorageCode: 'TW-QC-GEN',
      notes: 'updated',
    })).toEqual({
      physicalQuantity: 2,
      rollCount: 2,
      width: 500,
      length: 1000,
      quantity: 1,
      packageSeq: 'PKG-01',
      materialForm: 'S',
      targetStorageCode: 'TW-QC-GEN',
      notes: 'updated',
    });
  });

  it.each([
    { status: 'CONFIRMED', confirmDate: '2026-10-01', closeDate: null },
    { status: 'CLOSED', confirmDate: '2026-10-01', closeDate: '2026-10-02' },
  ])('does not allow editing for $status items', (receipt) => {
    expect(isCustomerMaterialReceiptItemEditable(receipt)).toBe(false);
  });

  it('allows editing for an unconfirmed draft', () => {
    expect(isCustomerMaterialReceiptItemEditable({ status: 'UNCONFIRMED' })).toBe(true);
  });
});
