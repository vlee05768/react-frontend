import { describe, expect, it } from 'vitest';
import { parseProductionQuantity } from './productionQuantity';

describe('生產數量', () => {
  it.each([['0', 'PCS', 0], ['12', 'PCS', 12], ['0.0001', 'm', 0.0001], ['12.3456', 'm', 12.3456]])('接受 %s %s', (value, unit, expected) => {
    expect(parseProductionQuantity(value, unit)).toBe(expected);
  });
  it.each([['-1', 'm'], ['1.00001', 'm'], ['1.5', 'PCS'], ['100000000000000', 'm'], ['99999999999999.9999', 'm'], ['1e3', 'm']])('拒絕 %s %s', (value, unit) => {
    expect(parseProductionQuantity(value, unit)).toBeNull();
  });
});
