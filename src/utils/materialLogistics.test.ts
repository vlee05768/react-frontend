import { describe, it, expect } from 'vitest'
import { MaterialLogisticsCore } from './materialLogistics'

describe('MaterialLogisticsCore', () => {
  describe('isRollMaterial', () => {
    it('應正確識別以 R 結尾或 R- 開頭的捲料代碼', () => {
      expect(MaterialLogisticsCore.isRollMaterial('MAT001R', 'PCS')).toBe(true)
      expect(MaterialLogisticsCore.isRollMaterial('R-NYLON-100', 'PCS')).toBe(true)
    })

    it('應正確識別單位為 SQM, M², M 的捲料', () => {
      expect(MaterialLogisticsCore.isRollMaterial('MAT001', 'SQM')).toBe(true)
      expect(MaterialLogisticsCore.isRollMaterial('MAT001', 'M²')).toBe(true)
      expect(MaterialLogisticsCore.isRollMaterial('MAT001', 'M')).toBe(true)
    })

    it('非捲料應回傳 false', () => {
      expect(MaterialLogisticsCore.isRollMaterial('MAT001S', 'PCS')).toBe(false)
      expect(MaterialLogisticsCore.isRollMaterial('S-SHEET-01', 'PCS')).toBe(false)
    })
  })

  describe('convertAreaToLength', () => {
    it('捲料模式下應將面積與寬度換算為長度 (M)', () => {
      // 100 SQM, 寬度 500mm (0.5m) -> 200m
      const length = MaterialLogisticsCore.convertAreaToLength(true, 100, 500)
      expect(length).toBe(200)
    })

    it('片料模式下應直接回傳面積/PCS 數量', () => {
      const result = MaterialLogisticsCore.convertAreaToLength(false, 50, 500)
      expect(result).toBe(50)
    })
  })

  describe('calculateTotalAreaAndLength', () => {
    it('應正確計算多卷卷卡的總長度與總面積', () => {
      const rolls = [
        { currentQtyAux: 100, widthMm: 1000 }, // 100m * 1m = 100 SQM
        { currentQtyAux: 200, widthMm: 500 },  // 200m * 0.5m = 100 SQM
      ]

      const result = MaterialLogisticsCore.calculateTotalAreaAndLength(true, rolls)
      expect(result.totalLengthM).toBe(300)
      expect(result.totalAreaSqm).toBe(200)
      expect(result.totalQtyPcs).toBe(0)
    })

    it('片料模式下應累加總張數', () => {
      const sheets = [
        { currentQtyAux: 50 },
        { currentQtyAux: 150 },
      ]

      const result = MaterialLogisticsCore.calculateTotalAreaAndLength(false, sheets)
      expect(result.totalLengthM).toBe(0)
      expect(result.totalAreaSqm).toBe(0)
      expect(result.totalQtyPcs).toBe(200)
    })
  })
})
