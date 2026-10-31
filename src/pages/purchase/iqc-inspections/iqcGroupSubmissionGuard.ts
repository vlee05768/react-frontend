type Sample = { _groupId?: string; _groupAmbiguous?: boolean; sampleId?: string | null; rollNo?: string | null };
type Group = { id?: string; sampleQty?: number | null };

/** Fail closed: only explicit group membership is acceptable for a write. */
export function validateGroupSubmission(samples: readonly Sample[], groups: readonly Group[]): string | null {
  const counts = new Map<string, number>();
  for (const [index, group] of groups.entries()) {
    if (!group.id || counts.has(group.id)) return '分組識別碼缺失或重複，請重新載入並確認分組。';
    if (!Number.isSafeInteger(group.sampleQty) || (group.sampleQty as number) < 0) return `第 ${index + 1} 組抽樣數無效，請確認後再儲存。`;
    counts.set(group.id, 0);
  }
  const ids = new Set<string>();
  const numbers = new Set<string>();
  for (const sample of samples) {
    if (sample.sampleId && ids.has(sample.sampleId)) return '樣品識別碼重複，請確認後再儲存。';
    if (!sample.rollNo || numbers.has(sample.rollNo)) return '樣品編號缺失或重複，請確認後再儲存。';
    if (sample.sampleId) ids.add(sample.sampleId);
    numbers.add(sample.rollNo);
    if (sample._groupAmbiguous || !sample._groupId || !counts.has(sample._groupId)) return `樣品 ${sample.rollNo} 分組無法確認，請確認明確關聯後再儲存。`;
    counts.set(sample._groupId, counts.get(sample._groupId)! + 1);
  }
  for (const [index, group] of groups.entries()) {
    const actual = counts.get(group.id!)!;
    if (actual !== group.sampleQty) return `第 ${index + 1} 組抽樣數為 ${group.sampleQty}，實際樣品數為 ${actual}，請確認後再儲存。`;
  }
  return null;
}
