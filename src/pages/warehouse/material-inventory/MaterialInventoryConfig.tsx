import type { TableColumnConfig, SearchFieldConfig } from "@/components/Form/types";
import type { 
  MaterialLogicalInventoryDto, 
  MaterialRollDto, 
  MaterialInventoryTransactionDto 
} from "@/api/generated/types.gen";
import { Tag } from "antd";
import dayjs from "dayjs";

// 輔助函式：安全格式化小數，防範 string 或 null 造成 toFixed 崩潰
const formatDecimal = (val: any, decimals: number = 4, fallback: string = "0"): string => {
  if (val == null) return fallback;
  const num = Number(val);
  return !isNaN(num) ? Number(num.toFixed(decimals)).toLocaleString() : fallback;
};

// ============================================================================
// 1. 邏輯儲位庫存 (Logical Storage Inventory) 欄位與搜尋
// ============================================================================

export const logicalSearchFields: SearchFieldConfig[] = [
  {
    name: "MaterialCode",
    label: "原料品編",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "StorageCode",
    label: "儲位編碼",
    componentType: "AsyncSelect",
    componentProps: { configKey: "STORAGE" },
    colSpan: 2,
  }
];

export const getLogicalColumns = (): TableColumnConfig<MaterialLogicalInventoryDto>[] => [
  {
    label: "原料品編",
    name: "materialCode",
    width: 180,
    sortable: { multiple: 1 },
  },
  {
    label: "原料名稱",
    name: "materialName",
    width: 250,
    ellipsis: true,
  },
  {
    label: "形態",
    name: "materialForm",
    width: 100,
    align: "center",
    render: (val: string) => val === "R" ? <Tag color="blue">捲材 (R)</Tag> : <Tag color="green">片材 (S)</Tag>,
  },
  {
    label: "寬度 (mm)",
    name: "widthMm",
    width: 120,
    align: "right",
    render: (val: any) => formatDecimal(val, 4, "-"),
  },
  {
    label: "在庫可用長度(M) / 張數(PCS)",
    name: "lengthMm",
    width: 180,
    align: "right",
    render: (_, record) => {
      const area = record.quantity || 0;
      const width = record.widthMm || 0;
      const length = record.lengthMm || 0;
      const isRoll = record.materialForm === "R";

      if (width === 0) return "-";

      if (isRoll) {
        // 捲材：計算可用長度 = 面積 * 1000 / 寬度
        const lengthM = (area * 1000) / width;
        return `${formatDecimal(lengthM, 2, "0")} M`;
      } else {
        // 片材：計算可用張數 = 面積 / (寬度/1000 * 長度/1000)
        if (length === 0) return "-";
        const singleArea = (width / 1000) * (length / 1000);
        const pcs = area / singleArea;
        return `${formatDecimal(pcs, 0, "0")} PCS`;
      }
    },
  },
  {
    label: "儲位編碼",
    name: "storageCode",
    width: 140,
    sortable: { multiple: 2 },
  },
  {
    label: "在庫可用面積(SQM)",
    name: "quantity",
    width: 160,
    align: "right",
    render: (val: any) => formatDecimal(val, 4, "0"),
  },
  {
    label: "凍結待驗面積(SQM)",
    name: "frozenQuantity",
    width: 160,
    align: "right",
    render: (val: any) => formatDecimal(val, 4, "0"),
  },
  {
    label: "最後更新時間",
    name: "updatedAt",
    width: 180,
    render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-",
  },
  {
    label: "更新者",
    name: "updatedBy",
    width: 120,
    render: (val: string) => val || "-",
  }
];

// ============================================================================
// 2. 實體一卷一卡 (LPN / WIP Roll Traceability) 欄位與搜尋
// ============================================================================

export const rollStateOptions = [
  { label: "在庫 (INSTOCK)", value: "INSTOCK" },
  { label: "車間 WIP (WIP)", value: "WIP" },
  { label: "已消耗 (CONSUMED)", value: "CONSUMED" },
  { label: "已報廢 (SCRAPPED)", value: "SCRAPPED" }
];

export const rollSearchFields: SearchFieldConfig[] = [
  {
    name: "RollNo",
    label: "卷卡號/LPN",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "MaterialCode",
    label: "原料品編",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "StorageCode",
    label: "目前儲位",
    componentType: "AsyncSelect",
    componentProps: { configKey: "STORAGE" },
    colSpan: 2,
  },
  {
    name: "RollStatus",
    label: "在庫狀態",
    componentType: "Select",
    componentProps: {
      options: rollStateOptions,
      allowClear: true,
    },
    colSpan: 2,
  }
];

export const getRollColumns = (
  onSelectParentBarcode?: (barcode: string) => void
): TableColumnConfig<MaterialRollDto>[] => [
  {
    label: "卷卡號 (LPN)",
    name: "rollNo",
    width: 180,
    sortable: { multiple: 1 },
    render: (val: string) => <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{val || "-"}</span>,
  },
  {
    label: "狀態",
    name: "rollStatus",
    width: 120,
    align: "center",
    sortable: { multiple: 2 },
    render: (val: any) => {
      const upper = String(val || '').toUpperCase();
      if (upper === 'INSTOCK') return <Tag color="success">在庫 (INSTOCK)</Tag>;
      if (upper === 'WIP') return <Tag color="warning">車間 WIP</Tag>;
      if (upper === 'CONSUMED') return <Tag color="default">已消耗</Tag>;
      if (upper === 'SCRAPPED') return <Tag color="error">已報廢</Tag>;
      return <Tag color="default">{val || '-'}</Tag>;
    }
  },
  {
    label: "原料品編",
    name: "materialCode",
    width: 160,
  },
  {
    label: "原料名稱",
    name: "materialName",
    width: 200,
    ellipsis: true,
  },
  {
    label: "實體寬度 (mm)",
    name: "widthMm",
    width: 120,
    align: "right",
    render: (val: any) => formatDecimal(val, 4, "-"),
  },
  {
    label: "剩餘長度(m)/張數",
    name: "currentQtyAux",
    width: 130,
    align: "right",
    render: (val: any) => formatDecimal(val, 4, "-"),
  },

  {
    label: "剩餘面積 (m²)",
    name: "currentAreaSqm",
    width: 130,
    align: "right",
    render: (val: any) => <span className="font-semibold text-blue-600 dark:text-blue-400">{formatDecimal(val, 4, "0")}</span>,
  },
  {
    label: "每平米成本",
    name: "costPerSqm",
    width: 120,
    align: "right",
    render: (val: any) => formatDecimal(val, 2, "-"),
  },
  {
    label: "目前儲位",
    name: "storageCode",
    width: 120,
    render: (val: string) => val || "-",
  },
  {
    label: "母卷條碼",
    name: "parentRollNo",
    width: 180,
    render: (val: string) => {
      if (!val) return "-";
      return onSelectParentBarcode ? (
        <a 
          onClick={() => onSelectParentBarcode(val)} 
          style={{ textDecoration: 'underline', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          {val}
        </a>
      ) : <span className="font-mono">{val}</span>;
    }
  },
  {
    label: "來源單號",
    name: "sourceDocNumber",
    width: 150,
  },
  {
    label: "入庫時間",
    name: "createdAt",
    width: 180,
    render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-",
  }
];

// ============================================================================
// 3. 庫存異動流水帳 (Material Inventory Transactions) 欄位與搜尋
// ============================================================================

export const transactionTypeDict: Record<string, { label: string; color: string }> = {
  PD: { label: "進貨入庫", color: "success" },
  PURCHASE_RECEIPT: { label: "採購入庫", color: "success" },
  IQC: { label: "品檢入庫", color: "processing" },
  QC: { label: "品質檢驗", color: "warning" },
  ISS: { label: "生產領料", color: "error" },
  PRODUCTION_ISSUE: { label: "生產領料", color: "error" },
  RET: { label: "生產退料", color: "blue" },
  PRODUCTION_RETURN: { label: "生產退料", color: "blue" },
  SPLIT: { label: "分切加工", color: "purple" },
  ADJUST: { label: "庫存調整", color: "orange" },
  ADJUSTMENT: { label: "庫存調整", color: "orange" },
};

export const transactionTypeOptions = [
  { label: "採購入庫 (PD / PURCHASE_RECEIPT)", value: "PD" },
  { label: "品檢入庫 (IQC)", value: "IQC" },
  { label: "生產領料 (ISS / PRODUCTION_ISSUE)", value: "ISS" },
  { label: "生產退料 (RET / PRODUCTION_RETURN)", value: "RET" },
  { label: "分切加工 (SPLIT)", value: "SPLIT" },
  { label: "庫存調整 (ADJUST / ADJUSTMENT)", value: "ADJUST" }
];

export const txSearchFields: SearchFieldConfig[] = [
  {
    name: "MaterialCode",
    label: "原料品編",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "LotNo",
    label: "卷卡條碼",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "StorageCode",
    label: "異動儲位",
    componentType: "AsyncSelect",
    componentProps: { configKey: "STORAGE" },
    colSpan: 2,
  },
  {
    name: "SourceDocCode",
    label: "來源單號",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "DocType",
    label: "交易類型",
    componentType: "Select",
    componentProps: {
      options: transactionTypeOptions,
      allowClear: true,
    },
    colSpan: 2,
  }
];

export const getTxColumns = (): TableColumnConfig<MaterialInventoryTransactionDto>[] => [
  {
    label: "交易編號",
    name: "transactionId",
    width: 150,
    sortable: { multiple: 1 },
  },
  {
    label: "交易類型",
    name: "docType",
    width: 100,
    render: (val: any) => {
      const key = String(val || '').trim().toUpperCase();
      const config = transactionTypeDict[key];
      if (config) {
        return <Tag color={config.color}>{config.label}</Tag>;
      }
      return <Tag color="default">{val || '-'}</Tag>;
    }
  },
  {
    label: "卷卡條碼 (LotNo)",
    name: "lotNo",
    width: 180,
    render: (val: string) => val ? <span className="font-mono font-semibold">{val}</span> : "-",
  },
  {
    label: "原料品編",
    name: "materialCode",
    width: 160,
  },
  {
    label: "原料名稱",
    name: "materialName",
    width: 200,
    ellipsis: true,
  },
  {
    label: "異動儲位",
    name: "storageCode",
    width: 120,
  },
  {
    label: "異動數量",
    name: "quantity",
    width: 140,
    align: "right",
    render: (val: any, record: any) => {
      if (val == null) return "0";
      const sign = record.signFlag || 1;
      const amount = Number(val) * sign;
      const unit = record.auxUOM || (record.materialForm === "R" ? "M" : "PCS");
      const formatted = record.materialForm === "R" ? formatDecimal(val, 2, "0") : Number(val).toLocaleString();
      if (amount > 0) {
        return <span className="text-green-600 dark:text-green-400 font-bold">+{formatted} {unit}</span>;
      } else if (amount < 0) {
        return <span className="text-red-600 dark:text-red-400 font-bold">-{formatted} {unit}</span>;
      }
      return <span className="font-semibold">{formatted} {unit}</span>;
    }
  },
  {
    label: "來源單號",
    name: "sourceDocCode",
    width: 150,
  },
  {
    label: "異動人員",
    name: "createdBy",
    width: 100,
  },
  {
    label: "交易時間",
    name: "transactionDate",
    width: 180,
    sortable: { multiple: 2 },
    render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-",
  },
  {
    label: "備註",
    name: "notes",
    ellipsis: true,
  }
];
