import { Space, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { z } from "zod";
import { Tag } from "antd";
import { SyncOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { SearchFieldConfig } from "@/components/Form/types";
import type { ColumnsType } from "antd/es/table";
import type { SalesDeliveryDto, SalesDeliveryItemDto } from "@/api/generated/types.gen";
import dayjs from "dayjs";
import { ContactSelectWithCreate } from "../orders/components/ContactSelectWithCreate";
// import { DictLabel } from "@/components/Form/DictLabel";

export const getStatusTag = (row: SalesDeliveryDto) => {
  if (row.confirmDate) {
    return <Tag color="success" icon={<CheckCircleOutlined />}>已確認</Tag>;
  }
  return <Tag color="warning" icon={<SyncOutlined />}>待確認</Tag>;
};

export const searchConfig: SearchFieldConfig[] = [
  { name: "documentNumber", label: "單據號碼", componentType: "Input", colSpan: 2 },
  { 
    name: "customerCodeOrName", 
    label: "客戶", 
    componentType: "AsyncSelect",
    componentProps: { configKey: "CUSTOMER" }, 
    colSpan: 2 
  },
  { name: "invoiceNumber", label: "發票號碼", componentType: "Input", colSpan: 2 },
  { 
    name: "shippedConfirmed", 
    label: "狀態", 
    componentType: "Select",
    componentProps: {
      options: [
        { label: '已確認', value: true },
        { label: '未確認', value: false }
      ]
    },
    colSpan: 2 
  },
  { name: "dateRange", label: "銷貨日期區間", componentType: "DateRangePicker", colSpan: 4 },
  { name: "others", label: "備註/地址", componentType: "Input", colSpan: 2 },
];

export const getColumns = (
  onEdit: (row: SalesDeliveryDto) => void,
  
): ColumnsType<SalesDeliveryDto> => [
  {
    title: "單據號碼",
    dataIndex: "documentNumber",
    width: 150,
    fixed: "left",
    render: (val, row) => (
      <a onClick={(e) => { e.preventDefault(); onEdit(row); }} className="text-blue-500 hover:underline">
        {val}
      </a>
    ),
  },
  { title: "單據日期", dataIndex: "documentDate", width: 120, render: (val) => (val ? dayjs(val).format("YYYY-MM-DD") : "-") },
  { title: "客戶代碼", dataIndex: "businessPartnerCode", width: 100 },
  { title: "客戶名稱", dataIndex: "businessPartnerName", width: 180, ellipsis: true },
  { title: "發票號碼", dataIndex: "invoiceNumber", width: 120 },
  { title: "業務員", dataIndex: "responsibleUserName", width: 100 },
  { title: "小計", dataIndex: "subTotal", width: 100, align: "right", render: (val) => val != null ? Number(val).toLocaleString() : "-" },
  { title: "稅額", dataIndex: "taxAmount", width: 100, align: "right", render: (val) => val != null ? Number(val).toLocaleString() : "-" },
  { title: "總金額", dataIndex: "totalAmount", width: 120, align: "right", render: (val) => <span className="font-semibold">{val != null ? Number(val).toLocaleString() : "-"}</span> },
  { title: "狀態", key: "status", width: 100, render: (_, row) => getStatusTag(row) },
  { title: "確認人員", dataIndex: "confirmUserName", width: 100 },
  { title: "確認日期", dataIndex: "confirmDate", width: 120, render: (val) => (val ? dayjs(val).format("YYYY-MM-DD") : "-") },
  { title: "備註", dataIndex: "notes", ellipsis: true, width: 200 },
];



export const getFormConfig = (): any[] => [
  // --- 第一排：客戶、客戶名稱、單據日期、業務員 ---
  {
    name: "businessPartnerCode",
    label: "客戶",
    componentType: "AsyncSelect",
    componentProps: { configKey: "CUSTOMER", autoFocus: true },
    editable: "createOnly",
    onChange: (_value: any, _context: any, setValue: any, ...args: any[]) => {
      if (!_value) {
        setValue("partnerContactId", undefined);
        setValue("businessPartnerName", undefined);
        setValue("businessPartnerPhone", undefined);
        setValue("businessPartnerFax", undefined);
        setValue("address", undefined);
        // 若有其他付款條件等欄位也可在此清空 (依據業務需求，若表單上有就可以清)
      } else {
        setValue("partnerContactId", undefined);
        const option = args[1];
        if (option && option.originalData) {
          const bp = option.originalData;
          setValue("businessPartnerName", bp.name || undefined);
          setValue("businessPartnerPhone", bp.phone || undefined);
          setValue("businessPartnerFax", bp.faxNumber || undefined);
          setValue("address", bp.address || undefined);
        } else {
          setValue("businessPartnerName", undefined);
          setValue("businessPartnerPhone", undefined);
          setValue("businessPartnerFax", undefined);
          setValue("address", undefined);
        }
      }
    },
    colSpan: 4,
    validation: z.string().min(1, "請輸入客戶代碼"),
  },
  {
    name: "businessPartnerName",
    label: "客戶名稱",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
  },
  {
    name: "documentDate",
    label: "單據日期",
    componentType: "DatePicker",
    colSpan: 4,
    editable: "createOnly",
    validation: z.any(),
  },
  {
    name: "responsibleEmployeeCode",
    label: "業務員",
    componentType: "DictSelect",
    componentProps: { dictKey: "EMPLOYEE" },
    colSpan: 4,
  },

  // --- 第二排：客戶電話、傳真、聯絡人、地址 ---
  {
    name: "businessPartnerPhone",
    label: "客戶電話",
    componentType: "Input",
    colSpan: 4,
  },
  {
    name: "businessPartnerFax",
    label: "客戶傳真",
    componentType: "Input",
    colSpan: 4,
  },
  {
    name: "partnerContactId",
    label: "聯絡人",
    componentType: "Custom",
    customRender: (field: any, context: any) => (
      <ContactSelectWithCreate
        value={field.value}
        onChange={field.onChange}
        disabled={field.disabled}
        businessPartnerCode={context.values?.businessPartnerCode}
      />
    ),
    colSpan: 4,
  },
  {
    name: "address",
    label: "地址",
    componentType: "Input",
    colSpan: 4,
    validation: z.string().min(1, "請輸入地址"),
  },

  // --- 第三排：發票號碼、小計、稅額、總金額 ---
  {
    name: "invoiceNumber",
    label: "發票號碼",
    componentType: "Input",
    colSpan: 4,
  },
  {
    name: "subTotal",
    label: "小計",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "never",
    componentProps: {
      formatter: (value: any) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      parser: (value: any) => value!.replace(/\$\s?|(,*)/g, ''),
      precision: 2,
    }
  },
  {
    name: "taxAmount",
    label: "稅額",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "never",
    componentProps: {
      formatter: (value: any) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      parser: (value: any) => value!.replace(/\$\s?|(,*)/g, ''),
      precision: 2,
    }
  },
  {
    name: "totalAmount",
    label: "總金額",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "never",
    componentProps: {
      formatter: (value: any) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      parser: (value: any) => value!.replace(/\$\s?|(,*)/g, ''),
      precision: 2,
    }
  },

  // --- 第四排：備註 ---
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    colSpan: 1,
    componentProps: { rows: 3 },
  },
];


export const getItemColumns = (
  isViewMode: boolean,
  onEdit: (record: SalesDeliveryItemDto) => void,
  onDelete: (record: SalesDeliveryItemDto) => void,
): ColumnsType<SalesDeliveryItemDto> => [
  {
    title: "操作",
    key: "action",
    width: 80,
    align: "center",
    fixed: 'right' as const,
    render: (_, record) => {
      if (isViewMode) return null;
      return (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined style={{ fontSize: "16px" }} />}
            onClick={() => onEdit(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined style={{ fontSize: "16px" }} />}
            onClick={() => onDelete(record)}
          />
        </Space>
      );
    },
  },
  {
    title: "序號(項次)",
    dataIndex: "serialNumber",
    width: 100,
    align: "left",
    ellipsis: true,
  },
  {
    title: "來源單號",
    dataIndex: "referenceNumber",
    width: 160,
    align: "left",
    ellipsis: true,
  },
  {
    title: "料號",
    dataIndex: "inventoryCode",
    width: 140,
    align: "left",
    ellipsis: true,
  },
  {
    title: "品名",
    dataIndex: "inventoryName",
    width: 220,
    ellipsis: true,
  },
  {
    title: "出庫儲位",
    dataIndex: "sourceStorageCode",
    width: 120,
    align: "center",
    ellipsis: true,
  },
  {
    title: "單價",
    dataIndex: "unitPrice",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: any) => val != null ? Number(Number(val).toFixed(2)).toLocaleString() : "-",
  },
  {
    title: "數量",
    dataIndex: "quantity",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: any) => val != null ? Number(Number(val).toFixed(2)).toLocaleString() : "-",
  },
  {
    title: "小計",
    dataIndex: "amount",
    width: 120,
    align: "right",
    ellipsis: true,
    render: (val: any) => val != null ? <span style={{ color: 'var(--ant-color-primary)' }}>{Number(Number(val).toFixed(2)).toLocaleString()}</span> : "-",
  },
  {
    title: "備註",
    dataIndex: "notes",
    width: 160,
    ellipsis: true,
  },
];

export const getItemFormConfig = (): any[] => [
  {
    name: "referenceNumber",
    label: "來源單號",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
  },
  {
    name: "inventoryCode",
    label: "料號",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
  },
  {
    name: "inventoryName",
    label: "品名",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
  },
  {
    name: "sourceStorageCode",
    label: "出庫儲位",
    componentType: "DictSelect",
    componentProps: { dictKey: "STORAGE" },
    colSpan: 4,
    editable: "never",
  },
  {
    name: "unitPrice",
    label: "單價",
    componentType: "InputNumber",
    colSpan: 4,
    validation: z.number().min(0, "單價必須大於或等於0"),
    onChange: (value: any, context: any, setValue: any) => {
      const qty = context.values.quantity || 0;
      const amount = Math.round((value || 0) * qty);
      setValue("amount", amount);
    },
    componentProps: {
      formatter: (value: any) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) => value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },

  {
    name: "quantity",
    label: "數量",
    componentType: "InputNumber",
    colSpan: 4,
    validation: z.number().min(0, "數量必須大於或等於0"),
    onChange: (value: any, context: any, setValue: any) => {
      const price = context.values.unitPrice || 0;
      const amount = Math.round(price * (value || 0));
      setValue("amount", amount);
    },
    componentProps: {
      formatter: (value: any) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) => value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },
  {
    name: "amount",
    label: "小計",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "never",
    componentProps: {
      formatter: (value: any) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) => value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    colSpan: 1,
    componentProps: { rows: 4 },
  },
];
