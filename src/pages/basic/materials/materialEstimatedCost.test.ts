import { describe, expect, it } from 'vitest';
import { getEstimatedCostRecalculationMessage } from './materialEstimatedCost';

describe('getEstimatedCostRecalculationMessage', () => {
  it('summarizes updated and preserved counts with the returned window', () => {
    expect(getEstimatedCostRecalculationMessage({
      recentCostWindowDays: 30,
      processedCount: 3,
      updatedCount: 1,
      preservedCount: 2,
      items: [],
    })).toBe('近 30 天估算成本重算完成：已更新 1 筆，無進貨資料保留原值 2 筆（處理 3 筆）。');
  });
});
