import { z } from "zod";
import { Tag, Button, Space } from "antd";
import { EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import type { SearchFieldConfig } from "@/components/Form/types";
import type { ColumnsType } from "antd/es/table";
import type { OrderDto, OrderItemDto } from "@/api/generated/types.gen";
import dayjs from "dayjs";
import { ContactSelectWithCreate } from "./components/ContactSelectWithCreate";
import { DictLabel } from "@/components/Form/DictLabel";

export const searchConfig: SearchFieldConfig[] = [
  {
    name: "orderNumber",
    label: "訂單號碼",
    componentType: "Input",
    colSpan: 3,
  },
  {
    name: "businessPartnerCode",
    label: "客戶",
    componentType: "AsyncSelect",
    componentProps: { configKey: "CUSTOMER" },
    colSpan: 3,
  },
  {
    name: "status",
    label: "狀態",
    componentType: "DictSelect",
    componentProps: { dictKey: "ORDER_STATUS" },
    colSpan: 3,
  },
  {
    name: "orderDate",
    label: "訂單日期",
    componentType: "DateRangePicker",
    colSpan: 3,
  },
];

export const getColumns = (): ColumnsType<OrderDto> => [
  {
    title: "訂單編號",
    dataIndex: "orderNumber",
    key: "orderNumber",
    width: 150,
  },
  {
    title: "訂單日期",
    dataIndex: "orderDate",
    key: "orderDate",
    width: 120,
    render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD") : "-"),
  },
  {
    title: "客戶代碼",
    dataIndex: "businessPartnerCode",
    key: "businessPartnerCode",
    width: 120,
  },
  {
    title: "客戶名稱",
    dataIndex: "businessPartnerName",
    key: "businessPartnerName",
    width: 180,
    ellipsis: true,
  },
  {
    title: "訂單狀態",
    dataIndex: "status",
    key: "status",
    width: 100,
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        Draft: "default",
        Confirmed: "processing",
        Finished: "success",
      };
      const textMap: Record<string, string> = {
        Draft: "草稿",
        Confirmed: "已確認",
        Finished: "已結案",
      };
      return (
        <Tag color={colorMap[status] || "default"}>
          {textMap[status] || status}
        </Tag>
      );
    },
  },
  {
    title: "小計",
    dataIndex: "subTotal",
    key: "subTotal",
    width: 120,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "0",
  },
  {
    title: "稅額",
    dataIndex: "taxAmount",
    key: "taxAmount",
    width: 100,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "0",
  },
  {
    title: "總金額",
    dataIndex: "totalAmount",
    key: "totalAmount",
    width: 120,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "0",
  },
  {
    title: "交貨日期",
    dataIndex: "requestedDeliveryDate",
    key: "requestedDeliveryDate",
    width: 120,
    render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD") : "-"),
  },
  {
    title: "承諾交貨日期",
    dataIndex: "promisedDeliveryDate",
    key: "promisedDeliveryDate",
    width: 140,
    render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD") : "-"),
  },
  {
    title: "備註",
    dataIndex: "notes",
    key: "notes",
    ellipsis: true,
  },
];

export const getFormConfig = (): any[] => [
  {
    name: "orderNumber",
    label: "訂單號碼",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
  },
  {
    name: "orderDate",
    label: "訂單日期",
    componentType: "DatePicker",
    editable: "createOnly",
    colSpan: 4,
    validation: z.any().optional(),
  },
  {
    name: "businessPartnerCode",
    label: "客戶",
    componentType: "AsyncSelect",
    componentProps: { configKey: "CUSTOMER" },
    editable: "createOnly",
    onChange: (_value: any, _context: any, setValue: any, ...args: any[]) => {
      // 若變更了客戶，則清空聯絡人
      setValue("partnerContactId", undefined);

      const option = args[1];
      if (option && option.originalData) {
        const bp = option.originalData;
        if (bp.address) setValue("shippingAddress", bp.address);
        if (bp.paymentTerms) setValue("paymentTerms", bp.paymentTerms);
      }
    },
    colSpan: 2,
    validation: z.string().min(1, "客戶為必填"),
  },
  {
    name: "partnerContactId",
    label: "聯絡人",
    componentType: "Custom",
    customRender: (field: any, context: any, _setValue: any) => (
      <ContactSelectWithCreate
        value={field.value}
        onChange={field.onChange}
        disabled={field.disabled}
        businessPartnerCode={context.values.businessPartnerCode}
      />
    ),
    colSpan: 4,
  },
  {
    name: "customerPoNumber",
    label: "客戶採購單號",
    componentType: "Input",
    colSpan: 4,
  },
  {
    name: "salespersonEmployeeCode",
    label: "業務員",
    componentType: "DictSelect",
    componentProps: { dictKey: "EMPLOYEE" },
    colSpan: 4,
  },
  {
    name: "paymentTerms",
    label: "付款條件",
    componentType: "Input",
    colSpan: 4,
  },
  {
    name: "shippingAddress",
    label: "送貨地址",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "requestedDeliveryDate",
    label: "要求交期",
    componentType: "DatePicker",
    colSpan: 4,
  },
  {
    name: "promisedDeliveryDate",
    label: "承諾交期",
    componentType: "DatePicker",
    colSpan: 4,
  },
  {
    name: "tag",
    label: "標籤",
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
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) =>
        value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },
  {
    name: "taxAmount",
    label: "稅額",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "never",
    componentProps: {
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) =>
        value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },
  {
    name: "totalAmount",
    label: "總金額",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "never",
    componentProps: {
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) =>
        value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    colSpan: 1,
  },
];

export const getItemColumns = (
  isViewMode: boolean,
  onEdit: (record: OrderItemDto) => void,
  onDelete: (record: OrderItemDto) => void,
): ColumnsType<OrderItemDto> => [
  {
    title: "操作",
    key: "action",
    width: 80,
    align: "center",
    fixed: "left",
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
    title: "類型",
    dataIndex: "goodsType",
    width: 90,
    align: "center",
    ellipsis: true,
    render: (val: string) =>
      val ? (
        <Tag color="blue">
          <DictLabel dictKey="PRODUCT_TYPE" value={val} />
        </Tag>
      ) : (
        "-"
      ),
  },
  {
    title: "商品編碼",
    dataIndex: "goodsCode",
    width: 140,
    align: "left",
    ellipsis: true,
  },
  { title: "商品名稱", dataIndex: "goodsName", width: 220, ellipsis: true },
  {
    title: "優先級",
    dataIndex: "priority",
    width: 100,
    align: "center",
    ellipsis: true,
    render: (val: string) =>
      val ? <DictLabel dictKey="ORDER_PRIORITY" value={val} /> : "-",
  },
  {
    title: "產生製令",
    dataIndex: "generateWorkOrder",
    width: 90,
    align: "center",
    ellipsis: true,
    render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null),
  },
  {
    title: "單價",
    dataIndex: "unitPrice",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    title: "數量",
    dataIndex: "quantity",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    title: "小計",
    dataIndex: "lineAmount",
    width: 120,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    title: "備品數量",
    dataIndex: "spareQuantity",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    title: "已出貨",
    dataIndex: "quantityShipped",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    title: "取消數量",
    dataIndex: "quantityCancelled",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    title: "剩餘數量",
    dataIndex: "quantityRemaining",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
  },
  {
    title: "要求交期",
    dataIndex: "requestedDeliveryDate",
    width: 120,
    align: "center",
    ellipsis: true,
    render: (d: string) => (d ? dayjs(d).format("YYYY-MM-DD") : "-"),
  },
  {
    title: "承諾交期",
    dataIndex: "promisedDeliveryDate",
    width: 120,
    align: "center",
    ellipsis: true,
    render: (d: string) => (d ? dayjs(d).format("YYYY-MM-DD") : "-"),
  },
  { title: "備註", dataIndex: "notes", width: 160, ellipsis: true },
];

export const getItemFormConfig = (): any[] => [
  {
    name: "goodsCode",
    label: "商品編碼",
    editable: "never",
    componentType: "AsyncSelect",
    componentProps: { configKey: "PRODUCT" },
    colSpan: 4,
    validation: z.string().optional(),
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
    label: "要求交期",
    componentType: "DatePicker",
    colSpan: 4,
    validation: z.any().optional(),
  },
  {
    name: "promisedDeliveryDate",
    label: "承諾交期",
    componentType: "DatePicker",
    colSpan: 4,
    validation: z.any().optional(),
  },

  {
    name: "unitPrice",
    label: "單價",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "editOnly",
    validation: z.number().min(0, "單價必須大於或等於0"),
    onChange: (value: any, context: any, setValue: any) => {
      const qty = context.values.quantity || 0;
      const spareQty = context.values.spareQuantity || 0;
      const amount = Math.round((value || 0) * (qty + spareQty));
      setValue("lineAmount", amount);
    },
    componentProps: {
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) =>
        value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },

  {
    name: "quantity",
    label: "數量",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "editOnly",
    validation: z.number().min(1, "數量必須大於或等於1"),
    onChange: (value: any, context: any, setValue: any) => {
      const price = context.values.unitPrice || 0;
      const spareQty = context.values.spareQuantity || 0;
      const amount = Math.round(price * ((value || 0) + spareQty));
      setValue("lineAmount", amount);
    },
    componentProps: {
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) =>
        value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },
  {
    name: "lineAmount",
    label: "小計",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "never",
    componentProps: {
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) =>
        value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },
  {
    name: "spareQuantity",
    label: "備品數量",
    componentType: "InputNumber",
    colSpan: 4,
    editable: "editOnly",
    validation: z.number().min(0, "備品數量必須大於或等於0"),
    onChange: (value: any, context: any, setValue: any) => {
      const price = context.values.unitPrice || 0;
      const qty = context.values.quantity || 0;
      const amount = Math.round(price * (qty + (value || 0)));
      setValue("lineAmount", amount);
    },
    componentProps: {
      formatter: (value: any) =>
        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      parser: (value: any) =>
        value!.replace(/\$\s?|(,*)/g, "") as unknown as number,
      style: { width: "100%" },
    },
  },

  {
    name: "generateWorkOrder",
    label: "產生製令",
    componentType: "Switch",
    colSpan: 6,
  },
  {
    name: "priority",
    label: "優先級",
    componentType: "DictSelect",
    componentProps: { dictKey: "ORDER_PRIORITY" },
    colSpan: 6,
  },
  {
    name: "goodsType",
    label: "商品類型",
    editable: "never",
    componentType: "DictSelect",
    componentProps: { dictKey: "PRODUCT_TYPE" },
    colSpan: 6,
    validation: z.string().optional(),
  },

  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    colSpan: 1,
    componentProps: {
      rows: 4,
    },
  },
];
