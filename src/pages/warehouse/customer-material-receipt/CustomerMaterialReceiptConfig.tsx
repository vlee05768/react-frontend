import type { TableColumnConfig, FormFieldConfig } from "@/components/Form/types";
import { Tag } from "antd";
import dayjs from "dayjs";
import { z } from "zod";
import { Link } from "react-router-dom";
import { EllipsisText } from "@/components/Table/EllipsisText";

export const customerMaterialReceiptSearchConfig = (): any[] => [
  {
    name: "documentNumber",
    label: "客供單號",
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
  return <Tag color={props.color}>{props.text}</Tag>;
};

export const mainTableColumns = (): TableColumnConfig[] => [
  {
    label: "客供單號",
    name: "documentNumber",
    sortable: { multiple: 1 },
    width: 140,
  },
  {
    label: "入庫日期",
    name: "documentDate",
    sortable: { multiple: 2 },
    width: 110,
    render: (val: string) => (val ? dayjs(val).format("YYYY-MM-DD") : "-"),
  },
  {
    label: "單據狀態",
    name: "status",
    sortable: { multiple: 3 },
    width: 100,
    align: "center",
    render: (status: string, record: any) =>
      getStatusTag(status, record?.confirmDate, record?.closeDate),
  },
  {
    label: "委託代工客戶",
    name: "businessPartnerName",
    width: 200,
    render: (val: string, record: any) => {
      const displayCode = record.partnerRoleCode || record.businessPartnerCode;
      const bpCode = record.businessPartnerCode;
      const name =
        val && displayCode
          ? `[${displayCode}] ${val}`
          : val || displayCode || "-";
      if (!bpCode) return "-";
      return (
        <Link
          to={`/basic/business-partners/${bpCode}`}
          style={{
            color: "#1668dc",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          <EllipsisText text={name} maxWidth={180} />
        </Link>
      );
    },
  },
  {
    label: "送貨單號 / 憑證號",
    name: "invoiceNumber",
    width: 150,
  },
  {
    label: "備註",
    name: "notes",
    width: 200,
    render: (val: string) => <EllipsisText text={val || "-"} maxWidth={180} />,
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
    name: "businessPartnerCode",
    label: "客戶",
    componentType: "AsyncSelect",
    colSpan: 2,
    componentProps: {
      disabled: isViewMode,
      configKey: "CUSTOMER", // 鎖定客戶角色，符合委託代工邏輯
    },
    editable: "createOnly",
  },
  {
    name: "invoiceNumber",
    label: "送貨單號/憑證號",
    componentType: "Input",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      placeholder: "請輸入客戶送貨單號",
    },
    editable: "always",
  },
  // {
  //   name: "address",
  //   label: "送貨地址",
  //   componentType: "Input",
  //   colSpan: 6,
  //   componentProps: {
  //     disabled: isViewMode,
  //     placeholder: "請輸入送貨地址",
  //   },
  //   editable: "always",
  // },
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
    label: "卷/包數",
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
    render: (val: number) => <span style={{ fontWeight: 500 }}>{Number(val || 0).toFixed(4)}</span>,
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
    name: "materialCode",
    label: "原料品編 (預先建檔)",
    componentType: "AsyncSelect",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      configKey: "MATERIAL",
    },
    editable: "createOnly",
  },
  {
    name: "targetStorageCode",
    label: "目的儲位",
    componentType: "AsyncSelect",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      configKey: "STORAGE",
      placeholder: "預設 QC 待驗倉",
    },
    editable: "always",
  },
  {
    name: "isRoll",
    label: "物料型態",
    componentType: "Select",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      options: [
        { label: "捲料 (R)", value: true },
        { label: "片料 (S)", value: false },
      ],
    },
    editable: "createOnly",
  },
  {
    name: "rollCount",
    label: "分卷/分包數",
    componentType: "InputNumber",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      min: 1,
      style: { width: "100%" },
    },
    editable: "always",
  },
  {
    name: "width",
    label: "規格寬度 (mm)",
    componentType: "InputNumber",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      min: 0.1,
      style: { width: "100%" },
    },
    editable: "always",
  },
  {
    name: "length",
    label: "規格長度 (捲材米 M / 片材毫米 mm)",
    componentType: "InputNumber",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      min: 0.1,
      style: { width: "100%" },
    },
    editable: "always",
  },
  {
    name: "physicalQuantity",
    label: "實物到貨總量 (總米數 / 總張數)",
    componentType: "InputNumber",
    colSpan: 4,
    componentProps: {
      disabled: isViewMode,
      min: 0.1,
      style: { width: "100%" },
      placeholder: "後端會依此重算總面積 SQM",
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
      placeholder: "項目備註資訊",
      rows: 2,
    },
    editable: "always",
  },
];

// Zod validation schemas
export const customerMaterialReceiptSchema = z.object({
  documentDate: z.string().min(1, "請選擇單據日期"),
  businessPartnerCode: z.string().min(1, "請選擇客戶"),
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
