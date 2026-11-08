// 缺少快照與明確的 null 均不可推斷為退回長度。
export function readWipSnapshot(roll: { wipQtyAux?: number | null; WipQtyAux?: number | null }): number | null | undefined {
  return Object.prototype.hasOwnProperty.call(roll, 'wipQtyAux') ? roll.wipQtyAux : roll.WipQtyAux;
}

export function estimateReturnQuantity(wipQty: number, usage: number): number {
  return Math.max(0, Math.min(wipQty, wipQty - usage));
}
