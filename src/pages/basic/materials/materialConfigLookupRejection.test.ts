import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getApiV1Material: vi.fn(),
  getApiV1MaterialByCode: vi.fn(),
  getApiV1MoldByCode: vi.fn(),
}));

vi.mock("@/api/generated/sdk.gen", () => mocks);

import { logger } from "@/utils/logger";
import { generateCode } from "./MaterialConfig";
import { getItemFormConfig } from "@/pages/purchase/orders/PurchaseOrderConfig";

const loggerError = vi.spyOn(logger, "error");
const loggerWarn = vi.spyOn(logger, "warn");

describe("best-effort lookup rejection boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an observable handled result for a material conflict-check rejection", async () => {
    mocks.getApiV1Material.mockRejectedValueOnce(new Error("backend detail must stay private"));
    const setValue = vi.fn();

    const result = await generateCode(
      {
        values: {
          materialForm: "R",
          brand: "ACME",
          modelNo: "M-1",
          thickness: 1,
          materialType: "RAW",
          type: "RAW",
        },
      },
      setValue,
    );

    expect(result).toEqual({ status: "lookup-failed" });
    expect(loggerError).toHaveBeenCalledWith("material.brand-model.conflict-check.failed");
  });

  it("returns an observable handled result for a material goods-code rejection", async () => {
    mocks.getApiV1MaterialByCode.mockRejectedValueOnce(new Error("backend detail must stay private"));
    const setValue = vi.fn();
    const goodsCodeField = getItemFormConfig().find((field: any) => field.name === "goodsCode");

    const result = await goodsCodeField.onChange(
      "MAT-001",
      { values: { purchaseOrderType: "Material" } },
      setValue,
    );

    expect(result).toEqual({ status: "lookup-failed" });
    expect(loggerWarn).toHaveBeenCalledWith("purchase-order.goods-code.material-lookup.failed");
  });

  it("returns an observable handled result for a mold goods-code rejection", async () => {
    mocks.getApiV1MoldByCode.mockRejectedValueOnce(new Error("backend detail must stay private"));
    const setValue = vi.fn();
    const goodsCodeField = getItemFormConfig().find((field: any) => field.name === "goodsCode");

    const result = await goodsCodeField.onChange(
      "MOLD-001",
      { values: { purchaseOrderType: "Mold" } },
      setValue,
    );

    expect(result).toEqual({ status: "lookup-failed" });
    expect(loggerWarn).toHaveBeenCalledWith("purchase-order.goods-code.mold-lookup.failed");
  });
});
