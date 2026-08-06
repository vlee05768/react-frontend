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
  { 
    label: "品名", 
    name: "inventoryName", 
    width: 220, 
    render: (val: string, record: any) => {
      let suffix = "";
      if (record?.inventoryType === "M") {
        let extra: any = null;
        if (record?.extraData) {
          if (typeof record.extraData === "string") {
            try {
              extra = JSON.parse(record.extraData);
            } catch {}
          } else {
            extra = record.extraData;
          }
        }
        const width = extra?.widthMm;
        if (width != null) {
          suffix = ` (W:${width}mm)`;
        }
      }
      const displayVal = (val || "") + suffix;
      return <EllipsisText text={displayVal} maxWidth={200} />;
    }
  },
  { 
    label: "數量", 
    name: "quantity", 
    width: 120, 
    align: "right",
    render: (val: number, record: any) => {
      if (val == null) return "-";
      const formatted = Number(val.toFixed(2)).toLocaleString();
      return record?.inventoryType === "M" ? `${formatted} m` : formatted;
    }
  },
  { label: "調整庫位", name: "targetStorageCode", width: 110, align: "center" },
  { label: "備註", name: "notes", width: 150, render: (val: string) => <EllipsisText text={val} maxWidth={130} /> },
];

export const itemFormConfig = (_isUpdateMode: boolean = false, currentType?: string): FormFieldConfig[] => {
  const fields: FormFieldConfig[] = [
    {
      name: "inventoryCode",
      label: currentType === "M" ? "LPN卷卡號" : "產品代碼",
      componentType: "Custom",
      editable: "createOnly",
      validation: z.string().min(1, currentType === "M" ? "請選擇或輸入 LPN 卷卡號" : "請選擇存貨"),
      customRender: (field, context, setValue) => {
        const type = context.values.inventoryType;
        const configKey = type === "M" ? "MATERIAL_ROLL" : (type === "S" ? "SEMI_FINISHED" : "PRODUCT");
        return (
          <AsyncSelect
            {...field}
            configKey={configKey as any}
            disabled={field.disabled || !type}
            onChange={(val: any, opt: any) => {
              field.onChange(val);
              if (opt?.originalData) {
                const name = opt.originalData.materialName || opt.originalData.name;
                setValue("inventoryName", name);
                if (type === "M") {
                  setValue("widthMm", opt.originalData.widthMm || 0);
                  setValue("quantity", opt.originalData.currentQtyAux || 0);
                  setValue("targetStorageCode", opt.originalData.storageCode || "");
                }
              } else {
                setValue("inventoryName", "");
                if (type === "M") {
                  setValue("widthMm", 0);
                  setValue("quantity", 0);
                  setValue("targetStorageCode", "");
                }
              }
            }}
          />
        );
      },
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
      editable: (context: any) => {
        const type = context?.values?.inventoryType;
        return type === "P" ? "always" : "never";
      },
      validation: z.string().min(1, "請選擇庫位"),
      customRender: (field, context) => {
        const type = context?.values?.inventoryType;
        return (
          <DictSelect
            {...field}
            dictKey="STORAGE"
            disabled={field.disabled || type !== "P"}
            optionsFilter={(opt: any) => {
              // 調整產品 (P) 時，儲位只能選擇產品類 (FG) 的儲位
              if (type === "P") {
                return opt.type === "FG";
              }
              return true;
            }}
          />
        );
      },
      colSpan: 4,
    },
    {
      name: "quantity",
      label: currentType === "M" ? "調整長度(m)" : "調整數量",
      componentType: "InputNumber",
      editable: "always",
      componentProps: { className: "w-full" },
      validation: z.number({ required_error: "請輸入數量" }).refine(val => val !== 0, "數值不能為 0"),
      colSpan: 4,
    }
  ];

  // 調整明細為原料明細時，額外顯示規格寬度欄位 (寬度為 LPN 固定屬性，不可任意修改)
  if (currentType === "M") {
    fields.push(
      {
        name: "widthMm",
        label: "規格：寬度 (mm)",
        componentType: "InputNumber",
        editable: "never",
        componentProps: { className: "w-full", min: 0 },
        colSpan: 4,
      }
    );
  }

  fields.push({
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "always",
    componentProps: { rows: 4 },
    colSpan: 1,
  });

  return fields;
};
