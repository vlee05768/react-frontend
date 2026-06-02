import { Tag } from "antd";
import type { SearchFieldConfig } from "@/components/Form/types";
import { z } from "zod";
import type {
  FormFieldConfig,
  TableColumnConfig,
} from "@/components/Form/types";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

export const mainDictionary = {
  code: { name: "code", label: "儲位編碼" },
  name: { name: "name", label: "儲位名稱" },
  type: { name: "type", label: "儲位類型" },
  location: { name: "location", label: "地區" },
  area: { name: "area", label: "區域" },
  isCalculateInventory: { name: "isCalculateInventory", label: "計算庫存" },
  isActive: { name: "isActive", label: "狀態" },
  notes: { name: "notes", label: "備註" },
} as const;

export const mainFormConfig = (): FormFieldConfig[] => [
  {
    ...mainDictionary.code,
    componentType: "Custom",
    validation: z.any().optional().nullable(),
    editable: "never",
    colSpan: 4,
    customRender: (props) => {
      const val = props.value;
      if (!val) {
        return <span className="text-gray-400 italic">【系統自動編碼】</span>;
      }
      return (
        <div className="flex items-center h-[32px]">
          <Tag color="blue" className="m-0 font-medium">
            {val}
          </Tag>
        </div>
      );
    },
  },
  {
    ...mainDictionary.name,
    componentType: "Custom",
    validation: z.string().min(1, "儲位名稱為必填"),
    editable: "never",
    colSpan: 4,
    customRender: (props, context) => {
      const val = props.value;
      if (!val) {
        return <span className="text-gray-400 italic">【系統自動產生】</span>;
      }
      const type = context.values.type;
      const color =
        type === "MAT" ? "cyan" : type === "FG" ? "purple" : "orange";
      return (
        <div className="flex items-center h-[32px]">
          <Tag color={color} className="m-0 font-medium">
            {val}
          </Tag>
        </div>
      );
    },
  },  
  {
    ...mainDictionary.location,
    componentType: "Custom",
    validation: z.string().min(1, "地區為必填").default("TW"),
    editable: "never",
    colSpan: 4,
    customRender: (props) => {
      const val = props.value || "TW";
      return (
        <div className="flex items-center h-[32px]">
          <Tag color="geekblue" className="m-0 font-medium">
            {val}
          </Tag>
        </div>
      );
    },
  },
  {
    ...mainDictionary.type,
    componentType: "Select",
    validation: z.string().min(1, "儲位類型為必填"),
    editable: "createOnly",
    colSpan: 4,
    componentProps: {
      options: [
        { label: "MAT (原料)", value: "MAT" },
        { label: "FG (成品)", value: "FG" },
      ],
    },
    onChange: (value, context, setValue) => {
      const typeValue = value || "MAT";
      const areaValue = context.values.area || "";
      const typeName =
        typeValue === "MAT" ? "原料" : typeValue === "FG" ? "成品" : typeValue;

      const isValidArea =
        /^[A-Za-z](0[1-9]|[1-9][0-9])(0[1-9]|[1-9][0-9])$/.test(areaValue);

      if (isValidArea) {
        const computedName = `${typeName}倉-${areaValue}`;
        setValue("name", computedName);
      } else {
        setValue("name", "");
      }
    },
  },
  {
    ...mainDictionary.area,
    componentType: "Input",
    validation: z
      .string()
      .min(1, "區域為必填")
      .regex(
        /^[A-Za-z](0[1-9]|[1-9][0-9])(0[1-9]|[1-9][0-9])$/,
        "區域格式需為 5 碼：大寫字母 1 碼（貨架）+ 2 位層數 + 2 位格數（層與格編碼皆須由 01 開始，不可為 00，例如 B0104）",
      ),
    editable: "createOnly",
    colSpan: 4,
    componentProps: {
      isCode: true,
      placeholder: "請輸入區域編碼（例如 B0104）",
    },
    onChange: (value, context, setValue) => {
      const areaValue = value?.toUpperCase() || "";
      const typeValue = context.values.type || "MAT";
      const typeName =
        typeValue === "MAT" ? "原料" : typeValue === "FG" ? "成品" : typeValue;

      const isValidArea =
        /^[A-Za-z](0[1-9]|[1-9][0-9])(0[1-9]|[1-9][0-9])$/.test(areaValue);

      if (isValidArea) {
        const computedName = `${typeName}倉-${areaValue}`;
        setValue("name", computedName);
      } else {
        setValue("name", "");
      }
    },
  },

  {
    ...mainDictionary.isActive,
    componentType: "Switch",
    validation: z.boolean().optional(),
    editable: "always",
    colSpan: 4,

  },
  {
    ...mainDictionary.notes,
    componentType: "TextArea",
    validation: z.any().optional().nullable(),
    editable: "always",
    colSpan: 1,

  },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  { ...mainDictionary.code, sortable: { multiple: 1 }, width: 140 },
  { ...mainDictionary.name, sortable: { multiple: 2 }, width: 160 },
  { ...mainDictionary.location, width: 80 },
  { ...mainDictionary.type, sortable: { multiple: 3 }, width: 100 },
  { ...mainDictionary.area, width: 100 },
  {
    ...mainDictionary.isActive,
    width: 60,
    align: "center",
    render: (v: boolean | undefined | null) =>
      v === true ? (
        <CheckOutlined style={{ color: "green" }} />
      ) : v === false ? (
        <CloseOutlined style={{ color: "red" }} />
      ) : null,
  },
  { ...mainDictionary.notes, width: 200 },
];

export const detailDictionaries = {} as const;
export const detailFormConfigs = {};
export const detailTableColumns = {};

export const storageSearchFormConfig = (): SearchFieldConfig[] => [
  {
    name: "CodeOrName",
    label: "編號或名稱",
    componentType: "Input",
    colSpan: 2,
  },
  { name: "Type", label: "類型", componentType: "Input", colSpan: 2 },
  { name: "Location", label: "地區", componentType: "Input", colSpan: 2 },
  {
    name: "IsActive",
    label: "狀態",
    componentType: "Select",
    colSpan: 2,
    componentProps: {
      options: [
        { label: "啟用", value: true },
        { label: "停用", value: false },
      ],
      allowClear: true,
    },
  },
];
