type Group = { goodsCode: string; unitPrice: number; transactionType: string; goodsType: string; widthMm?: number; lengthM?: number };

export function allocationGroupKey(unit: Group, source: string): string {
  const dimensions = unit.goodsType === 'M'
    ? [unit.widthMm ?? null, unit.lengthM ?? null, unit.widthMm == null || unit.lengthM == null ? source : null]
    : [];
  return JSON.stringify([unit.goodsCode, unit.goodsType, unit.unitPrice, unit.transactionType, ...dimensions]);
}

const invalid = { error: '片料來源分攤或檢貨資料無法可靠對應，請確認訂單來源與各 LPN 分配數量；目前禁止儲存。' };

export function sheetSaveGuard(extra: unknown, reference: string | null | undefined, oldQuantity: number, newQuantity: number, rolls: any[]): { error?: string; extraData?: unknown } {
  if (!Number.isFinite(oldQuantity) || !Number.isFinite(newQuantity) || oldQuantity <= 0 || newQuantity <= 0) return invalid;
  let data = extra;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return invalid; }
  }
  if (data != null && (!Array.isArray(data) || data.length === 0)) return invalid;
  const list = (data ?? []) as any[];
  const allocation = list.filter(x => x && (x.OrderItemLineNumber != null || x.orderItemLineNumber != null));
  if (allocation.length && allocation.length !== list.length) return invalid;
  const sources = new Set<string>();
  let sum = 0;
  for (const entry of allocation) {
    const source = entry.OrderItemLineNumber ?? entry.orderItemLineNumber;
    const qty = entry.Quantity ?? entry.quantity;
    if (typeof source !== 'string' || !source.trim() || typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) return invalid;
    sources.add(source); sum += qty;
  }
  if (allocation.length && (Math.abs(sum - oldQuantity) > 1e-7 || !reference || !sources.has(reference))) return invalid;
  if (!allocation.length && list.some(x => !x || !(x.rollNo || x.RollNo))) return invalid;
  if (sources.size > 1) {
    if (rolls.length || Math.abs(newQuantity - oldQuantity) > 1e-7) return invalid;
    return { extraData: extra };
  }
  if (!rolls.length && allocation.length && !list.some(x => x.rollNo || x.RollNo)) {
    if (Math.abs(newQuantity - oldQuantity) > 1e-7) return invalid;
    return { extraData: extra };
  }
  const source = allocation.length ? [...sources][0] : reference;
  if (rolls.length && !source) return invalid;
  const ids = new Set<string>();
  for (const roll of rolls) {
    const id = roll.rollNo ?? roll.RollNo;
    const qty = Number(roll.qtyAux ?? roll.QtyAux ?? roll.currentQtyAux);
    const rollSource = roll.OrderItemLineNumber ?? roll.orderItemLineNumber;
    if (typeof id !== 'string' || !id.trim() || ids.has(id) || !Number.isFinite(qty) || qty <= 0 || (rollSource != null && rollSource !== source)) return invalid;
    ids.add(id);
  }
  return { extraData: rolls.length ? rolls.map(r => ({ ...r, OrderItemLineNumber: source, orderItemLineNumber: source, Quantity: Number(r.qtyAux ?? r.QtyAux ?? r.currentQtyAux), quantity: Number(r.qtyAux ?? r.QtyAux ?? r.currentQtyAux) })) : null };
}
