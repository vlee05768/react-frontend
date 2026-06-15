import { z } from "zod";
import type {
  SearchFieldConfig,
  FormFieldConfig,
  TableColumnConfig,
} from "@/components/Form/types";

import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { DictLabel } from "@/components/Form/DictLabel";
import { BrandSelect } from "./components/BrandSelect";
import { ModelSelect } from "./components/ModelSelect";
import { getApiV1Material } from "@/api/generated/sdk.gen";
import { Modal } from "antd";

export const materialFormOptions = [
  { label: "捲材 (R)", value: "R" },
  { label: "片材 (S)", value: "S" },
];

// 計算編碼與自動關聯欄位與廠牌/型號型態防呆檢查
const generateCode = (context: any, setValue: any) => {
  const { materialForm, brand, modelNo, thickness } = context.values;
  
  // 只要有任何一個必要欄位為空，就清空編碼和名稱
  const isMissingFields = 
    !materialForm || 
    !brand || 
    !modelNo || 
    thickness == null;

  if (isMissingFields) {
    setValue("code", "");
    setValue("name", "");
    setValue("spec", "");
    return;
  }

  // 數值去掉最右邊的0: 利用 Number() 自動去掉多餘的 0，再轉回字串
  const formattedThickness = Number(thickness).toString();
  const upperBrand = (brand || "").trim().toUpperCase();
  const upperModelNo = (modelNo || "").trim().toUpperCase();
  
  // 規格編碼：後端定義為 ModelNo-Thickness
  const spec = `${upperModelNo}-${formattedThickness}`;
  setValue("spec", spec);

  // 原料編碼：R/S-廠牌-型號-厚度
  const code = `${materialForm}-${upperBrand}-${upperModelNo}-${formattedThickness}`;
  setValue("code", code);

  const formLabel = materialForm === "R" ? "捲材" : "片材";
  setValue(
    "name",
    `(${formLabel}) ${upperBrand} ${upperModelNo} 厚${formattedThickness}mm`,
  );

  // 自動依型態鎖定與更新計量單位
  setValue("baseUOM", "SQM");
  if (materialForm === "R") {
    setValue("auxUOM", "M");
  } else if (materialForm === "S") {
    setValue("auxUOM", "PCS");
  }

  // === 非同步防呆檢核：同廠牌、型號不可同時是片料（片材）與卷料（捲材） ===
  getApiV1Material({
    query: {
      Brand: upperBrand,
      ModelNo: upperModelNo,
      pageSize: -1, // 透過 -1 取得所有符合條件的原料，避免分頁限制漏檢
    },
  })
    .then((res) => {
      const existingItems = (res?.data as any)?.data?.data || (res?.data as any)?.data || [];
      
      // 嚴格比對廠牌與型號（排除模糊查詢結果）
      const conflictItem = existingItems.find((item: any) => {
        const isSameBrand = (item.brand || "").trim().toUpperCase() === upperBrand;
        const isSameModel = (item.modelNo || "").trim().toUpperCase() === upperModelNo;
        return isSameBrand && isSameModel && item.materialForm !== materialForm;
      });

      if (conflictItem) {
        const existingFormText = conflictItem.materialForm === "R" ? "捲材 (卷料)" : "片材 (片料)";
        const currentFormText = materialForm === "R" ? "捲材 (卷料)" : "片材 (片料)";
        Modal.error({
          centered: true,
          title: "防呆提示",
          content: `廠牌「${upperBrand}」與型號「${upperModelNo}」已在系統中被設定為「${existingFormText}」，不允許同時新增為「${currentFormText}」！`,
        });

        // 發生衝突時，重置型態並清空自動產生的欄位
        setValue("materialForm", undefined);
        setValue("code", "");
        setValue("name", "");
        setValue("spec", "");
      }
    })
    .catch((err) => {
      console.error("檢查廠牌型號型態衝突失敗:", err);
    });
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
  { label: "編號", name: "code", width: 200 , sortable: { multiple: 1 } },
  { label: "名稱", name: "name", width: 250, ellipsis: true , sortable: { multiple: 2 } },
  { label: "廠牌", name: "brand", width: 150, ellipsis: true },
  { label: "型號", name: "modelNo", width: 150, ellipsis: true },
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
  { label: "財務單位", name: "baseUOM", width: 100 },
  { label: "輔助單位", name: "auxUOM", width: 100 },
  { label: "密度(g/m²)", name: "stdDensity", width: 120 },
  {
    label: "供應商",
    name: "supplierCode",
    width: 210,
    render: (v) => <DictLabel dictKey="MATERIAL_SUPPLIER" value={v} />,
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
    colSpan: 3,
    autoGenerate: true,
  },
  {
    name: "name",
    label: "名稱",
    componentType: "Input",
    group: "基本規格",
    colSpan: 3,
    autoGenerate: true,
  },
  {
    name: "type",
    label: "類別",
    componentType: "DictSelect",
    group: "基本規格",
    colSpan: 6,
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
    colSpan: 6,
    editable: "createOnly",
    validation: z.string().min(1, "請選擇型態"),
    componentProps: { options: materialFormOptions, allowClear: true },
    onChange: (val, ctx, setValue) => {
      ctx.values.materialForm = val;
      generateCode(ctx, setValue);
    },
  },
  {
    name: "brand",
    label: "廠牌",
    componentType: "Custom",
    customRender: (field: any) => (
      <BrandSelect
        value={field.value}
        onChange={field.onChange}
        disabled={field.disabled}
      />
    ),
    group: "基本規格",
    colSpan: 4,
    editable: "createOnly",
    validation: z.string().min(1, "請輸入廠牌(英文大寫)"),
    onChange: (val, ctx, setValue) => {
      const upper = (val || "").replace(/[\u4e00-\u9fff]/g, "").toUpperCase();
      
      if (ctx.values.brand !== upper) {
        setValue("modelNo", undefined);
        ctx.values.modelNo = undefined;
      }

      setValue("brand", upper);
      ctx.values.brand = upper;
      
      generateCode(ctx, setValue);
    },
  },
  {
    name: "modelNo",
    label: "型號",
    componentType: "Custom",
    customRender: (field: any, context: any) => (
      <ModelSelect
        value={field.value}
        onChange={field.onChange}
        disabled={field.disabled || !context.values.brand}
        brand={context.values.brand}
      />
    ),
    group: "基本規格",
    colSpan: 4,
    editable: "createOnly",
    validation: z.string().min(1, "請輸入型號(英文大寫)"),
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
    name: "stdDensity",
    label: "標準克重密度 (g/m²)",
    componentType: "InputNumber",
    group: "基本規格",
    colSpan: 6,
    validation: z.number({ invalid_type_error: "請輸入標準克重密度" }).min(0),
    componentProps: { min: 0, style: { width: "100%" } },
  },
  {
    name: "spec",
    label: "規格編碼",
    componentType: "Input",
    group: "基本規格",
    colSpan: 4,
    editable: "never",
    componentProps: { disabled: true },
  },
  {
    name: "supplierCode",
    label: "主要供應商",
    componentType: "AsyncSelect",
    colSpan: 4,
    group: "基本規格",    
    componentProps: {
      configKey: "MATERIAL_SUPPLIER",
      allowClear: true,
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

  // === Tab 2: 計量單位資訊 (皆為系統判定唯讀欄位) ===
  {
    name: "baseUOM",
    label: "財務基準單位",
    componentType: "Input",
    group: "計量單位資訊",
    colSpan: 6,
    editable: "never",
    componentProps: { disabled: true },
  },
  {
    name: "auxUOM",
    label: "現場輔助單位",
    componentType: "Input",
    group: "計量單位資訊",
    colSpan: 6,
    editable: "never",
    componentProps: { disabled: true },
  },
];
