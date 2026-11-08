import { describe, expect, it } from 'vitest';
import { readWipSnapshot, estimateReturnQuantity } from './returnQuantity';

describe('退料數量與 WIP 快照', () => {
  it('保留微小剩長且不超過 WIP 上限', () => {
    expect(estimateReturnQuantity(0.006, 0)).toBe(0.006);
    expect(estimateReturnQuantity(1.2345, 0.1)).toBeCloseTo(1.1345, 10);
    expect(estimateReturnQuantity(0.006, 1)).toBe(0);
  });

  it('讀取並序列化缺值、explicit null 與合法快照', () => {
    for (const [input, expected] of [
      [{}, undefined],
      [{ wipQtyAux: null, WipQtyAux: 8 }, null],
      [{ WipQtyAux: null }, null],
      [{ wipQtyAux: 0 }, 0],
      [{ WipQtyAux: 3.4567 }, 3.4567],
    ] as const) {
      const snapshot = readWipSnapshot(input);
      expect(snapshot).toBe(expected);
      expect(JSON.parse(JSON.stringify({ wipQtyAux: snapshot }))).toEqual(
        expected === undefined ? {} : { wipQtyAux: expected },
      );
    }
  });
});
