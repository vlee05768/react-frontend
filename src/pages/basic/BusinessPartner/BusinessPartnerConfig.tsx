import { z } from "zod";
import type { SearchFieldConfig,
  FormFieldConfig,
  TableColumnConfig,
} from "@/components/Form/types";
import { Tag } from "antd";

export const bpTypeOptions = [
  { label: "客戶", value: "C" },
  { label: "供應商", value: "S" },
  { label: "同行", value: "P" },
];

export const statusOptions = [
  { label: "啟用", value: "active" },
  { label: "停用", value: "inactive" },
];

export const currencyOptions = [
  { label: "TWD", value: "TWD" },
  { label: "USD", value: "USD" },
  { label: "CNY", value: "CNY" },
  { label: "EUR", value: "EUR" },
  { label: "JPY", value: "JPY" },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  {
    label: "編號",
    name: "code",
    width: 120,
    sortable: { multiple: 1 },
  },
  {
    label: "名稱",
    name: "name",
    width: 200,
    sortable: { multiple: 2 },
  },
  {
    label: "統一編號",
    name: "taxId",
    width: 120,
    sortable: { multiple: 3 },
  },
  {
    label: "角色身份",
    name: "roles",
    width: 260,
    render: (_, record: any) => {
      const tags = [];
      if (record.enabledCustomerRole) {
        const code = record.customerProfile?.customerCode;
        tags.push(<Tag color="blue" key="cust">客戶{code ? ` (${code})` : ''}</Tag>);
      }
      if (record.enabledMaterialSupplierRole) {
        const code = record.materialSupplierProfile?.supplierCode;
        tags.push(<Tag color="green" key="mat">原料商{code ? ` (${code})` : ''}</Tag>);
      }
      if (record.enabledOutsourceVendorRole) {
        const code = record.outsourceVendorProfile?.outsourceVendorCode;
        tags.push(<Tag color="purple" key="out">委外商{code ? ` (${code})` : ''}</Tag>);
      }
      if (record.enabledToolingSupplierRole) {
        const code = record.toolingSupplierProfile?.toolingSupplierCode;
        tags.push(<Tag color="orange" key="tool">模具商{code ? ` (${code})` : ''}</Tag>);
      }
      return tags.length > 0 ? <div className="flex flex-wrap gap-1">{tags}</div> : <span className="text-gray-400">未設定</span>;
    }
  },
  {
    label: "電話",
    name: "phone",
    width: 150,
  },
  {
    label: "傳真",
    name: "faxNumber",
    width: 150,
  },
  {
    label: "舊編碼",
    name: "oldCode",
    width: 120,
    sortable: { multiple: 4 },
  },

];

export const mainFormConfig = (): FormFieldConfig[] => [
  {
    name: "code",
    label: "編號",
    componentType: "Input",
    autoGenerate: true,
    validation: z.string().min(1, "請輸入編號"),
    group: "基本資料",
    colSpan: 4,
  },
  {
    name: "name",
    label: "公司名稱",
    componentType: "Input",
    editable: "always",
    validateTrigger: "onChange",
    validation: z.string().min(1, "請輸入公司名稱"),
    group: "基本資料",
    colSpan: 2,
  },
  {
    name: "taxId",
    label: "統一編號",
    componentType: "Input",
    editable: "always",
    group: "基本資料",
    colSpan: 4,
  },  
  {
    name: "phone",
    label: "公司電話",
    componentType: "Input",
    editable: "always",
    group: "基本資料",
    colSpan: 4,
  },
  {
    name: "faxNumber",
    label: "公司傳真",
    componentType: "Input",
    editable: "always",
    group: "基本資料",
    colSpan: 4,
  },
  {
    name: "address",
    label: "公司登記地址",
    componentType: "Input",
    editable: "always",
    group: "基本資料",
    colSpan: 2,
  },
  {
    name: "website",
    label: "官方網站",
    componentType: "Input",
    editable: "always",
    group: "基本資料",
    colSpan: 2,
  },
  {
    name: "oldCode",
    label: "舊編碼",
    componentType: "Input",
    editable: "never",
    validation: z.string().optional().nullable().refine(
      (val) => !val || !/[\u4e00-\u9fa5]/.test(val),
      { message: "舊編碼不能含有中文，且英文字母小寫會自動轉為大寫" }
    ),
    group: "基本資料",
    colSpan: 4,
  },

  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "always",
    group: "基本資料",
    colSpan: 1,
  },  

  // --- 角色身份設定 ---
  {
    name: "enabledCustomerRole",
    label: "客戶",
    componentType: "Checkbox",
    editable: "always",
    group: "基本資料",
    colSpan: 4,
  },
  {
    name: "enabledMaterialSupplierRole",
    label: "原料供應商",
    componentType: "Checkbox",
    editable: "always",
    group: "基本資料",
    colSpan: 4,
  },
  {
    name: "enabledOutsourceVendorRole",
    label: "委外加工商",
    componentType: "Checkbox",
    editable: "always",
    group: "基本資料",
    colSpan: 4,
  },
  {
    name: "enabledToolingSupplierRole",
    label: "模具商",
    componentType: "Checkbox",
    editable: "always",
    group: "基本資料",
    colSpan: 4,
  },

  // --- 客戶專屬資料 ---
  {
    name: "customerProfile_customerCode",
    label: "客戶編號",
    componentType: "Input",
    autoGenerate: true,
    validation: z.string().optional().nullable(),
    group: "客戶資料",
    hidden: (context) => !context.values.enabledCustomerRole,
    colSpan: 4,
  },
  {
    name: "customerProfile_salesPersonId",
    label: "業務人員",
    componentType: "DictSelect",
    componentProps: { dictKey: "EMPLOYEE", showSearch: true, optionFilterProp: "_displayName" },
    editable: "always",
    group: "客戶資料",
    hidden: (context) => !context.values.enabledCustomerRole,
    colSpan: 4,
  },
  {
    name: "customerProfile_paymentTerms",
    label: "收款條件",
    componentType: "Input",
    editable: "always",
    group: "客戶資料",
    hidden: (context) => !context.values.enabledCustomerRole,
    colSpan: 4,
  },
  {
    name: "customerProfile_creditLimit",
    label: "信用額度",
    componentType: "InputNumber",
    editable: "always",
    group: "客戶資料",
    hidden: (context) => !context.values.enabledCustomerRole,
    colSpan: 4,
  },
  {
    name: "customerProfile_defaultCurrency",
    label: "預設幣別",
    componentType: "Select",
    componentProps: { options: currencyOptions },
    editable: "always",
    group: "客戶資料",
    hidden: (context) => !context.values.enabledCustomerRole,
    colSpan: 4,
  },
  {
    name: "customerProfile_isCreditBlocked",
    label: "凍結信用",
    componentType: "Checkbox",
    editable: "always",
    group: "客戶資料",
    hidden: (context) => !context.values.enabledCustomerRole,
    colSpan: 4,
  },
  {
    name: "customerProfile_isTYCustomer",
    label: "東裕客戶",
    componentType: "Checkbox",
    editable: "always",
    group: "客戶資料",
    hidden: (context) => !context.values.enabledCustomerRole,
    colSpan: 4,
  },
  {
    name: "customerProfile_status",
    label: "客戶狀態",
    componentType: "Select",
    componentProps: { options: statusOptions },
    editable: "always",
    group: "客戶資料",
    hidden: (context) => !context.values.enabledCustomerRole,
    colSpan: 4,
  },

  // --- 原料商專屬資料 ---
  {
    name: "materialSupplierProfile_supplierCode",
    label: "原料商編號",
    componentType: "Input",
    autoGenerate: true,
    validation: z.string().optional().nullable(),
    group: "原料商資料",
    hidden: (context) => !context.values.enabledMaterialSupplierRole,
    colSpan: 4,
  },
  {
    name: "materialSupplierProfile_buyerId",
    label: "採購人員",
    componentType: "DictSelect",
    componentProps: { dictKey: "EMPLOYEE", showSearch: true, optionFilterProp: "_displayName" },
    editable: "always",
    group: "原料商資料",
    hidden: (context) => !context.values.enabledMaterialSupplierRole,
    colSpan: 4,
  },
  {
    name: "materialSupplierProfile_paymentTerms",
    label: "付款條件",
    componentType: "Input",
    editable: "always",
    group: "原料商資料",
    hidden: (context) => !context.values.enabledMaterialSupplierRole,
    colSpan: 4,
  },
  {
    name: "materialSupplierProfile_leadTimeDays",
    label: "預計交期(天)",
    componentType: "InputNumber",
    editable: "always",
    group: "原料商資料",
    hidden: (context) => !context.values.enabledMaterialSupplierRole,
    colSpan: 4,
  },
  {
    name: "materialSupplierProfile_defaultCurrency",
    label: "預設幣別",
    componentType: "Select",
    componentProps: { options: currencyOptions },
    editable: "always",
    group: "原料商資料",
    hidden: (context) => !context.values.enabledMaterialSupplierRole,
    colSpan: 4,
  },
  {
    name: "materialSupplierProfile_isPurchaseBlocked",
    label: "凍結採購",
    componentType: "Checkbox",
    editable: "always",
    group: "原料商資料",
    hidden: (context) => !context.values.enabledMaterialSupplierRole,
    colSpan: 4,
  },
  {
    name: "materialSupplierProfile_status",
    label: "原料商狀態",
    componentType: "Select",
    componentProps: { options: statusOptions },
    editable: "always",
    group: "原料商資料",
    hidden: (context) => !context.values.enabledMaterialSupplierRole,
    colSpan: 4,
  },

  // --- 委外商專屬資料 ---
  {
    name: "outsourceVendorProfile_outsourceVendorCode",
    label: "委外商編號",
    componentType: "Input",
    autoGenerate: true,
    validation: z.string().optional().nullable(),
    group: "委外商資料",
    hidden: (context) => !context.values.enabledOutsourceVendorRole,
    colSpan: 4,
  },
  {
    name: "outsourceVendorProfile_paymentTerms",
    label: "付款條件",
    componentType: "Input",
    editable: "always",
    group: "委外商資料",
    hidden: (context) => !context.values.enabledOutsourceVendorRole,
    colSpan: 4,
  },
  {
    name: "outsourceVendorProfile_leadTimeDays",
    label: "預計交期(天)",
    componentType: "InputNumber",
    editable: "always",
    group: "委外商資料",
    hidden: (context) => !context.values.enabledOutsourceVendorRole,
    colSpan: 4,
  },
  {
    name: "outsourceVendorProfile_isApprovedVendor",
    label: "合格廠商",
    componentType: "Checkbox",
    editable: "always",
    group: "委外商資料",
    hidden: (context) => !context.values.enabledOutsourceVendorRole,
    colSpan: 4,
  },
  {
    name: "outsourceVendorProfile_status",
    label: "委外商狀態",
    componentType: "Select",
    componentProps: { options: statusOptions },
    editable: "always",
    group: "委外商資料",
    hidden: (context) => !context.values.enabledOutsourceVendorRole,
    colSpan: 4,
  },

  // --- 模具商專屬資料 ---
  {
    name: "toolingSupplierProfile_toolingSupplierCode",
    label: "模具商編號",
    componentType: "Input",
    autoGenerate: true,
    validation: z.string().optional().nullable(),
    group: "模具商資料",
    hidden: (context) => !context.values.enabledToolingSupplierRole,
    colSpan: 4,
  },
  {
    name: "toolingSupplierProfile_paymentTerms",
    label: "付款條件",
    componentType: "Input",
    editable: "always",
    group: "模具商資料",
    hidden: (context) => !context.values.enabledToolingSupplierRole,
    colSpan: 4,
  },
  {
    name: "toolingSupplierProfile_leadTimeDays",
    label: "預計交期(天)",
    componentType: "InputNumber",
    editable: "always",
    group: "模具商資料",
    hidden: (context) => !context.values.enabledToolingSupplierRole,
    colSpan: 4,
  },
  {
    name: "toolingSupplierProfile_canRepairTooling",
    label: "可維修模具",
    componentType: "Checkbox",
    editable: "always",
    group: "模具商資料",
    hidden: (context) => !context.values.enabledToolingSupplierRole,
    colSpan: 4,
  },
  {
    name: "toolingSupplierProfile_status",
    label: "模具商狀態",
    componentType: "Select",
    componentProps: { options: statusOptions },
    editable: "always",
    group: "模具商資料",
    hidden: (context) => !context.values.enabledToolingSupplierRole,
    colSpan: 4,
  },
];

export const bpSearchFormConfig = (): SearchFieldConfig[] => [
  {
    name: "CodeOrName",
    label: "代碼/名稱/統編",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "Roles",
    label: "角色身份",
    componentType: "Select",
    componentProps: {
      mode: "multiple",
      options: [
        { label: "客戶", value: "customer" },
        { label: "原料商", value: "material_supplier" },
        { label: "委外商", value: "outsource_vendor" },
        { label: "模具商", value: "tooling_supplier" },
      ],
      allowClear: true,
    },
    colSpan: 2,
  },
  {
    name: "IsTYCustomer",
    label: "是否為東裕客戶",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "是", value: true },
        { label: "否", value: false },
      ],
      allowClear: true,
    },
    colSpan: 2,
  },
];
