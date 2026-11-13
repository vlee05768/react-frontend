import { describe, expect, it } from 'vitest';
import { markNewBlankSample, canRemoveBlankSamples, updateSampleGroupLot } from './iqcSamplingGuard';

describe('草稿抽樣數調整輔助', () => {
  it('只把本次新增且未修改的空白樣品辨識為可直接丟棄', () => {
    const blank = markNewBlankSample({ rollNo: 'R1', isOk: null, inspectionItems: [{ measuredValue: '', isOk: null }] });
    expect(canRemoveBlankSamples([blank])).toBe(true);
    expect(canRemoveBlankSamples([{ ...blank, sampleId: 'saved' }])).toBe(false);
    expect(canRemoveBlankSamples([{ ...blank, inspectionItems: [{ measuredValue: '2', isOk: null }] }])).toBe(false);
    expect(canRemoveBlankSamples([{ ...blank, isOk: false }])).toBe(false);
    expect(canRemoveBlankSamples([{ rollNo: 'legacy' }])).toBe(false);
  });

  it('空白新樣品切換批號後仍保留可移除快照，既有樣品只更新批號', () => {
    const blank = markNewBlankSample({ rollNo: 'R1', supplierLotNo: '', isOk: null });
    const movedBlank = updateSampleGroupLot(blank, 'LOT-B');
    expect(movedBlank.supplierLotNo).toBe('LOT-B');
    expect(canRemoveBlankSamples([movedBlank])).toBe(true);

    const saved = updateSampleGroupLot({ sampleId: 'saved', supplierLotNo: 'LOT-A' }, 'LOT-B');
    expect(saved).toEqual({ sampleId: 'saved', supplierLotNo: 'LOT-B' });
  });
});
