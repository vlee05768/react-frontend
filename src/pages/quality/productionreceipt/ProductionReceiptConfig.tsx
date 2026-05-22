



export const productionReceiptSearchConfig = (): any[] => [
  {
    name: "documentNumber",
    label: "單據號碼",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "dateRange",
    label: "單據日期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
];

import type {
  TableColumnConfig,
  FormFieldConfig,
} from "@/components/Form/types";
import { Tag } from "antd";
import dayjs from "dayjs";
export const getStatusTagProps = (
  status?: string | null,
  confirmDate?: string | null,
  closeDate?: string | null
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
  closeDate?: string | null
) => {
  const props = getStatusTagProps(status, confirmDate, closeDate);
  return <Tag color={props.color}>{props.text}</Tag>;
};

export const mainTableColumns = (): TableColumnConfig[] => [
  { label: "單據號碼", name: "documentNumber", sortable: { multiple: 1 }, width: 140 },
  {
    label: "狀態",
    name: "status",
    sortable: { multiple: 3 },
    width: 100,
    align: "center",
    render: (status: string, record: any) =>
      getStatusTag(status, record?.confirmDate, record?.closeDate),
  },
  {
    label: "單據日期",
    name: "documentDate",
    sortable: { multiple: 2 },
    width: 100,
    render: (val: string) => (val ? dayjs(val).format("YYYY-MM-DD") : "-"),
  },
  {
    label: "負責人",
    name: "responsibleUserName",
    width: 100,
    render: (v: string) => v || "-",
  },
  {
    label: "確認日期",
    name: "confirmDate",
    width: 180,
    render: (val: string) => (val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-"),
  },
  {
    label: "確認人",
    name: "confirmUserName",
    width: 100,
    render: (v: string) => v || "-",
  },
  { label: "備註", name: "notes", width: 240, ellipsis: true },
];

export const mainFormConfig = (): FormFieldConfig[] => [
  {
    name: "documentNumber",
    label: "單據號碼",
    componentType: "Input",
    editable: "never",
    colSpan: 2,
  },
  {
    name: "documentDate",
    label: "單據日期",
    componentType: "DatePicker",
    editable: "never",
    colSpan: 2,
  },
  {
    name: "status",
    label: "狀態",
    componentType: "Input",
    editable: "never",
    customRender: (_field, context) =>
      getStatusTag(
        context.values.status,
        context.values.confirmDate,
        context.values.closeDate
      ),
    colSpan: 2,
  },
  {
    name: "responsibleUserName",
    label: "負責人員",
    componentType: "Input",
    editable: "never",
    colSpan: 2,
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "never",
    componentProps: { rows: 2 },
    colSpan: 1,
  },
];

export const itemTableColumns = (): TableColumnConfig[] => [
  {
    label: "序號",
    name: "serialNumber",
    width: 80,
    align: "center",
  },
  {
    label: "存貨類型",
    name: "inventoryType",
    width: 90,
    align: "center",
    render: (val: string) => {
      const map: Record<string, { label: string; color: string }> = {
        M: { label: "原料", color: "default" },
        P: { label: "產品", color: "success" },
        O: { label: "半成品", color: "warning" },
      };
      const config = map[val];
      return config ? <Tag color={config.color} className="m-0">{config.label}</Tag> : (val || "-");
    },
  },
  {
    label: "製令單號",
    name: "referenceNumber",
    width: 150,
  },
  {
    label: "料號",
    name: "inventoryCode",
    width: 140,
  },
  {
    label: "品名",
    name: "inventoryName",
    width: 220,
    ellipsis: true,
  },
  {
    label: "入庫數量",
    name: "quantity",
    width: 100,
    align: "right",
    render: (val: number) => val != null ? Number(val).toLocaleString("zh-TW") : "0",
  },
  {
    label: "QC完成",
    name: "reversalQuantity",
    width: 100,
    align: "right",
    render: (val: number, record: any) => {
      const qc = val ?? 0;
      const total = record.quantity ?? 0;
      const isComplete = total > 0 && qc >= total;
      return (
        <span style={{ color: isComplete ? "var(--ant-color-success)" : "inherit" }}>
          {qc.toLocaleString("zh-TW")}
        </span>
      );
    },
  },
  {
    label: "儲位",
    name: "targetStorageCode",
    width: 110,
    align: "center",
    render: (val: string) => val ? <Tag color="blue" className="m-0">{val}</Tag> : "-",
  },
  {
    label: "備註",
    name: "notes",
    width: 140,
    ellipsis: true,
  },
];

export const itemFormConfig = (): FormFieldConfig[] => [
  { name: "lineNumber", label: "序號", componentType: "Input", editable: "never", colSpan: 2 },
  { name: "inventoryType", label: "存貨類型", componentType: "Input", editable: "never", colSpan: 2, customRender: (_field, context) => {
      const val = context.values.inventoryType;
      const map: Record<string, { label: string; color: string }> = {
        Material: { label: "原料", color: "default" },
        Product: { label: "產品", color: "success" },
        SemiFinished: { label: "半成品", color: "warning" },
      };
      const config = map[val];
      return config ? <Tag color={config.color}>{config.label}</Tag> : (val || "-");
  } },
  { name: "referenceNumber", label: "製令單號", componentType: "Input", editable: "never", colSpan: 2 },
  { name: "inventoryCode", label: "料號", componentType: "Input", editable: "never", colSpan: 2 },
  { name: "inventoryName", label: "品名", componentType: "Input", editable: "never", colSpan: 4 },
  { name: "quantity", label: "入庫數量", componentType: "InputNumber", editable: "never", colSpan: 2, componentProps: { style: { width: "100%" } } },
  { name: "reversalQuantity", label: "QC完成", componentType: "InputNumber", editable: "never", colSpan: 2, componentProps: { style: { width: "100%" } } },
  { name: "targetStorageCode", label: "儲位", componentType: "Input", editable: "never", colSpan: 2 },
  { name: "notes", label: "備註", componentType: "TextArea", editable: "always", colSpan: 4, componentProps: { rows: 2 } },
];
