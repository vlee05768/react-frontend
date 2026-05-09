import { z } from "zod";
import type { SearchFieldConfig, FormFieldConfig, TableColumnConfig } from "@/components/Form/types";
import { Tag } from "antd";
import { EllipsisText } from "@/components/Table/EllipsisText";
import { CheckCircleOutlined, SyncOutlined, LockOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AsyncSelect } from "@/components/Form/AsyncSelect";
import { DictSelect } from "@/components/Form/DictSelect";

export const getStatusTag = (status: string | null | undefined) => {
  if (!status) return <Tag color="default">未確認</Tag>;
  switch (status.toUpperCase()) {
    case "UNCONFIRMED":
      return <Tag color="warning" icon={<SyncOutlined />}>未確認</Tag>;
    case "CONFIRMED":
      return <Tag color="success" icon={<CheckCircleOutlined />}>已確認</Tag>;
    case "CLOSED":
      return <Tag color="default" icon={<LockOutlined />}>已結案</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

export const mainSearchFormConfig = (): SearchFieldConfig[] => [
  {
    name: "DocumentNumber",
    label: "單據號碼",
    componentType: "Input",
    colSpan: 8,
  },
  {
    name: "DateRange",
    label: "調整日期區間",
    componentType: "DateRangePicker",
    colSpan: 8,
  },
  {
    name: "Others",
    label: "其他條件",
    componentType: "Input",
    colSpan: 8,
  },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { label: "單據號碼", name: "documentNumber", width: 140 },
  { 
    label: "調整日期", 
    name: "documentDate", 
    width: 110,
    render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD") : "-"
  },
  {
    label: "狀態",
    name: "status",
    width: 100,
    align: "center",
    render: (val: string) => getStatusTag(val)
  },
  { label: "負責人員", name: "responsibleUserName", width: 100 },
  { label: "備註", name: "notes", width: 200, render: (val: string) => <EllipsisText text={val} maxWidth={180} /> },
  { label: "建立時間", name: "createdAt", width: 160, render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-" },
  { label: "更新時間", name: "updatedAt", width: 160, render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-" },
];

export const mainFormConfig = (_isUpdateMode: boolean = false): FormFieldConfig[] => [
  {
    name: "documentNumber",
    label: "單據號碼",
    componentType: "Input",
    editable: "never",
    autoGenerate: true,
    colSpan: 2,
  },
  {
    name: "documentDate",
    label: "調整日期",
    componentType: "DatePicker",
    editable: "always",
    validation: z.any().refine(val => !!val, "請選擇調整日期"),
    colSpan: 2,
  },
  {
    name: "status",
    label: "狀態",
    componentType: "Input",
    editable: "never",
    customRender: (_field, context) => {
      const status = context.values.status;
      return getStatusTag(status);
    },
    colSpan: 2,
  },
  {
    name: "responsibleById",
    label: "負責人員",
    componentType: "Custom",
    editable: "always",
    customRender: (field, _context) => (
      <DictSelect
        {...field}
        dictKey="EMPLOYEE"
      />
    ),
    colSpan: 2,
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "always",
    componentProps: { rows: 3 },
    colSpan: 1,
  },
];

export const itemTableColumns = (): TableColumnConfig[] => [
  { 
    label: "項次", 
    name: "serialNumber", 
    width: 60, 
    align: "center",
    render: (val: string, record: any, index: number) => {
      if (val) return val;
      if (record.lineNumber && record.documentNumber) {
        return record.lineNumber.replace(record.documentNumber + '|', '');
      }
      return String(index + 1);
    }
  },
  { 
    label: "存貨類型", 
    name: "inventoryType", 
    width: 90,
    align: "center",
    render: (val: string) => {
      const map: Record<string, string> = { P: '產品', M: '原料', S: '半成品' };
      return map[val] || val || '產品';
    }
  },
  { label: "產品/原料代碼", name: "inventoryCode", width: 140 },
  { label: "品名", name: "inventoryName", width: 180, render: (val: string) => <EllipsisText text={val} maxWidth={160} /> },
  { 
    label: "單價", 
    name: "unitPrice", 
    width: 100, 
    align: "right",
    render: (val: number) => val != null ? Number(val.toFixed(2)).toLocaleString() : "-"
  },
  { 
    label: "數量", 
    name: "quantity", 
    width: 100, 
    align: "right",
    render: (val: number) => val != null ? Number(val.toFixed(2)).toLocaleString() : "-"
  },
  {
    label: "小計",
    name: "lineAmount",
    width: 120,
    align: "right",
    render: (_: any, record: any) => {
      const u = typeof record.unitPrice === 'number' ? record.unitPrice : 0;
      const q = typeof record.quantity === 'number' ? record.quantity : 0;
      return (Math.round(u * q)).toLocaleString();
    }
  },
  { label: "調整庫位", name: "targetStorageCode", width: 110, align: "center" },
  { label: "備註", name: "notes", width: 150, render: (val: string) => <EllipsisText text={val} maxWidth={130} /> },
];

export const itemFormConfig = (_isUpdateMode: boolean = false): FormFieldConfig[] => [
  {
    name: "inventoryType",
    label: "存貨類型",
    componentType: "Select",
    editable: "createOnly",
    componentProps: {
      options: [
        { label: "產品", value: "P" },
        { label: "原料", value: "M" },
        { label: "半成品", value: "S" },
      ]
    },
    validation: z.string().min(1, "請選擇存貨類型"),
    colSpan: 4,
  },
  {
    name: "inventoryCode",
    label: "存貨代碼",
    componentType: "Custom",
    editable: "createOnly",
    validation: z.string().min(1, "請選擇存貨"),
    customRender: (field, context, setValue) => {
      const type = context.values.inventoryType;
      const configKey = type === "M" ? "MATERIAL" : (type === "S" ? "SEMI_FINISHED" : "PRODUCT");
      return (
        <AsyncSelect
          {...field}
          configKey={configKey as any}
          disabled={!type}
          onChange={(val: any, opt: any) => {
            field.onChange(val);
            if (opt?.originalData) {
              setValue("inventoryName", opt.originalData.name);
              setValue("unitPrice", opt.originalData.unitPrice || opt.originalData.unitCost || 0);
            } else {
              setValue("inventoryName", "");
            }
          }}
        />
      );
    },
    colSpan: 2,
  },
  {
    name: "inventoryName",
    label: "品名",
    componentType: "Input",
    editable: "never",
    componentProps: { placeholder: "自動帶入" },
    colSpan: 2,
  },
  {
    name: "targetStorageCode",
    label: "調整庫位",
    componentType: "Custom",
    editable: "always",
    validation: z.string().min(1, "請選擇庫位"),
    customRender: (field) => (
      <DictSelect
        {...field}
        dictKey="STORAGE"
      />
    ),
    colSpan: 2,
  },
  {
    name: "quantity",
    label: "調整數量",
    componentType: "InputNumber",
    editable: "always",
    componentProps: { className: "w-full" },
    validation: z.number({ required_error: "請輸入數量" }).refine(val => val !== 0, "數量不能為 0"),
    colSpan: 2,
  },
  {
    name: "unitPrice",
    label: "單價",
    componentType: "InputNumber",
    editable: "always",
    componentProps: { className: "w-full", min: 0 },
    colSpan: 4,
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "always",
    componentProps: { rows: 2 },
    colSpan: 2,
  },
];
