import { describe, expect, it } from 'vitest';
import { validateGroupSubmission } from './iqcGroupSubmissionGuard';

const group = (id: string, sampleQty: number) => ({ id, sampleQty, supplierLotNo: 'LOT' });
const sample = (groupId: string, sampleId: string) => ({ _groupId: groupId, sampleId, rollNo: sampleId });

describe('group submission integrity', () => {
  it('rejects an empty group with a positive sample quantity', () => {
    expect(validateGroupSubmission([], [group('g', 1)])).toMatch(/第 1 組.*1.*0/);
  });
  it('rejects surplus samples', () => {
    expect(validateGroupSubmission([sample('g', 's1'), sample('g', 's2')], [group('g', 1)])).toMatch(/第 1 組.*1.*2/);
  });
  it('rejects duplicated sample identifiers across groups', () => {
    expect(validateGroupSubmission([sample('g1', 's'), sample('g2', 's')], [group('g1', 1), group('g2', 1)])).toMatch(/重複/);
  });
  it('allows explicitly associated samples in groups sharing a lot', () => {
    expect(validateGroupSubmission([sample('g1', 's1'), sample('g2', 's2')], [group('g1', 1), group('g2', 1)])).toBeNull();
  });
  it('does not infer a legacy sample group from its lot', () => {
    const legacy = { sampleId: 's', rollNo: 'r', supplierLotNo: 'LOT' };
    expect(validateGroupSubmission([legacy], [group('g', 1)])).toMatch(/分組/);
  });
  it('rejects ambiguous membership even for NG samples', () => {
    const ng = { ...sample('g', 's'), _groupAmbiguous: true, isOk: false };
    expect(validateGroupSubmission([ng], [group('g', 1)])).toMatch(/分組/);
  });
  it('rejects duplicate group IDs and invalid quantities', () => {
    expect(validateGroupSubmission([], [group('g', 0), group('g', 0)])).toMatch(/分組/);
    expect(validateGroupSubmission([], [group('g', -1)])).toMatch(/抽樣/);
  });
  it('allows an empty zero-quantity group', () => {
    expect(validateGroupSubmission([], [group('g', 0)])).toBeNull();
  });
});
