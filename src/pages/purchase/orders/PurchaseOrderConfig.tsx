import { z } from "zod";
import { Tag, Space, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { SearchFieldConfig, TableColumnConfig } from "@/components/Form/types";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrderDto, PurchaseOrderItemDto } from "@/api/generated/types.gen";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { EllipsisText } from "@/components/Table/EllipsisText";
import { DictTag } from "@/components/Form/DictTag";

export const getStatusTag = (status: string | null | undefined, closeDate?: string | null) => {
  const statusUpper = (status || '').toUpperCase();
  if (statusUpper === 'CLOSED' || statusUpper === 'FINISHED' || closeDate) {
    return <Tag color="error" className="m-0">已結案</Tag>;
  }
  if (statusUpper === 'CONFIRMED') {
    return <Tag color="success" className="m-0">已確認</Tag>;
  }
  return <Tag color="default" className="m-0">新單據</Tag>;
};

export const searchConfig: SearchFieldConfig[] = [
  {
    name: "code",
    label: "採購單號",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "businessPartnerCodeOrName",
    label: "供應商",
    componentType: "AsyncSelect",
    componentProps: { configKey: "MATERIAL_SUPPLIER" },
    colSpan: 2,
  },
  {
    name: "status",
    label: "狀態",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "新單據 (Draft)", value: "DRAFT" },
        { label: "已確認 (Confirmed)", value: "CONFIRMED" },
        { label: "已結案 (Finished)", value: "CLOSED" },
      ],
      allowClear: true,
    },
    colSpan: 2,
  },
  {
    name: "ticketDate",
    label: "單據日期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
];

export const getColumns = (): TableColumnConfig<PurchaseOrderDto>[] => [
  {
    label: "採購單號",
    name: "code",
    width: 150,
    sortable: { multiple: 1 },
  },
  {
    label: "單據日期",
    name: "ticketDate",
    width: 120,
    sortable: { multiple: 2 },
    render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD") : "-"),
  },
  {
    label: "單據狀態",
    name: "status",
    width: 100,
    sortable: { multiple: 3 },
    render: (status: string, record: any) => getStatusTag(status, record.closedAt),
  },
  {
    label: "供應商",
    name: "businessPartnerName",
    width: 240,
    render: (val: string, record: any) => {
      const displayCode = record.supplierCode || record.businessPartnerCode;
      const bpCode = record.businessPartnerCode;
      const name = val && displayCode ? `[${displayCode}] ${val}` : (val || displayCode || "-");
      if (!bpCode) return "-";
      return (
        <Link 
          to={`/basic/business-partners/${bpCode}`} 
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
  {
    label: "未稅小計",
    name: "subTotalAmount",
    width: 120,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "0",
  },
  {
    label: "稅額",
    name: "taxAmount",
    width: 100,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "0",
  },
  {
    label: "總金額",
    name: "totalAmount",
    width: 120,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "0",
  },
  {
    label: "預計到貨日",
    name: "expectedArrivalDate",
    width: 120,
    render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD") : "-"),
  },
  {
    label: "備註",
    name: "notes",
    ellipsis: true,
  },
];

export const getFormConfig = (): any[] => [
  {
    name: "code",
    label: "採購單號",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
    componentProps: {
      placeholder: "【系統自動編碼】"
    }
  },
  {
    name: "ticketDate",
    label: "單據日期",
    componentType: "DatePicker",
    editable: "createOnly",
    colSpan: 4,
    validation: z.any().optional(),
  },
  {
    name: "businessPartnerCode",
    label: "供應商",
    componentType: "AsyncSelect",
    componentProps: { configKey: "MATERIAL_SUPPLIER" },
    editable: "createOnly",
    colSpan: 4,
    validation: z.string().min(1, "供應商為必填"),
  },
  {
    name: "currency",
    label: "幣別",
    componentType: "Select",
    editable: "never",
    componentProps: {
      options: [
        { label: "新台幣 (TWD)", value: "TWD" },
        { label: "美金 (USD)", value: "USD" },
        { label: "人民幣 (CNY)", value: "CNY" }
      ]
    },
    colSpan: 4,
    validation: z.string().min(1, "幣別為必填"),
  },
  {
    name: "exchangeRate",
    label: "匯率",
    componentType: "InputNumber",
    editable: "never",
    colSpan: 4,
    componentProps: {
      controls: false,
      style: { width: "100%" }
    },
    validation: z.number().min(0, "匯率不能為負數"),
  },
  {
    name: "taxType",
    label: "稅別",
    componentType: "Select",
    editable: "never",
    componentProps: {
      options: [
        { label: "應稅 (5%)", value: "Taxable" },
        { label: "零稅率", value: "ZeroTax" },
        { label: "免稅", value: "TaxFree" }
      ]
    },
    colSpan: 4,
    validation: z.string().min(1, "稅別為必填"),
  },
  {
    name: "taxRate",
    label: "稅率 (%)",
    componentType: "InputNumber",
    editable: "never",
    colSpan: 4,
    componentProps: {
      controls: false,
      style: { width: "100%" }
    },
    validation: z.number().min(0, "稅率不能為負數"),
  },
  {
    name: "expectedArrivalDate",
    label: "預計到貨日",
    componentType: "DatePicker",
    colSpan: 4,
    validation: z.any().optional(),
  },
    {
    name: "subTotalAmount",
    label: "未稅小計",
    componentType: "InputNumber",
    colSpan: 3,
    editable: "never",
    componentProps: {
      controls: false,
      style: { width: "100%" },
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    },
  },
  {
    name: "taxAmount",
    label: "稅額",
    componentType: "InputNumber",
    colSpan: 3,
    editable: "never",
    componentProps: {
      controls: false,
      style: { width: "100%" },
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    },
  },
  {
    name: "totalAmount",
    label: "含稅總金額",
    componentType: "InputNumber",
    colSpan: 3,
    editable: "never",
    componentProps: {
      controls: false,
      style: { width: "100%" },
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
    },
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    colSpan: 1,
    componentProps: {
      rows: 3,
      placeholder: "請輸入備註"
    }
  },

];

export const getItemColumns = (
  isViewMode: boolean,
  onEdit: (record: PurchaseOrderItemDto) => void,
  onDelete: (record: PurchaseOrderItemDto) => void,
): ColumnsType<PurchaseOrderItemDto> => [
  {
    title: "操作",
    key: "action",
    width: 80,
    align: "center",
    fixed: 'right' as const,
    render: (_: any, record: PurchaseOrderItemDto) => {
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
    title: "序號",
    dataIndex: "lineNumber",
    width: 60,
    align: "left",
    ellipsis: true,
  },
  {
    title: "預計交期",
    dataIndex: "requestedDeliveryDate",
    width: 120,
    render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD") : "-"),
  },

  {
    title: "商品類型",
    dataIndex: "goodsType",
    width: 100,
    render: (val: string) => <DictTag dictKey="PRODUCT_TYPE" value={val} />,
  },
  {
    title: "商品代碼",
    dataIndex: "goodsCode",
    width: 150,
  },
  {
    title: "商品名稱",
    dataIndex: "goodsName",
    width: 200,
    ellipsis: true,
  },
  {
    title: "單價",
    dataIndex: "unitPrice",
    width: 100,
    align: "right",
    render: (val: number) => (val != null ? Number(val.toFixed(2)).toLocaleString() : "0"),
  },
  {
    title: "採購單位",
    dataIndex: "unit",
    width: 80,
    align: "center",
  },
  {
    title: "數量",
    dataIndex: "quantity",
    width: 100,
    align: "right",
    render: (val: number) => (val != null ? Number(val.toFixed(4)).toLocaleString() : "0"),
  },
  {
    title: "小計",
    dataIndex: "subTotal",
    width: 120,
    align: "right",
    render: (val: number) => (val != null ? Number(val.toFixed(2)).toLocaleString() : "0"),
  },
  {
    title: "備註",
    dataIndex: "notes",
    ellipsis: true,
  },
];

export const getItemFormConfig = (): any[] => [
  {
    name: "goodsType",
    label: "商品類型",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "原物料 (M)", value: "M" },
        { label: "其他 (O)", value: "O" }
      ]
    },
    colSpan: 4,
    validation: z.string().min(1, "商品類型為必填"),
    onChange: (_value: any, _context: any, setValue: any) => {
      setValue("goodsCode", undefined);
      setValue("goodsName", "");
      setValue("materialForm", undefined);
      setValue("unit", "卷");
    }
  },
  {
    name: "goodsCode",
    label: "商品編碼",
    componentType: "AsyncSelect",
    componentProps: (context: any) => {
      const isM = context?.values?.goodsType === "M";
      return { configKey: isM ? "MATERIAL" : "PRODUCT" };
    },
    colSpan: 4,
    validation: z.string().min(1, "商品編碼為必填"),
    onChange: (_value: any, _context: any, setValue: any, ...args: any[]) => {
      const option = args[1];
      if (option && option.originalData) {
        setValue("goodsName", option.originalData.name || "");
        
        const isM = _context?.values?.goodsType === "M";
        if (isM) {
          const form = option.originalData.materialForm; // "R" = 捲材, "S" = 片材
          setValue("materialForm", form);
          if (form === "S") {
            setValue("unit", "包");
          } else {
            setValue("unit", "卷");
          }
        } else {
          setValue("materialForm", undefined);
          setValue("unit", "卷");
        }
      }
    }
  },
  {
    name: "goodsName",
    label: "商品名稱",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
  },
  {
    name: "requestedDeliveryDate",
    label: "CRD",
    componentType: "DatePicker",
    colSpan: 4,
    validation: z.any().optional(),
  },
  {
    name: "unitPrice",
    label: (context: any) => {
      const unit = context?.values?.unit;
      return unit ? `單價 (${unit})` : "單價";
    },
    componentType: "InputNumber",
    colSpan: 4,
    validation: z.number().min(0, "單價不能為負數"),
    onChange: (value: any, context: any, setValue: any) => {
      const qty = context.values.quantity || 0;
      const price = value || 0;
      const subTotal = Math.round(price * qty);
      const tax = Math.round(subTotal * 0.05);
      const lineAmount = subTotal + tax;
      setValue("subTotal", subTotal);
      setValue("tax", tax);
      setValue("lineAmount", lineAmount);
    },
    componentProps: {
      controls: false,
      style: { width: "100%" }
    }
  },
  {
    name: "quantity",
    label: "數量",
    componentType: "InputNumber",
    colSpan: 4,
    validation: z.number().min(0.0001, "數量必須大於0"),
    onChange: (value: any, context: any, setValue: any) => {
      const qty = value || 0;
      const price = context.values.unitPrice || 0;
      const subTotal = Math.round(price * qty);
      const tax = Math.round(subTotal * 0.05);
      const lineAmount = subTotal + tax;
      setValue("subTotal", subTotal);
      setValue("tax", tax);
      setValue("lineAmount", lineAmount);
    },
    componentProps: {
      controls: false,
      style: { width: "100%" }
    }
  },
  {
    name: "unit",
    label: "採購單位",
    componentType: (context: any) => {
      const isM = context?.values?.goodsType === "M";
      return isM ? "Select" : "Input";
    },
    colSpan: 4,
    validation: z.string().min(1, "採購單位為必填"),
    componentProps: (context: any) => {
      const isM = context?.values?.goodsType === "M";
      if (isM) {
        const form = context?.values?.materialForm; // "R" = 捲材, "S" = 片材
        if (form === "S") {
          return {
            options: [
              { label: "包", value: "包" },
              { label: "箱", value: "箱" }
            ]
          };
        } else {
          return {
            options: [
              { label: "卷", value: "卷" },
              { label: "平方米", value: "平方米" }
            ]
          };
        }
      }
      return {
        placeholder: "請輸入採購單位"
      };
    }
  },
  {
    name: "subTotal",
    label: "小計",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "never",
    componentProps: {
      controls: false,
      style: { width: "100%" }
    }
  },

  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    colSpan: 1,
    componentProps: {
      rows: 3,
      placeholder: "請輸入備註"
    }
  }
];
