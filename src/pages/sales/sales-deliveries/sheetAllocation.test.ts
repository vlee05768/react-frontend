import { describe, expect, it } from 'vitest';
import { sheetSaveGuard, allocationGroupKey } from './sheetAllocation';

describe('片料來源安全', () => {
  it('多訂單檢貨不可依位置推測，空檢貨不得清除來源', () => {
    const extra = [{ OrderItemLineNumber: 'A', Quantity: 3 }, { OrderItemLineNumber: 'B', Quantity: 2 }];
    expect(sheetSaveGuard(extra, 'A', 5, 5, [{ rollNo: 'L1', qtyAux: 5 }]).error).toBeTruthy();
    expect(sheetSaveGuard(extra, 'A', 5, 5, []).extraData).toEqual(extra);
    expect(sheetSaveGuard(extra, 'A', 5, 4, []).error).toBeTruthy();
  });
  it('不同尺寸與未知尺寸不合併', () => {
    const base = { goodsCode: 'OX-SS-0.1-S', unitPrice: 1, transactionType: 'INV', goodsType: 'M' };
    expect(allocationGroupKey({ ...base, widthMm: 100, lengthM: 1 }, 'A')).not.toBe(allocationGroupKey({ ...base, widthMm: 100, lengthM: 2 }, 'B'));
    expect(allocationGroupKey(base, 'A')).not.toBe(allocationGroupKey(base, 'B'));
  });
});
