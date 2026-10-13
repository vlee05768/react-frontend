import type {
  PurchaseReceiptItemDto,
  UpdatePurchaseReceiptItemDto,
} from "@/api/generated/types.gen";

type ReceiptItemDimensions = {
  width?: unknown;
  length?: unknown;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const getLegacyDimensions = (extraData: unknown): ReceiptItemDimensions => {
  if (typeof extraData !== "object" || extraData === null) {
    if (typeof extraData !== "string") return {};
    try {
      return getLegacyDimensions(JSON.parse(extraData));
    } catch {
      return {};
    }
  }

  const data = extraData as Record<string, unknown>;
  return { width: data.width, length: data.length };
};

/** 頂層寬度／長度是 API 契約欄位；回退 extraData 以支援舊資料讀取。 */
export const getReceiptItemDimensions = (
  item: { width?: unknown; length?: unknown; extraData?: unknown },
): { width: number; length: number } => {
  const legacy = getLegacyDimensions(item.extraData);
  return {
    width: toFiniteNumber(item.width) ?? toFiniteNumber(legacy.width) ?? 0,
    length: toFiniteNumber(item.length) ?? toFiniteNumber(legacy.length) ?? 0,
  };
};

export const calculatePurchaseReceiptTotalLength = (item: {
  isRoll?: unknown;
  rollCount?: unknown;
  length?: unknown;
  extraData?: unknown;
}): number => {
  if (item.isRoll === false) return 0;
  const { length } = getReceiptItemDimensions(item);
  const rollCount = toFiniteNumber(item.rollCount) ?? 0;
  return rollCount * length;
};

/** 卷料契約：實收面積（SQM）＝長度（M）×寬度（mm）÷ 1000。 */
export const calculatePurchaseReceiptRollArea = (item: {
  rollCount?: unknown;
  width?: unknown;
  length?: unknown;
}): number => {
  const rollCount = toFiniteNumber(item.rollCount) ?? 0;
  const width = toFiniteNumber(item.width) ?? 0;
  const length = toFiniteNumber(item.length) ?? 0;
  return (rollCount * length * width) / 1000;
};

const UPDATE_FIELDS: Array<keyof UpdatePurchaseReceiptItemDto> = [
  "inventoryType",
  "materialCode",
  "materialName",
  "unit",
  "transactionType",
  "referenceNumber",
  "sourceStorageCode",
  "targetStorageCode",
  "notes",
  "partnerProductId",
  "partnerDocumentNumber",
  "unitPrice",
  "rollCount",
  "width",
  "length",
  "quantity",
  "isRoll",
  "extraData",
];

/** 只保留 UpdatePurchaseReceiptItemDto 支援的 PUT 欄位。 */
export const buildPurchaseReceiptItemUpdatePayload = (
  values: Partial<Omit<PurchaseReceiptItemDto, keyof UpdatePurchaseReceiptItemDto>> & UpdatePurchaseReceiptItemDto,
): UpdatePurchaseReceiptItemDto => {
  const payload: UpdatePurchaseReceiptItemDto = {};
  for (const field of UPDATE_FIELDS) {
    const value = values[field as keyof typeof values];
    if (value !== undefined) {
      payload[field] = value as never;
    }
  }
  // JSON-backed setter 可能最後套用 extraData；同步既有 shadow，保留未知擴充欄位。
  const extraData = values.extraData;
  let legacy: Record<string, unknown> | undefined;
  if (typeof extraData === "string") {
    try {
      const parsed: unknown = JSON.parse(extraData);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        legacy = { ...parsed as Record<string, unknown> };
      }
    } catch {
      // 非 JSON 的舊擴充資料原樣保留。
    }
  } else if (typeof extraData === "object" && extraData !== null && !Array.isArray(extraData)) {
    legacy = { ...extraData as Record<string, unknown> };
  }
  for (const field of ["width", "length", "rollCount"] as const) {
    if (values[field] === undefined) continue;
    const number = values[field] === null ? null : toFiniteNumber(values[field]);
    if (number === undefined) {
      delete payload[field];
    } else {
      payload[field] = number;
      if (legacy && field in legacy) legacy[field] = number;
    }
  }
  if (legacy) {
    if (values.isRoll !== undefined && "isRoll" in legacy) legacy.isRoll = values.isRoll;
    payload.extraData = legacy;
  }
  const dimensions = getLegacyDimensions(values.extraData);
  const width = toFiniteNumber(values.width === undefined ? dimensions.width : values.width);
  const length = toFiniteNumber(values.length === undefined ? dimensions.length : values.length);
  const rollCount = toFiniteNumber(values.rollCount);
  // Partial 更新缺少任一換算來源時，不將 Quantity 合成 0 覆寫既有庫存量。
  if (values.isRoll === true && width !== undefined && length !== undefined && rollCount !== undefined) {
    payload.quantity = calculatePurchaseReceiptRollArea({ width, length, rollCount });
  }
  return payload;
};
