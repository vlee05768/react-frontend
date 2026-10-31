import { describe, expect, it } from 'vitest';
import { blocksSamplingReduction, hasSamplingDefect } from './iqcSamplingGuard';

describe('抽樣不良保護', () => {
  it('辨識樣品及細項不良', () => {
    expect(hasSamplingDefect([{ isOk: false }])).toBe(true);
    expect(hasSamplingDefect([{ isOk: true, inspectionItems: [{ isOk: false }] }])).toBe(true);
    expect(hasSamplingDefect([{ isOk: null, inspectionItems: [{ isOk: null }] }])).toBe(false);
  });
  it('已保存的不良改判後仍須先儲存並重讀，才能縮減', () => {
    expect(blocksSamplingReduction([{ isOk: false }], [{ isOk: true }], 2, 1)).toBe(true);
    expect(blocksSamplingReduction([{ isOk: true }], [{ isOk: true }], 2, 1)).toBe(false);
  });
  it('尚未保存的細項不良也不可縮減，增加數量不受限制', () => {
    const samples = [{ inspectionItems: [{ isOk: false }] }];
    expect(blocksSamplingReduction([], samples, 2, 1)).toBe(true);
    expect(blocksSamplingReduction([], samples, 2, 3)).toBe(false);
  });
});

import { markNewBlankSample, canRemoveBlankSamples } from './iqcSamplingGuard';
describe('僅可移除可證明未修改的初次空白樣品', () => {
  it('拒絕既有、量測、人工判定及未知身分，允許全為未修改新樣品', () => {
    const blank = markNewBlankSample({ rollNo: 'R1', isOk: null, inspectionItems: [{ measuredValue: '', isOk: null }] });
    expect(canRemoveBlankSamples([blank])).toBe(true);
    expect(canRemoveBlankSamples([{ ...blank, sampleId: 'saved' }])).toBe(false);
    expect(canRemoveBlankSamples([{ ...blank, inspectionItems: [{ measuredValue: '2', isOk: null }] }])).toBe(false);
    expect(canRemoveBlankSamples([{ ...blank, isOk: false }])).toBe(false);
    expect(canRemoveBlankSamples([{ rollNo: 'legacy' }])).toBe(false);
  });
});
