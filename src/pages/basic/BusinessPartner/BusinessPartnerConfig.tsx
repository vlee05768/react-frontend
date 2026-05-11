import { z } from "zod";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import type { SearchFieldConfig,
  FormFieldConfig,
  TableColumnConfig,
} from "@/components/Form/types";

export const bpTypeOptions = [
  { label: "客戶", value: "C" },
  { label: "供應商", value: "S" },
  { label: "同行", value: "P" },
];

export const mainTableColumns = (): TableColumnConfig[] => [
  {
    label: "編號",
    name: "code",
    width: 120,
  },
  {
    label: "名稱",
    name: "name",
    width: 200,
  },
  {
    label: "統一編號",
    name: "taxId",
    width: 120,
  },
  {
    label: "東裕客戶",
    name: "isTYCustomer",
    width: 100,
    align: 'center',
    render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null),
  },
  {
    label: "廠商客戶檔類型",
    name: "type",
    width: 150,
    render: (val: string) => {
      const opt = bpTypeOptions.find((o) => o.value === val);
      return opt ? opt.label : val;
    },
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
];

export const mainFormConfig = (): FormFieldConfig[] => [
  {
    name: "code",
    label: "編號",
    componentType: "Input",
    autoGenerate: true,
    validation: z.string().min(1, "請輸入編號"),
    colSpan: 4,
  },
  {
    name: "type",
    label: "夥伴類型",
    componentType: "Select",
    componentProps: { options: bpTypeOptions },
    editable: "always",
    validation: z.string().min(1, "請選擇夥伴類型"),
    colSpan: 4,
  },
  {
    name: "name",
    label: "公司名稱",
    componentType: "Input",
    editable: "always",
    validateTrigger: "onChange",
    validation: z.string().min(1, "請輸入公司名稱"),
    colSpan: 2,
  },
  {
    name: "address",
    label: "公司登記地址",
    componentType: "Input",
    editable: "always",
    colSpan: 2,
  },
  {
    name: "phone",
    label: "公司電話",
    componentType: "Input",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "faxNumber",
    label: "公司傳真",
    componentType: "Input",
    editable: "always",
    colSpan: 4,
  },

  {
    name: "taxId",
    label: "統一編號",
    componentType: "Input",
    editable: "always",
    colSpan: 4,
  },  
  {
    name: "isTYCustomer",
    label: "東裕客戶",
    componentType: "Switch",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "website",
    label: "官方網站",
    componentType: "Input",
    editable: "always",
    colSpan: 2,
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "always",
    colSpan: 1,
  },  
  {
    name: "paymentTerms",
    label: "收/付款條件",
    componentType: "Input",
    editable: "always",
    group: "商業條款",
    colSpan: 2,
  },
  {
    name: "creditLimit",
    label: "信用額度",
    componentType: "InputNumber",
    editable: "always",
    group: "商業條款",
    colSpan: 4,
  },
  {
    name: "leadTimeDays",
    label: "預計交期(天)",
    componentType: "InputNumber",
    editable: "always",
    group: "商業條款",
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
    name: "Types",
    label: "夥伴類型",
    componentType: "Select",
    componentProps: { 
      mode: 'multiple', 
      options: bpTypeOptions 
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
  {
    name: "Others",
    label: "其他條件",
    componentType: "Input",
    colSpan: 2,
  },
];
