import { z } from "zod";
import type {
  SearchFieldConfig,
  FormFieldConfig,
  TableColumnConfig,
} from "@/components/Form/types";

import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { DictLabel } from "@/components/Form/DictLabel";

export const materialFormOptions = [
  { label: "捲材 (R)", value: "R" },
  { label: "片材 (S)", value: "S" },
];

export const primaryUoMOptions = [
  { label: "平方公尺", value: "M²" },
  { label: "個", value: "PCS" },
  { label: "公斤", value: "KG" },
];

export const secondaryUoMOptions = [
  { label: "卷", value: "ROLL" },
  { label: "包", value: "PKG" },
];

export const purchasingUoMOptions = [
  { label: "卷", value: "ROLL" },
  { label: "包", value: "PKG" },
  { label: "箱", value: "BOX" },
];

// 計算編碼
const generateCode = (context: any, setValue: any) => {
  const { materialForm, brand, modelNo, thickness, width, length } =
    context.values;
  
  // 只要有任何一個必要欄位為空，就清空編碼和名稱
  const isMissingFields = 
    !materialForm || 
    !brand || 
    !modelNo || 
    thickness == null || 
    width == null || 
    (materialForm === "S" && length == null);

  if (isMissingFields) {
    setValue("code", "");
    setValue("name", "");
    return;
  }

  // 數值去掉最右邊的0: 利用 Number() 自動去掉多餘的 0，再轉回字串
  const formattedThickness = Number(thickness).toString();
  const formattedWidth = Number(width).toString();
  
  let spec = "";
  let specLabel = "";
  if (materialForm === "R") {
    spec = formattedWidth;
    specLabel = `寬${formattedWidth}mm`;
  } else if (materialForm === "S") {
    const formattedLength = Number(length).toString();
    spec = `${formattedWidth}×${formattedLength}`;
    specLabel = `${formattedWidth}×${formattedLength}mm`;
  }

  const code = `${materialForm}-${brand}-${modelNo}-${formattedThickness}-${spec}`;
  setValue("code", code);

  const formLabel = materialForm === "R" ? "捲材" : "片材";
  setValue(
    "name",
    `(${formLabel}) ${brand} ${modelNo} 厚${formattedThickness}mm ${specLabel}`,
  );
};

export const materialSearchFormConfig = (): SearchFieldConfig[] => [
  {
    name: "CodeOrName",
    label: "編號或名稱",
    componentType: "Input",
    componentProps: { placeholder: "請輸入原料編號或名稱" },
    colSpan: 2,
  },
  {
    name: "Types",
    label: "原料型態",
    componentType: "Select",
    componentProps: {
      placeholder: "請選擇型態",
      options: materialFormOptions,
      mode: "multiple",
      allowClear: true,
    },
    colSpan: 2,
  },
  {
    name: "IsActive",
    label: "是否啟用",
    componentType: "Select",
    componentProps: {
      placeholder: "請選擇狀態",
      options: [
        { label: "啟用", value: true },
        { label: "停用", value: false },
      ],
      allowClear: true,
    },
    colSpan: 2,
  },
  {
    name: "Brand",
    label: "廠牌",
    componentType: "Input",
    componentProps: { placeholder: "請輸入廠牌" },
    colSpan: 2,
  },
  {
    name: "ModelNo",
    label: "型號",
    componentType: "Input",
    componentProps: { placeholder: "請輸入型號" },
    colSpan: 2,
  },
  {
    name: "Others",
    label: "其他雜項",
    componentType: "Input",
    colSpan: 2,
  },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { label: "編號", name: "code", width: 200 },
  { label: "名稱", name: "name", width: 250, ellipsis: true },
  {
    label: "型態",
    name: "materialForm",
    width: 100,
    render: (v) => {
      const opt = materialFormOptions.find((o) => o.value === v);
      return opt ? opt.label : v;
    },
  },
  {
    label: "類別",
    name: "type",
    width: 120,
    render: (v) => <DictLabel dictKey="MATERIAL_TYPE" value={v} />,
  },
  { label: "厚度(mm)", name: "thickness", width: 100 },
  { label: "寬度(mm)", name: "width", width: 100 },
  { label: "長度(mm)", name: "length", width: 100 },
  {
    label: "副計量單位",
    name: "secondaryUoM",
    width: 120,
    render: (v) => {
      const opt = secondaryUoMOptions.find((o) => o.value === v);
      return opt ? opt.label : v;
    },
  },
  { label: "轉換係數", name: "conversionFactor", width: 100 },
  {
    label: "庫存計量單位",
    name: "primaryUoM",
    width: 120,
    render: (v) => {
      const opt = primaryUoMOptions.find((o) => o.value === v);
      return opt ? opt.label : v;
    },
  },
  {
    label: "採購單位",
    name: "purchasingUoM",
    width: 120,
    render: (v) => {
      const opt = purchasingUoMOptions.find((o) => o.value === v);
      return opt ? opt.label : v;
    },
  },
  { label: "成本", name: "cost", width: 100 },
  {
    label: "供應商",
    name: "supplierCode",
    width: 210,
    render: (v) => <DictLabel dictKey="BP_SUPPLIER" value={v} />,
  },
  {
    label: "啟用",
    name: "isActive",
    width: 80,
    align: "center",
    render: (v) =>
      v === true ? (
        <CheckOutlined style={{ color: "green" }} />
      ) : v === false ? (
        <CloseOutlined style={{ color: "red" }} />
      ) : null,
  },
  { label: "標籤", name: "tag", width: 120 },
  { label: "規格描述", name: "specDescription", width: 200, ellipsis: true },
  { label: "備註", name: "notes", width: 200, ellipsis: true },
];

export const mainFormConfig = (): FormFieldConfig[] => [
  // === Tab 1: 基本規格 ===
  {
    name: "code",
    label: "編號",
    componentType: "Input",
    group: "基本規格",
    colSpan: 4,
    autoGenerate: true,
  },
  {
    name: "name",
    label: "名稱",
    componentType: "Input",
    group: "基本規格",
    colSpan: 4,
    autoGenerate: true,
  },
  {
    name: "type",
    label: "類別",
    componentType: "DictSelect",
    group: "基本規格",
    colSpan: 4,
    editable: "createOnly",
    validation: z.string().min(1, "請選擇類別"),
    componentProps: { dictKey: "MATERIAL_TYPE", allowClear: true },
    onChange: (val, ctx, setValue) => {
      ctx.values.type = val;
      generateCode(ctx, setValue);
    },
  },
  {
    name: "materialForm",
    label: "型態",
    componentType: "Select",
    group: "基本規格",
    colSpan: 4,
    editable: "createOnly",
    validation: z.string().min(1, "請選擇型態"),
    componentProps: { options: materialFormOptions, allowClear: true },
    onChange: (val, ctx, setValue) => {
      ctx.values.materialForm = val;
      if (val === "R") {
        setValue("length", 0);
        ctx.values.length = 0;
        setValue("primaryUoM", "M²");
        setValue("secondaryUoM", "ROLL");
        setValue("purchasingUoM", "ROLL");
      } else if (val === "S") {
        setValue("length", undefined);
        ctx.values.length = undefined;
        setValue("primaryUoM", "PCS");
        setValue("secondaryUoM", "PKG");
        setValue("purchasingUoM", "BOX");
      }
      generateCode(ctx, setValue);
    },
  },
  {
    name: "brand",
    label: "廠牌",
    componentType: "Input",
    group: "基本規格",
    colSpan: 4,
    editable: "createOnly",
    validation: z.string().min(1, "請輸入廠牌(英文大寫)"),
    componentProps: {
      placeholder: "請輸入廠牌(英文大寫)",
      maxLength: 20,
    },
    onChange: (val, ctx, setValue) => {
      const upper = (val || "").replace(/[\u4e00-\u9fff]/g, "").toUpperCase();
      setValue("brand", upper);
      ctx.values.brand = upper;
      generateCode(ctx, setValue);
    },
  },
  {
    name: "modelNo",
    label: "型號",
    componentType: "Input",
    group: "基本規格",
    colSpan: 4,
    editable: "createOnly",
    validation: z.string().min(1, "請輸入型號(英文大寫)"),
    componentProps: {
      placeholder: "請輸入型號(英文大寫)",
      maxLength: 20,
    },
    onChange: (val, ctx, setValue) => {
      const upper = (val || "").replace(/[\u4e00-\u9fff]/g, "").toUpperCase();
      setValue("modelNo", upper);
      ctx.values.modelNo = upper;
      generateCode(ctx, setValue);
    },
  },
  {
    name: "thickness",
    label: "厚度 (mm)",
    componentType: "InputNumber",
    group: "基本規格",
    colSpan: 6,
    editable: "createOnly",
    validation: z.number({ invalid_type_error: "請輸入厚度" }).min(0),
    componentProps: { min: 0, style: { width: "100%" } },
    onChange: (val, ctx, setValue) => {
      ctx.values.thickness = val;
      generateCode(ctx, setValue);
    },
  },
  {
    name: "width",
    label: "寬度 (mm)",
    componentType: "InputNumber",
    group: "基本規格",
    colSpan: 6,
    editable: "createOnly",
    validation: z.number({ invalid_type_error: "請輸入寬度" }).min(0),
    componentProps: { min: 0, style: { width: "100%" } },
    onChange: (val, ctx, setValue) => {
      ctx.values.width = val;
      generateCode(ctx, setValue);
    },
  },
  {
    name: "length",
    label: "長度 (mm)",
    componentType: "InputNumber",
    group: "基本規格",
    colSpan: 6,
    editable: (ctx) =>
      ctx.values.materialForm === "R" ? "never" : "createOnly",
    dynamicValidation: (ctx) =>
      ctx.values.materialForm === "S"
        ? z.number({ invalid_type_error: "片材請輸入長度" }).min(0)
        : z.any().optional(),
    componentProps: { min: 0, style: { width: "100%" } },
    onChange: (val, ctx, setValue) => {
      ctx.values.length = val;
      generateCode(ctx, setValue);
    },
  },
  {
    name: "spec",
    label: "規格編碼",
    componentType: "Input",
    group: "基本規格",
    colSpan: 4,
  },
  {
    name: "supplierCode",
    label: "主要供應商",
    componentType: "DictSelect",
    colSpan: 4,
    group: "基本規格",    
    componentProps: {
      dictKey: "BP_SUPPLIER",
      allowClear: true,
      showSearch: true,
    },
  },
  {
    name: "isActive",
    label: "是否啟用",
    componentType: "Switch",
    group: "基本規格",
    colSpan: 6,
  },
    {
    name: "tag",
    label: "標籤",
    componentType: "Input",
    group: "基本規格",
    colSpan: 3,
  },
  {
    name: "specDescription",
    label: "規格描述",
    componentType: "TextArea",
    group: "基本規格",
    colSpan: 1,
    componentProps: { rows: 3 },
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    colSpan: 1,
    group: "基本規格",    
    componentProps: { rows: 4 },
  },

  // === Tab 2: 計量單位與成本 ===
  {
    name: "primaryUoM",
    label: "主計量單位",
    componentType: "Select",
    group: "計量單位與成本",
    colSpan: 6,
    componentProps: { options: primaryUoMOptions, allowClear: true },
  },
  {
    name: "secondaryUoM",
    label: "副計量單位",
    componentType: "Select",
    group: "計量單位與成本",
    colSpan: 6,
    componentProps: { options: secondaryUoMOptions, allowClear: true },
  },
  {
    name: "conversionFactor",
    label: "轉換係數",
    componentType: "InputNumber",
    group: "計量單位與成本",
    colSpan: 6,
    componentProps: { min: 0, style: { width: "100%" } },
  },
  {
    name: "purchasingUoM",
    label: "採購單位",
    componentType: "Select",
    group: "計量單位與成本",
    colSpan: 6,
    componentProps: { options: purchasingUoMOptions, allowClear: true },
  },
  {
    name: "cost",
    label: "成本",
    componentType: "InputNumber",
    group: "計量單位與成本",
    colSpan: 3,
    componentProps: { min: 0, style: { width: "100%" } },
  },

];
