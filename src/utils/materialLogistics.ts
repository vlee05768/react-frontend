export interface LpnRecord {
  rollNo?: string;
  qtyAux?: number;
  QtyAux?: number;
  currentQtyAux?: number;
  widthMm?: number;
  WidthMm?: number;
  lengthMm?: number;
  LengthMm?: number;
}

export interface CalculationResult {
  totalAreaSqm: number;  // 總面積 (平方公尺/SQM) -> 用於 quantity
  totalLengthM: number;   // 總長度 (米/M) -> 用於 referenceQuantity1 (捲料輔助)
  totalQtyPcs: number;    // 總張數 (PCS) -> 用於片料數量
}

export const MaterialLogisticsCore = {
  /**
   * 1. 智慧判定是捲料 (Roll) 還是片料 (Sheet)
   * 消滅現有 3 處重複的 isUnitRoll 與 isCodeRoll 判定代碼
   */
  isRollMaterial(inventoryCode: string | undefined | null, unit: string | undefined | null): boolean {
    const code = (inventoryCode || '').toUpperCase();
    const unitUpper = (unit || '').toUpperCase();
    const isCodeRoll = code.endsWith('R') || code.startsWith('R-');
    const isUnitRoll = unitUpper === 'SQM' || unitUpper === 'M²' || unitUpper === 'M';
    return isCodeRoll || isUnitRoll;
  },

  /**
   * 2. 轉換出貨面積 (SQM) 為實體長度 (M) 或張數 (PCS)
   * 用於「出貨需求長度」與「已配長度/數量」對帳展示
   */
  convertAreaToLength(isRoll: boolean, areaSqm: number, widthMm: number): number {
    if (!isRoll) return areaSqm; // 片料下數量就是 PCS 總數
    return widthMm > 0 ? (areaSqm / (widthMm / 1000)) : 0;
  },

  /**
   * 3. 智慧計量：根據所挑選的多個 LPN 卷卡，動態計算累計的出貨總面積與總長度
   * 用於 Form 存檔時，自動將 quantity 填入總面積、referenceQuantity1 填入總長度
   */
  calculateTotalAreaAndLength(isRoll: boolean, rolls: LpnRecord[]): CalculationResult {
    let totalLengthM = 0;
    let totalAreaSqm = 0;
    let totalQtyPcs = 0;

    rolls.forEach(r => {
      // 容錯讀取各種可能由 DTO 或實體傳入的欄位命名 (大小寫相容)
      const len = Number(r.qtyAux ?? r.QtyAux ?? r.currentQtyAux ?? 0);
      const w = Number(r.widthMm ?? r.WidthMm ?? 0);
      
      if (isRoll) {
        totalLengthM += len;
        totalAreaSqm += len * (w / 1000);
      } else {
        totalQtyPcs += len;
      }
    });

    // 處理浮點數運算誤差，統一四捨五入到小數第 4 位
    return {
      totalAreaSqm: Math.round(totalAreaSqm * 10000) / 10000,
      totalLengthM: Math.round(totalLengthM * 10000) / 10000,
      totalQtyPcs: totalQtyPcs,
    };
  },

  /**
   * 4. 智慧計量單位後綴顯示 (m² vs pcs)
   */
  getUomSuffix(isRoll: boolean): 'm²' | 'pcs' {
    return isRoll ? 'm²' : 'pcs';
  }
};
