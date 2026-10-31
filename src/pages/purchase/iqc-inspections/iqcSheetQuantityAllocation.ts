type SheetSample = { _groupId?: string; supplierLotNo?: string | null; actualQtyAux?: number | null };
type SheetGroup = { id: string; qty: number };

/** 僅供已通過群組身分檢核的樣品使用；每組總量沿用首筆樣品承接，其餘為零。 */
export function allocateSheetGroupQuantities<T extends SheetSample>(samples: readonly T[], groups: readonly SheetGroup[]) {
  const groupsById = new Map(groups.map(group => [group.id, group]));
  const assignedGroups = new Set<string>();
  return samples.map(sample => {
    const group = sample._groupId ? groupsById.get(sample._groupId) : undefined;
    if (!group) throw new Error('樣品分組無法確認，不能分配片料數量。');
    const qty = assignedGroups.has(group.id) ? 0 : group.qty;
    assignedGroups.add(group.id);
    return {
      ...sample,
      supplierLotNo: (sample.supplierLotNo || '').trim().toUpperCase(),
      actualQtyAux: qty,
    };
  });
}
