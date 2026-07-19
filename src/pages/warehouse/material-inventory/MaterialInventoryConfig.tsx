import type { TableColumnConfig, SearchFieldConfig } from "@/components/Form/types";
import type { 
  MaterialInventoryTransactionDto 
} from "@/api/generated/types.gen";
import { Tag, Tooltip, Button } from "antd";
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
    componentType: "DictSelect",
    componentProps: { dictKey: "STORAGE", optionsFilter: (opt: any) => opt.type === "MAT" },
    colSpan: 2,
  }
];

export const getLogicalColumns = (): TableColumnConfig<any>[] => [
  {
    label: "原料編號",
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
    label: "庫存總長度",
    name: "lengthMm",
    width: 180,
    align: "right",
    showHint: false, // 💡 隱藏系統預設的提示（不顯示長度總量 3,600 M 的 Tooltip），但保留自訂的儲位明細提示
    render: (_, record: any) => {
      const area = (record.quantity || 0) + (record.frozenQuantity || 0);
      const width = record.widthMm || 0;
      const length = record.lengthMm || 0;
      const isRoll = record.materialForm === "R";

      let displayText = "-";
      if (isRoll) {
        if (width > 0) {
          const lengthM = (area * 1000) / width;
          displayText = `${formatDecimal(lengthM, 2, "0")} M`;
        }
      } else {
        displayText = length > 0 ? `${formatDecimal(length, 0, "-")} mm` : "-";
      }

      const tooltipContent = (
        <div style={{ whiteSpace: "pre-line", padding: "2px 4px" }}>
          {(record.storages || []).map((s: any) => {
            const totalSLength = (s.length || 0) + (s.frozenLength || 0);
            return `${s.storageCode || "未指定"}: ${isRoll ? `${formatDecimal(totalSLength, 2, "0")} M` : `${s.length > 0 ? `${formatDecimal(s.length, 0, "0")} mm` : "-"}`}`;
          }).join('\n')}
        </div>
      );

      return (
        <Tooltip title={tooltipContent} placement="topLeft" color="rgba(15, 23, 42, 0.95)">
          <span className="cursor-help border-b border-dashed border-slate-400 select-all">{displayText}</span>
        </Tooltip>
      );
    },
  },
  {
    label: "在庫可用長度",
    name: "availableLength",
    width: 150,
    align: "right",
    render: (_, record: any) => {
      const isRoll = record.materialForm === "R";
      if (!isRoll) return "-";
      
      const area = record.quantity || 0;
      const width = record.widthMm || 0;
      let lengthM = 0;
      if (width > 0) {
        lengthM = (area * 1000) / width;
      }

      const tooltipContent = (
        <div style={{ whiteSpace: "pre-line", padding: "2px 4px" }}>
          {(record.storages || []).map((s: any) => 
            `${s.storageCode || "未指定"}: ${formatDecimal(s.length, 2, "0")} M`
          ).join('\n')}
        </div>
      );

      return (
        <Tooltip title={tooltipContent} placement="topLeft" color="rgba(15, 23, 42, 0.95)">
          <span className="cursor-help border-b border-dashed border-blue-400 font-semibold text-blue-600 dark:text-blue-400 select-all">{formatDecimal(lengthM, 2, "0")} M</span>
        </Tooltip>
      );
    },
  },
  {
    label: "凍結待驗長度",
    name: "frozenLength",
    width: 150,
    align: "right",
    render: (_, record: any) => {
      const isRoll = record.materialForm === "R";
      if (!isRoll) return "-";
      
      const area = record.frozenQuantity || 0;
      const width = record.widthMm || 0;
      let lengthM = 0;
      if (width > 0) {
        lengthM = (area * 1000) / width;
      }

      const tooltipContent = (
        <div style={{ whiteSpace: "pre-line", padding: "2px 4px" }}>
          {(record.storages || []).map((s: any) => 
            `${s.storageCode || "未指定"}: ${formatDecimal(s.frozenLength, 2, "0")} M`
          ).join('\n')}
        </div>
      );

      return (
        <Tooltip title={tooltipContent} placement="topLeft" color="rgba(15, 23, 42, 0.95)">
          <span className="cursor-help border-b border-dashed border-amber-400 font-semibold text-amber-600 dark:text-amber-400 select-all">{formatDecimal(lengthM, 2, "0")} M</span>
        </Tooltip>
      );
    },
  },
  {
    label: "庫存總面積",
    name: "totalArea",
    width: 160,
    align: "right",
    render: (_, record: any) => {
      const isRoll = record.materialForm === "R";
      const val = (record.quantity || 0) + (record.frozenQuantity || 0);
      const displayText = isRoll 
        ? `${formatDecimal(val, 4, "0")} m²` 
        : `${formatDecimal(val, 0, "0")} pcs`;

      const tooltipContent = (
        <div style={{ whiteSpace: "pre-line", padding: "2px 4px" }}>
          {(record.storages || []).map((s: any) => {
            const sTotal = (s.quantity || 0) + (s.frozenQuantity || 0);
            return `${s.storageCode || "未指定"}: ${isRoll ? `${formatDecimal(sTotal, 4, "0")} m²` : `${formatDecimal(sTotal, 0, "0")} pcs`}`;
          }).join('\n')}
        </div>
      );

      return (
        <Tooltip title={tooltipContent} placement="topLeft" color="rgba(15, 23, 42, 0.95)">
          <span className="cursor-help border-b border-dashed border-slate-400 font-semibold select-all">{displayText}</span>
        </Tooltip>
      );
    },
  },
  {
    label: "在庫可用面積",
    name: "quantity",
    width: 160,
    align: "right",
    render: (val: any, record: any) => {
      const isRoll = record.materialForm === "R";
      const displayText = isRoll 
        ? `${formatDecimal(val, 4, "0")} m²` 
        : `${formatDecimal(val, 0, "0")} pcs`;

      const tooltipContent = (
        <div style={{ whiteSpace: "pre-line", padding: "2px 4px" }}>
          {(record.storages || []).map((s: any) => 
            `${s.storageCode || "未指定"}: ${isRoll ? `${formatDecimal(s.quantity, 4, "0")} m²` : `${formatDecimal(s.quantity, 0, "0")} pcs`}`
          ).join('\n')}
        </div>
      );

      return (
        <Tooltip title={tooltipContent} placement="topLeft" color="rgba(15, 23, 42, 0.95)">
          <span className="cursor-help border-b border-dashed border-blue-400 font-semibold text-blue-600 dark:text-blue-400 select-all">{displayText}</span>
        </Tooltip>
      );
    },
  },
  {
    label: "凍結待驗面積",
    name: "frozenQuantity",
    width: 160,
    align: "right",
    render: (val: any, record: any) => {
      const isRoll = record.materialForm === "R";
      const displayText = isRoll 
        ? `${formatDecimal(val, 4, "0")} m²` 
        : `${formatDecimal(val, 0, "0")} pcs`;

      const tooltipContent = (
        <div style={{ whiteSpace: "pre-line", padding: "2px 4px" }}>
          {(record.storages || []).map((s: any) => 
            `${s.storageCode || "未指定"}: ${isRoll ? `${formatDecimal(s.frozenQuantity, 4, "0")} m²` : `${formatDecimal(s.frozenQuantity, 0, "0")} pcs`}`
          ).join('\n')}
        </div>
      );

      return (
        <Tooltip title={tooltipContent} placement="topLeft" color="rgba(15, 23, 42, 0.95)">
          <span className="cursor-help border-b border-dashed border-amber-400 font-semibold text-amber-600 dark:text-amber-400 select-all">{displayText}</span>
        </Tooltip>
      );
    },
  },
];

// ============================================================================
// 2. 實體一卷一卡 (LPN / WIP Roll Traceability) 欄位與搜尋
// ============================================================================

export const rollStateOptions = [
  { label: "待驗 (Uninspected)", value: "Uninspected" },
  { label: "在庫 (INSTOCK)", value: "INSTOCK" },
  { label: "車間 WIP (WIP)", value: "WIP" },
  { label: "已報廢 (Scrapped)", value: "Scrapped" },
  { label: "已消耗 (CONSUMED)", value: "CONSUMED" }
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
    componentType: "DictSelect",
    componentProps: { dictKey: "STORAGE", optionsFilter: (opt: any) => opt.type === "MAT" },
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
  onSelectParentBarcode?: (barcode: string) => void,
  onScrapRoll?: (record: any) => void
): TableColumnConfig<any>[] => [
  {
    label: "卷卡號 (LPN)",
    name: "rollNo",
    width: 180,
    render: (val: string) => <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{val || "-"}</span>,
  },
  {
    label: "狀態",
    name: "rollStatus",
    width: 120,
    align: "center",
    render: (val: any) => {
      const upper = String(val || '').toUpperCase();
      if (upper === 'UNINSPECTED') return <Tag color="processing">待驗 (Uninspected)</Tag>;
      if (upper === 'INSTOCK') return <Tag color="success">在庫 (INSTOCK)</Tag>;
      if (upper === 'WIP') return <Tag color="warning">車間 WIP</Tag>;
      if (upper === 'CONSUMED') return <Tag color="default">已消耗</Tag>;
      if (upper === 'SCRAPPED' || upper === 'SCRAP') return <Tag color="error">已報廢</Tag>;
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
    width: 110,
    align: "right",
    render: (val: any) => formatDecimal(val, 4, "-"),
  },
  {
    label: "管芯直徑 (mm)",
    name: "measuredCoreDiaMm",
    width: 110,
    align: "right",
    render: (val: any) => formatDecimal(val, 2, "76.2"),
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
    width: 110,
    align: "right",
    render: (val: any) => <span className="font-semibold text-blue-600 dark:text-blue-400">{formatDecimal(val, 4, "0")}</span>,
  },
  {
    label: "每平米成本",
    name: "costPerSqm",
    width: 110,
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
    label: "建檔時間",
    name: "createdAt",
    width: 180,
    render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-",
  },
  {
    label: "最後異動時間",
    name: "updatedAt",
    width: 180,
    render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-",
  },
  {
    label: "操作",
    name: "action",
    width: 120,
    align: "center",
    render: (_, record: any) => {
      const upper = String(record.rollStatus || '').toUpperCase();
      const canScrap = upper === 'INSTOCK' || upper === 'AVAILABLE';
      
      if (!canScrap) return "-";
      
      return (
        <Button 
          type="link" 
          danger 
          size="small"
          onClick={() => onScrapRoll && onScrapRoll(record)}
        >
          報廢
        </Button>
      );
    }
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
  ADJ: { label: "庫存調整", color: "orange" },
  SCRAP: { label: "報廢", color: "error" },
  WT_CONSUME: { label: "製令消耗", color: "cyan" },
  TR: { label: "原料調撥", color: "geekblue" },
};

export const transactionTypeOptions = [
  { label: "原料調撥 (TR)", value: "TR" },
  { label: "採購入庫 (PD / PURCHASE_RECEIPT)", value: "PD" },
  { label: "品檢入庫 (IQC)", value: "IQC" },
  { label: "生產領料 (ISS / PRODUCTION_ISSUE)", value: "ISS" },
  { label: "生產退料 (RET / PRODUCTION_RETURN)", value: "RET" },
  { label: "分切加工 (SPLIT)", value: "SPLIT" },
  { label: "庫存調整 (ADJUST / ADJUSTMENT / ADJ)", value: "ADJ" },
  { label: "製令消耗 (WT_CONSUME)", value: "WT_CONSUME" },
  { label: "報廢 (SCRAP)", value: "SCRAP" }
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
    componentType: "DictSelect",
    componentProps: { dictKey: "STORAGE", optionsFilter: (opt: any) => opt.type === "MAT" },
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
    label: "異動數量 (長度)",
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
    label: "LPN 寬度",
    name: "widthMm",
    width: 100,
    align: "right",
    render: (val: any) => val ? `${Number(val).toLocaleString()} mm` : "-",
  },
  {
    label: "異動面積",
    name: "areaSqm",
    width: 130,
    align: "right",
    render: (val: any, record: any) => {
      if (val == null) return "-";
      const sign = record.signFlag || 1;
      const amount = Number(val) * sign;
      const formatted = formatDecimal(val, 4, "0");
      if (amount > 0) {
        return <span className="text-green-600 dark:text-green-400 font-bold">+{formatted} SQM</span>;
      } else if (amount < 0) {
        return <span className="text-red-600 dark:text-red-400 font-bold">-{formatted} SQM</span>;
      }
      return <span className="font-semibold">{formatted} SQM</span>;
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
