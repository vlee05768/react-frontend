import { describe, expect, it } from "vitest";
import {
  buildPurchaseReceiptItemUpdatePayload,
  calculatePurchaseReceiptRollArea,
  calculatePurchaseReceiptTotalLength,
  getReceiptItemDimensions,
} from "./purchaseReceiptItemCalculations";

describe("進貨明細規格與庫存換算", () => {
  it("以頂層幅寬及長度為準，不被舊擴充資料覆寫", () => {
    expect(getReceiptItemDimensions({ width: 800, length: 120, extraData: { width: 999, length: 999 } }))
      .toEqual({ width: 800, length: 120 });
  });

  it("僅在頂層規格缺少時回退舊擴充資料", () => {
    expect(getReceiptItemDimensions({ extraData: JSON.stringify({ width: 500, length: 80 }) }))
      .toEqual({ width: 500, length: 80 });
  });

  it("以目前卷數及每卷長度重算總長", () => {
    expect(calculatePurchaseReceiptTotalLength({ isRoll: true, rollCount: 3, length: 125 })).toBe(375);
    expect(calculatePurchaseReceiptTotalLength({ isRoll: false, rollCount: 3, length: 125 })).toBe(0);
  });

  it("依契約公式換算卷料進貨面積 SQM", () => {
    expect(calculatePurchaseReceiptRollArea({ rollCount: 3, width: 500, length: 200 })).toBe(300);
  });

  it("以本次到貨卷數換算庫存面積", () => {
    expect(calculatePurchaseReceiptRollArea({ rollCount: 2, width: 500, length: 200 })).toBe(200);
  });

  it("更新僅送契約欄位，不送總長及其他唯讀回應欄位", () => {
    expect(buildPurchaseReceiptItemUpdatePayload({
      materialCode: "MAT-1", rollCount: 2, width: 600, length: 100,
      totalLength: 200, amount: 1234, serialNumber: "1",
    })).toEqual({ materialCode: "MAT-1", rollCount: 2, width: 600, length: 100 });
  });

  it.each([false, true])("同步物件及 JSON 字串中的舊規格，保留未知擴充資料（字串：%s）", (asString) => {
    const extraData = { width: 900, length: 999, rollCount: 9, isRoll: false, supplierLot: "LOT-OLD" };
    const payload = buildPurchaseReceiptItemUpdatePayload({
      width: 800, length: 100, rollCount: 3, isRoll: true,
      extraData: asString ? JSON.stringify(extraData) : extraData,
    });
    expect(payload).toEqual({
      width: 800, length: 100, rollCount: 3, isRoll: true, quantity: 240,
      extraData: { width: 800, length: 100, rollCount: 3, isRoll: true, supplierLot: "LOT-OLD" },
    });
    expect(extraData.width).toBe(900);
  });

  it("部分更新不新增空規格、不清空未提供的舊規格或庫存量", () => {
    expect(buildPurchaseReceiptItemUpdatePayload({
      width: 800, isRoll: true, extraData: { width: 500, length: 100, rollCount: 3, supplierLot: "LOT-OLD" },
    })).toEqual({
      width: 800, isRoll: true, extraData: { width: 800, length: 100, rollCount: 3, supplierLot: "LOT-OLD" },
    });
    expect(buildPurchaseReceiptItemUpdatePayload({ notes: "僅改備註" })).toEqual({ notes: "僅改備註" });
    expect(buildPurchaseReceiptItemUpdatePayload({ isRoll: true })).toEqual({ isRoll: true });
  });

  it("頂層零值及片料型態仍優先於舊規格", () => {
    expect(buildPurchaseReceiptItemUpdatePayload({
      width: 0, length: 0, rollCount: 0, isRoll: false,
      extraData: { width: 500, length: 100, rollCount: 3, isRoll: true },
    })).toEqual({
      width: 0, length: 0, rollCount: 0, isRoll: false,
      extraData: { width: 0, length: 0, rollCount: 0, isRoll: false },
    });
  });

  it("明確清空規格時不以舊規格合成新的庫存量", () => {
    expect(buildPurchaseReceiptItemUpdatePayload({
      width: null, length: 100, rollCount: 3, isRoll: true, extraData: { width: 500 },
    })).not.toHaveProperty("quantity");
  });
});
