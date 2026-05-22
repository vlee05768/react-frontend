import { z } from "zod";
import type {
  SearchFieldConfig,
  FormFieldConfig,
  TableColumnConfig,
} from "@/components/Form/types";
import { Tag } from "antd";
import { Link } from "react-router-dom";
import { EllipsisText } from "@/components/Table/EllipsisText";
import { AsyncSelect } from "@/components/Form/AsyncSelect";

export const bomItemFormConfig = (_isUpdateMode: boolean = false, existingMaterialCodes: string[] = []): FormFieldConfig[] => [
  {
    name: "materialCode",
    label: "原料編號",
    componentType: "Custom",
    editable: "createOnly",
    validation: z.string().min(1, "請選擇原料"),
    customRender: (field, _context, setValue) => (
      <AsyncSelect
        {...field}
        configKey="MATERIAL"
        excludeValues={existingMaterialCodes}
        onChange={(val: any, opt: any) => {
          field.onChange(val);
          if (opt?.originalData) {
            setValue("materialName", opt.originalData.name);
            setValue("width", opt.originalData.width || undefined);
          } else {
            setValue("materialName", "");
            setValue("width", undefined);
          }
        }}
      />
    ),
    colSpan: 2,
  },
  {
    name: "materialName",
    label: "原料名稱",
    componentType: "Input",
    editable: "never",
    componentProps: { placeholder: "自動帶入" },
    colSpan: 2,
  },
  {
    name: "quantity",
    label: "需求用量",
    componentType: "InputNumber",
    editable: "always",
    componentProps: { className: "w-full", min: 0 },
    validation: z.number().min(0, "請輸入需求用量"),
    colSpan: 4,
  },
  {
    name: "scrapPercentage",
    label: "預計損耗率 (%)",
    componentType: "InputNumber",
    editable: "always",
    componentProps: { className: "w-full", min: 0, max: 100 },
    colSpan: 4,
  },
  {
    name: "width",
    label: "幅寬 (mm)",
    componentType: "InputNumber",
    editable: "always",
    componentProps: { className: "w-full", min: 0 },
    colSpan: 4,
  },
  {
    name: "specification",
    label: "規格",
    componentType: "Input",
    editable: "always",
    colSpan: 4,
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
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

import { DictLabel } from "@/components/Form/DictLabel";

export const mainTableColumns = (): TableColumnConfig[] => [
  { label: "產品代碼", name: "code", sortable: { multiple: 1 }, width: 180 },
  {
    label: "產品名稱",
    name: "name",
    sortable: { multiple: 2 },
    width: 220,
    render: (val: string) => <EllipsisText text={val} maxWidth={220} />,
  },
  {
    label: "類別",
    name: "typeName",
    sortable: { multiple: 3 },
    width: 70,
    render: (val: string) => (val ? <Tag color="blue">{val}</Tag> : null),
  },
  {
    label: "有 BOM",
    name: "hasBom",
    width: 90,
    align: "center",
    render: (v: boolean | undefined | null) =>
      v === true ? (
        <CheckOutlined style={{ color: "green" }} />
      ) : v === false ? (
        <CloseOutlined style={{ color: "red" }} />
      ) : null,
  },
  { label: "單位", name: "unit", width: 70 },
  {
    label: "庫存量",
    name: "stockQuentity",
    width: 100,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  { label: "放置儲位", name: "storageLocation", width: 120 },
  {
    label: "單價",
    name: "unitPrice",
    width: 100,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    label: "客戶",
    name: "businessPartnerName",
    width: 240,
    render: (val: string, record: any) => {
      const code = record.businessPartnerCode;
      const name = val || code || "-";
      if (!code) return "-";
      return (
        <Link 
          to={`/business-partners/${code}`} 
          style={{ 
            color: '#1677ff', 
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          <EllipsisText text={name} maxWidth={220} />
        </Link>
      );
    },
  },
  { label: "客戶產品代碼", name: "customerProductId", width: 150 },
  { label: "終端產品代碼", name: "terminalProductId", width: 150 },
  { label: "產品長度", name: "productHeight", width: 100, align: "right" },
  { label: "產品寬度", name: "productWidth", width: 100, align: "right" },
  {
    label: "組成方式",
    name: "compositionName",
    width: 120,
    render: (val: string, record: any) => val || record.composition || "-",
  },
  {
    label: "單位成本",
    name: "unitCost",
    width: 100,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    label: "客戶模具費",
    name: "customerMoldFee",
    width: 120,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    label: "東富模具費",
    name: "moldFee",
    width: 120,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  { label: "標籤", name: "tag", width: 180 },
  { label: "包裝方式", name: "packingMethod", width: 120 },
  { label: "安全庫存", name: "safetyStock", width: 120, align: "right" },
  { label: "再訂購點", name: "reorderPoint", width: 120, align: "right" },
  {
    label: "狀態",
    name: "isActive",
    width: 90,
    align: "center",
    render: (v: boolean | undefined | null) =>
      v === true ? (
        <CheckOutlined style={{ color: "green" }} />
      ) : v === false ? (
        <CloseOutlined style={{ color: "red" }} />
      ) : null,
  },
  {
    label: "規格",
    name: "specifications",
    width: 200,
    render: (val: string) => <EllipsisText text={val} maxWidth={180} />,
  },
  {
    label: "描述",
    name: "description",
    width: 200,
    render: (val: string) => <EllipsisText text={val} maxWidth={180} />,
  },
  {
    label: "備註",
    name: "notes",
    width: 200,
    render: (val: string) => <EllipsisText text={val} maxWidth={180} />,
  },
];

export const mainFormConfig = (): FormFieldConfig[] => [
  {
    name: "code",
    label: "產品代碼",
    componentType: "Input",
    componentProps: { isCode: true },
    editable: "createOnly",
    validation: z
      .string()
      .min(1, "請輸入產品代碼")
      .regex(
        /^[A-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/? ]*$/,
        "僅允許大寫英文、數字及符號",
      ),
    colSpan: 3,
  },
  {
    name: "name",
    label: "產品名稱",
    componentType: "Input",
    editable: "always",
    validation: z.string().optional(),
    colSpan: 3,
  },
  {
    name: "type",
    label: "類別",
    componentType: "DictSelect",
    componentProps: { dictKey: "FP_TYPE" },
    editable: "always",
    validation: z.string().min(1, "請選擇類別"),
    colSpan: 6,
  },
  {
    name: "isActive",
    label: "是否啟用",
    componentType: "Switch",
    editable: "always",
    colSpan: 6,
  },
  {
    name: "businessPartnerCode",
    label: "客戶名稱 (代碼)",
    componentType: "AsyncSelect",
    componentProps: { configKey: "CUSTOMER" },
    editable: "always",
    colSpan: 3,
  },
  {
    name: "customerProductId",
    label: "客戶產品代碼",
    componentType: "Input",
    componentProps: { isCode: true },
    editable: "always",
    validation: z
      .string()
      .regex(
        /^[A-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/? ]*$/,
        "僅允許大寫英文、數字及符號",
      )
      .optional()
      .or(z.literal("")),
    colSpan: 3,
  },
  {
    name: "terminalProductId",
    label: "終端產品代碼",
    componentType: "Input",
    componentProps: { isCode: true },
    editable: "always",
    validation: z
      .string()
      .regex(
        /^[A-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/? ]*$/,
        "僅允許大寫英文、數字及符號",
      )
      .optional()
      .or(z.literal("")),
    colSpan: 3,
  },
  {
    name: "storageLocation",
    label: "放置倉位",
    componentType: "Input",
    editable: "always",
    colSpan: 2,
  },
  {
    name: "unit",
    label: "單位",
    componentType: "Input",
    editable: "always",
    validation: z.string().min(1, "請輸入單位"),
    colSpan: 4,
  },
  {
    name: "unitPrice",
    label: "單價",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "unitCost",
    label: "單位成本",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "productHeight",
    label: "產品長度(mm)",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "productWidth",
    label: "產品寬度(mm)",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "tag",
    label: "標記",
    componentType: "Input",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "customerMoldFee",
    label: "客戶模具費",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "moldFee",
    label: "東富模具費",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "composition",
    label: "組成方式",
    componentType: "DictSelect",
    componentProps: { dictKey: "COMPOSITION_TYPE" },
    editable: "always",
    colSpan: 4,
  },
  {
    name: "packingMethod",
    label: "包裝方式",
    componentType: "Input",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "specifications",
    label: "規格",
    componentType: "TextArea",
    editable: "always",
    colSpan: 1,
  },

  {
    name: "description",
    label: "描述",
    componentType: "TextArea",
    editable: "always",
    colSpan: 1,
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "always",
    colSpan: 1,
  },
];

export const productSearchFormConfig = (): SearchFieldConfig[] => [
  {
    name: "CodeOrName",
    label: "代碼/名稱",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "Customer",
    label: "客戶",
    componentType: "AsyncSelect",
    componentProps: { configKey: "CUSTOMER" },
    colSpan: 2,
  },
  {
    name: "CustomerProductId",
    label: "客戶產品號碼",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "Types",
    label: "類別",
    componentType: "DictSelect",
    componentProps: {
      dictKey: "FP_TYPE",
      mode: "multiple",
    },
    colSpan: 2,
  },
  {
    name: "Others",
    label: "其他雜項",
    componentType: "Input",
    colSpan: 2,
  },
];

export const productMoldTableColumns = (): TableColumnConfig[] => [
  { name: 'moldCode', label: '模具編號', width: 140 },
  { name: 'moldName', label: '模具名稱', width: 180 },
  { 
    name: 'type', 
    label: '模具類別', 
    width: 100,
    render: (val: any, record: any) => <DictLabel dictKey="MOLD_TYPE" value={val || record.typeName} />
  },
  { 
    name: 'shape', 
    label: '形狀', 
    width: 100, 
    render: (val: any, record: any) => <DictLabel dictKey="MOLD_SHAPE" value={val || record.shapeName} /> 
  },
  { 
    name: 'dimensions', 
    label: '尺寸 (L x W x H)', 
    width: 140,
    render: (_: any, record: any) => {
      if (record.dimensionLMm != null || record.dimensionWMm != null || record.dimensionHMm != null) {
        return `${record.dimensionLMm || 0} x ${record.dimensionWMm || 0} x ${record.dimensionHMm || 0}`;
      }
      return '-';
    }
  },
  { name: 'supplierName', label: '供應商', width: 150, render: (val: string) => val || '-' },
  { 
    name: 'isActive', 
    label: '狀態', 
    width: 80,
    align: 'center',
    render: (isActive: boolean) => (
      isActive ? <CheckOutlined style={{ color: 'green' }} /> : <CloseOutlined style={{ color: 'red' }} />
    )
  }
];

export const bomItemTableColumns = (): TableColumnConfig[] => [
  { name: 'materialCode', label: '原料編號', width: 140 },
  { name: 'materialName', label: '原料名稱', width: 180 },
  { 
    name: 'quantity', 
    label: '需求用量', 
    width: 110, 
    align: 'right',
    render: (val: number) => val != null ? Number(val.toFixed(4)).toLocaleString() : '-'
  },
  { 
    name: 'scrapPercentage', 
    label: '預計損耗率(%)', 
    width: 120, 
    align: 'right',
    render: (val: number) => val != null ? `${val}%` : '-'
  },
  { 
    name: 'width', 
    label: '幅寬(mm)', 
    width: 100, 
    align: 'right',
    render: (val: number) => val != null ? Number(val.toFixed(2)).toLocaleString() : '-'
  },
  { name: 'specification', label: '規格', width: 140 },
  { name: 'notes', label: '備註', width: 200 },
];

export const bomHeaderFormConfig = (): FormFieldConfig[] => [
  {
    name: "defaultMachineType",
    label: "機台",
    componentType: "DictSelect",
    componentProps: { dictKey: "MACHINE", showSearch: true, optionFilterProp: "_displayName" },
    editable: "always",
    colSpan: 4,
  },
  {
    name: "defaultToolingRangeMm",
    label: "跳距(mm)",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "defaultPunchHolesCount",
    label: "刀穴數",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "pcsPerSheet",
    label: "PCS/單張片數",
    componentType: "InputNumber",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "always",
    colSpan: 1,
  },
];
