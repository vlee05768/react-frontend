import { z } from "zod";
import type { SearchFieldConfig, FormFieldConfig, TableColumnConfig } from "@/components/Form/types";
import { EllipsisText } from "@/components/Table/EllipsisText";
import dayjs from "dayjs";
import { AsyncSelect } from "@/components/Form/AsyncSelect";
import { DictSelect } from "@/components/Form/DictSelect";
import { DictTag } from "@/components/Form/DictTag";

export const getStatusTag = (status: string | null | undefined) => {
  return <DictTag dictKey="INVENTORY_ADJUSTMENT_STATUS" value={status || 'Unconfirmed'} />;
};

export const mainSearchFormConfig = (): SearchFieldConfig[] => [
  {
    name: "DocumentNumber",
    label: "單據號碼",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "DateRange",
    label: "調整日期區間",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
  {
    name: "Others",
    label: "其他條件",
    componentType: "Input",
    colSpan: 2,
  },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { label: "單據號碼", name: "documentNumber", width: 140 , sortable: { multiple: 1 } },
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
  { label: "建立時間", name: "createdAt", width: 160, render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-" , sortable: { multiple: 5 } },
  { label: "更新時間", name: "updatedAt", width: 160, render: (val: string) => val ? dayjs(val).format("YYYY-MM-DD HH:mm:ss") : "-" },
];

export const mainFormConfig = (_isUpdateMode: boolean = false): FormFieldConfig[] => [
  {
    name: "documentNumber",
    label: "單據號碼",
    componentType: "Input",
    editable: "never",
    autoGenerate: true,
    colSpan: 3,
  },
  {
    name: "documentDate",
    label: "調整日期",
    componentType: "DatePicker",
    editable: "always",
    validation: z.any().refine(val => !!val, "請選擇調整日期"),
    colSpan: 3,
  },
  {
    name: "responsibleEmployeeCode",
    label: "負責人員",
    componentType: "Custom",
    editable: "always",
    customRender: (field, _context) => (
      <DictSelect
        {...field}
        dictKey="EMPLOYEE"
      />
    ),
    colSpan: 3,
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
    label: "庫存類型", 
    name: "inventoryType", 
    width: 90,
    align: "center",
    render: (val: string) => {
      const map: Record<string, string> = { P: '商品', M: '原料', S: '半成品' };
      return map[val] || val || '商品';
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
  { label: "調整庫位", name: "targetStorageCode", width: 110, align: "center" },
  { label: "備註", name: "notes", width: 150, render: (val: string) => <EllipsisText text={val} maxWidth={130} /> },
];

export const itemFormConfig = (_isUpdateMode: boolean = false): FormFieldConfig[] => [

  {
    name: "inventoryCode",
    label: "產品代碼",
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
          disabled={field.disabled || !type}
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
    name: "inventoryType",
    label: "庫存類型",
    componentType: "Select",
    editable: "never",
    componentProps: {
      options: [
        { label: "商品", value: "P" },
        { label: "原料", value: "M" },
        { label: "半成品", value: "S" },
      ]
    },
    validation: z.string().min(1, "請選擇存貨類型"),
    colSpan: 4,
  },
  {
    name: "targetStorageCode",
    label: "調整庫位",
    componentType: "Custom",
    editable: "never",
    validation: z.string().min(1, "請選擇庫位"),
    customRender: (field) => (
      <DictSelect
        {...field}
        dictKey="STORAGE"
      />
    ),
    colSpan: 4,
  },
  {
    name: "quantity",
    label: "調整數量",
    componentType: "InputNumber",
    editable: "always",
    componentProps: { className: "w-full" },
    validation: z.number({ required_error: "請輸入數量" }).refine(val => val !== 0, "數量不能為 0"),
    colSpan: 4,
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
    componentProps: { rows: 4 },
    colSpan: 1,
  },
];
