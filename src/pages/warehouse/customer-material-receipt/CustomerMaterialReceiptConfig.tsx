import type { TableColumnConfig, FormFieldConfig } from "@/components/Form/types";
import { Tag, InputNumber, Input } from "antd";
import dayjs from "dayjs";
import { z } from "zod";
import { Link } from "react-router-dom";
import { EllipsisText } from "@/components/Table/EllipsisText";
import { DictSelect } from "@/components/Form/DictSelect";

export const customerMaterialReceiptSearchConfig = (): any[] => [
  {
    name: "subType",
    label: "單據類別",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "客供來料 (CM)", value: "CM" },
        { label: "製令半成品 (SEMI)", value: "SEMI" },
      ],
      placeholder: "全部類別",
      allowClear: true,
    },
    colSpan: 2,
  },
  {
    name: "documentNumber",
    label: "入庫單號",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "businessPartnerCode",
    label: "客商代碼",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "dateRange",
    label: "入庫日期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
  {
    name: "status",
    label: "狀態",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "待確認", value: "Unconfirmed" },
        { label: "已確認", value: "Confirmed" },
        { label: "已結案", value: "Closed" },
      ],
      allowClear: true,
    },
    colSpan: 2,
  },
];

export const getStatusTagProps = (
  status?: string | null,
  confirmDate?: string | null,
  closeDate?: string | null,
) => {
  if (closeDate) return { color: "default", text: "已結案" };
  if (confirmDate) return { color: "success", text: "已確認" };

  if (!status) return { color: "warning", text: "待確認" };
  switch (status.toUpperCase()) {
    case "CONFIRMED":
      return { color: "success", text: "已確認" };
    case "CLOSED":
      return { color: "default", text: "已結案" };
    case "UNCONFIRMED":
    default:
      return { color: "warning", text: "待確認" };
  }
};

export const getStatusTag = (
  status?: string | null,
  confirmDate?: string | null,
  closeDate?: string | null,
) => {
  const props = getStatusTagProps(status, confirmDate, closeDate);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", height: "24px", verticalAlign: "middle" }}>
      <Tag color={props.color} className="m-0">{props.text}</Tag>
    </div>
  );
};

export const getSubTypeTag = (subType?: string | null) => {
  const isSemi = (subType || "").toUpperCase() === "SEMI";
  if (isSemi) {
    return <Tag color="blue" className="m-0">製令半成品</Tag>;
  }
  return <Tag color="green" className="m-0">客供來料</Tag>;
};

export const mainTableColumns = (): TableColumnConfig[] => [
  {
    label: "入庫單號",
    name: "documentNumber",
    sortable: { multiple: 1 },
    width: 140,
    render: (val: string) => (
      <span style={{ display: "inline-block", lineHeight: "24px", verticalAlign: "middle", width: "100%", textAlign: "left", fontWeight: 500 }}>
        {val}
      </span>
    ),
  },
  {
    label: "單據類別",
    name: "subType",
    sortable: { multiple: 2 },
    width: 110,
    align: "center",
    render: (val: string) => (
      <div style={{ display: "inline-flex", alignItems: "center", height: "24px", verticalAlign: "middle" }}>
        {getSubTypeTag(val)}
      </div>
    ),
  },
  {
    label: "入庫日期",
    name: "documentDate",
    sortable: { multiple: 3 },
    width: 110,
    render: (val: string) => (
      <span style={{ display: "inline-block", lineHeight: "24px", verticalAlign: "middle", width: "100%", textAlign: "left" }}>
        {val ? dayjs(val).format("YYYY-MM-DD") : "-"}
      </span>
    ),
  },
  {
    label: "單據狀態",
    name: "status",
    sortable: { multiple: 4 },
    width: 100,
    align: "center",
    render: (status: string, record: any) =>
      getStatusTag(status, record?.confirmDate, record?.closeDate),
  },
  {
    label: "來源/參考單號",
    name: "referenceNumber",
    width: 150,
    render: (val: string, record: any) => {
      if (!val) {
        return (
          <span style={{ display: "inline-block", lineHeight: "24px", verticalAlign: "middle", width: "100%", textAlign: "left", color: "var(--ant-color-text-quaternary)" }}>
            -
          </span>
        );
      }
      const isSemi = (record?.subType || "").toUpperCase() === "SEMI";
      if (isSemi || val.startsWith("WO")) {
        return (
          <Link
            to={`/production-quality/work-orders/${val}`}
            style={{
              color: "#1668dc",
              textDecoration: "underline",
              cursor: "pointer",
              lineHeight: "24px",
              display: "inline-block",
              verticalAlign: "middle",
            }}
          >
            <EllipsisText text={val} maxWidth={140} />
          </Link>
        );
      }
      return (
        <span style={{ display: "inline-block", lineHeight: "24px", verticalAlign: "middle", width: "100%", textAlign: "left" }}>
          <EllipsisText text={val} maxWidth={140} />
        </span>
      );
    },
  },
  {
    label: "客戶",
    name: "businessPartnerName",
    width: 190,
    render: (val: string, record: any) => {
      const isSemi = (record?.subType || "").toUpperCase() === "SEMI";
      const displayCode = record.partnerRoleCode || record.businessPartnerCode;
      const bpCode = record.businessPartnerCode;
      if (!bpCode) {
        return (
          <span style={{ display: "inline-block", lineHeight: "24px", verticalAlign: "middle", width: "100%", textAlign: "left", color: isSemi ? "var(--ant-color-text-secondary)" : "var(--ant-color-text-quaternary)" }}>
            {isSemi ? "內部自製" : "-"}
          </span>
        );
      }
      const name =
        val && displayCode
          ? `[${displayCode}] ${val}`
          : val || displayCode || "-";
      return (
        <Link
          to={`/basic/business-partners/${bpCode}`}
          style={{
            color: "#1668dc",
            textDecoration: "underline",
            cursor: "pointer",
            lineHeight: "24px",
            display: "inline-block",
            verticalAlign: "middle",
          }}
        >
          <EllipsisText text={name} maxWidth={170} />
        </Link>
      );
    },
  },
  {
    label: "製令成本/金額",
    name: "actualTotalCost",
    width: 130,
    align: "right",
    render: (val: number | null | undefined, record: any) => {
      const isSemi = (record?.subType || "").toUpperCase() === "SEMI";
      if (isSemi && val != null) {
        return (
          <span style={{ display: "inline-block", lineHeight: "24px", verticalAlign: "middle", width: "100%", textAlign: "right", fontWeight: 500 }}>
            NT$ {Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        );
      }
      return (
        <span style={{ display: "inline-block", lineHeight: "24px", verticalAlign: "middle", width: "100%", textAlign: "right", color: "var(--ant-color-text-quaternary)" }}>
          -
        </span>
      );
    },
  },
  {
    label: "送貨單號 / 憑證號",
    name: "invoiceNumber",
    width: 150,
    render: (val: string) => (
      <span style={{ display: "inline-block", lineHeight: "24px", verticalAlign: "middle", width: "100%", textAlign: "left" }}>
        {val || "-"}
      </span>
    ),
  },
  {
    label: "備註",
    name: "notes",
    width: 180,
    render: (val: string) => (
      <span style={{ display: "inline-block", lineHeight: "24px", verticalAlign: "middle", width: "100%", textAlign: "left" }}>
        <EllipsisText text={val || "-"} maxWidth={160} />
      </span>
    ),
  },
];

export const masterFormConfig = (isViewMode: boolean): FormFieldConfig[] => [
  {
    name: "documentDate",
    label: "單據日期",
    componentType: "DatePicker",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      style: { width: "100%" },
    },
    editable: "always",
  },
  {
    name: "subType",
    label: "單據類別",
    componentType: "Select",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      options: [
        { label: "客供來料 (CM)", value: "CM" },
        { label: "製令半成品 (SEMI)", value: "SEMI" },
      ],
    },
    editable: "createOnly",
  },
  {
    name: "referenceNumber",
    label: "來源/參考單號",
    componentType: "Input",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      placeholder: "請輸入參考單號 (如製令 WO 單號)",
    },
    editable: "always",
  },
  {
    name: "businessPartnerCode",
    label: "客戶",
    componentType: "AsyncSelect",
    colSpan: 2,
    componentProps: (context: any) => {
      const isSemi = (context?.values?.subType || "").toUpperCase() === "SEMI";
      return {
        disabled: isViewMode,
        configKey: "CUSTOMER", // 鎖定客戶角色，符合委託代工邏輯
        allowClear: true,
        placeholder: isSemi ? "內部自製半成品可免填客戶" : "請選擇客戶",
      };
    },
    editable: "createOnly",
    dynamicValidation: (context) => {
      const isSemi = (context?.values?.subType || "").toUpperCase() === "SEMI";
      if (isSemi) {
        return z.string().optional().nullable();
      }
      return z.string().min(1, "請選擇客戶");
    },
  },
  {
    name: "actualTotalCost",
    label: "製令實際總成本",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "never",
    hidden: (context) => {
      const isSemi = (context?.values?.subType || "").toUpperCase() === "SEMI";
      return !isSemi && context?.values?.actualTotalCost == null;
    },
    componentProps: {
      disabled: true,
      formatter: (val: any) => (val != null ? `NT$ ${Number(val).toLocaleString()}` : ""),
      style: { width: "100%", fontWeight: "bold" },
    },
  },
  {
    name: "invoiceNumber",
    label: "送貨單號/憑證號",
    componentType: "Input",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      placeholder: "請輸入送貨單號或憑證號",
    },
    editable: "always",
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    colSpan: 1,
    componentProps: {
      disabled: isViewMode,
      placeholder: "備註資訊",
      rows: 2,
    },
    editable: "always",
  },
];

export const itemTableColumns = (): TableColumnConfig[] => [
  {
    label: "項次",
    name: "lineNumber",
    width: 80,
    align: "center",
  },
  {
    label: "原料品編",
    name: "materialCode",
    width: 140,
  },
  {
    label: "原料品名",
    name: "materialName",
    width: 180,
    render: (val: string) => <EllipsisText text={val || "-"} maxWidth={160} />,
  },
  {
    label: "類型",
    name: "isRoll",
    width: 90,
    align: "center",
    render: (isRoll: boolean) => (isRoll ? "捲料" : "片料"),
  },
  {
    label: "包裝數",
    name: "rollCount",
    width: 90,
    align: "right",
    render: (val: number) => Number(val || 0).toLocaleString(),
  },
  {
    label: "規格",
    name: "width",
    width: 150,
    render: (_: any, record: any) => {
      if (record.isRoll) {
        return `${record.width} mm × ${record.length} m`;
      }
      return `${record.width} mm × ${record.length} mm`;
    },
  },
  {
    label: "到貨實物量",
    name: "physicalQuantity",
    width: 120,
    align: "right",
    render: (val: number, record: any) => {
      const unit = record.isRoll ? "米 (M)" : "張 (PCS)";
      return `${Number(val || 0).toLocaleString()} ${unit}`;
    },
  },
  {
    label: "入庫面積 (SQM)",
    name: "quantity",
    width: 120,
    align: "right",
    render: (val: number) => <span style={{ fontWeight: 500 }}>{Number(val || 0).toFixed(2)}</span>,
  },
  {
    label: "目的儲位",
    name: "targetStorageCode",
    width: 110,
  },
  {
    label: "備註",
    name: "notes",
    width: 150,
    render: (val: string) => <EllipsisText text={val || "-"} maxWidth={130} />,
  },
];

export const itemFormConfig = (isViewMode: boolean): FormFieldConfig[] => [
  {
    name: "lineNumber",
    label: "項次",
    componentType: "Input",
    editable: "never",
    colSpan: 4,
  },
  {
    name: "materialCode",
    label: "原料品編",
    componentType: "Input",
    editable: "never",
    colSpan: 4,
  },
  {
    name: "materialName",
    label: "原料名稱",
    componentType: "Input",
    editable: "never",
    colSpan: 4,
  },
  {
    name: "unit",
    label: "單位",
    componentType: "Custom",
    editable: "never",
    colSpan: 4,
    customRender: (_props: any, context: any) => {
      const isRoll = context?.values?.isRoll ?? true;
      const unitStr = isRoll ? "卷" : "pcs";
      return (
        <Input
          value={unitStr}
          disabled
          style={{ width: "100%", fontWeight: "bold" }}
        />
      );
    }
  },
  {
    name: "targetStorageCode",
    label: "目的儲位",
    componentType: "Custom",
    editable: "never",
    customRender: (field: any) => (
      <DictSelect {...field} dictKey="STORAGE" disabled />
    ),
    colSpan: 4,
    validation: z.string().min(1, "請選擇目的儲位"),
  },
  {
    name: "rollCount",
    label: "包裝數",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      min: 1,
      precision: 0,
      controls: false,
    },
    validation: z.number().min(1, "包裝數必須大於等於 1"),
  },
  {
    name: "width",
    label: "規格寬度 (mm)",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      min: 0.1,
      precision: 4,
      controls: false,
    },
    validation: z.number().min(0.1, "寬度必須大於 0"),
  },
  {
    name: "length",
    label: "長度",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
    componentProps: (context: any) => {
      const isRoll = context?.values?.isRoll ?? true;
      return {
        disabled: isViewMode,
        min: 0.1,
        precision: 4,
        controls: false,
        formatter: isViewMode
          ? (val: any) => val != null ? `${Number(val).toLocaleString()} ${isRoll ? "M" : "mm"}` : ""
          : undefined
      };
    },
    validation: z.number().min(0.1, "長度必須大於 0"),
  },
  {
    name: "physicalQuantity",
    label: "實物到貨總量 (M / PCS)",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      min: 0.1,
      precision: 4,
      controls: false,
    },
    validation: z.number().min(0.1, "到貨量必須大於 0"),
  },
  {
    name: "quantity",
    label: "預估面積 (SQM)",
    componentType: "Custom",
    editable: "always",
    colSpan: 4,
    customRender: (_props: any, context: any) => {
      const isRoll = context?.values?.isRoll ?? true;
      const rollCount = context?.values?.rollCount || 0;
      const width = context?.values?.width || 0;
      const length = context?.values?.length || 0;
      const physicalQuantity = context?.values?.physicalQuantity || 0;
      
      const widthM = width / 1000;
      const totalSqm = isRoll 
        ? rollCount * length * widthM 
        : physicalQuantity * widthM;
        
      return (
        <InputNumber
          value={Number(totalSqm.toFixed(2))}
          disabled
          style={{ width: "100%", fontWeight: "bold", color: "#2563eb" }}
          formatter={(val) => val != null ? `${val} SQM` : ""}
        />
      );
    }
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "always",
    componentProps: { disabled: isViewMode, rows: 2 },
    colSpan: 1,
  },
];

// Zod validation schemas
export const customerMaterialReceiptSchema = z.object({
  documentDate: z.string().min(1, "請選擇單據日期"),
  subType: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  businessPartnerCode: z.string().optional().nullable(),
  actualTotalCost: z.number().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const customerMaterialReceiptItemSchema = z.object({
  materialCode: z.string().min(1, "請選擇物料"),
  targetStorageCode: z.string().min(1, "請選擇儲位"),
  isRoll: z.boolean(),
  rollCount: z.number().int().min(1, "分卷/包數必須大於 0"),
  width: z.number().positive("寬度必須大於 0"),
  length: z.number().positive("長度必須大於 0"),
  physicalQuantity: z.number().positive("到貨量必須大於 0"),
  notes: z.string().optional().nullable(),
});
