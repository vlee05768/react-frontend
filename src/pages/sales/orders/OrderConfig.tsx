import { z } from "zod";
import { Button, Space, Tag } from "antd";
import { EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import type { SearchFieldConfig, TableColumnConfig } from "@/components/Form/types";
import type { ColumnsType } from "antd/es/table";
import type { OrderDto, OrderItemDto } from "@/api/generated/types.gen";
import dayjs from "dayjs";
import { ContactSelectWithCreate } from "./components/ContactSelectWithCreate";
import { DictLabel } from "@/components/Form/DictLabel";
import { DictTag } from "@/components/Form/DictTag";

export const getStatusTag = (status: string | null | undefined) => {
  return <DictTag dictKey="ORDER_STATUS" value={status || 'Draft'} />;
};

export const searchConfig: SearchFieldConfig[] = [
  {
    name: "orderNumber",
    label: "訂單號碼",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "customerCodeOrName",
    label: "客戶",
    componentType: "AsyncSelect",
    componentProps: { configKey: "CUSTOMER" },
    colSpan: 2,
  },
  {
    name: "status",
    label: "狀態",
    componentType: "DictSelect",
    componentProps: { dictKey: "ORDER_STATUS" },
    colSpan: 2,
  },
  {
    name: "orderDate",
    label: "訂單日期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
  {
    name: "requestedDeliveryDate",
    label: "要求交期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
  {
    name: "promisedDeliveryDate",
    label: "承諾交期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
  {
    name: "unprocessedOrders",
    label: "未處理完單據",
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
    name: "others",
    label: "其他條件",
    componentType: "Input",
    colSpan: 2,
  },
];

export const getColumns = (): TableColumnConfig<OrderDto>[] => [
  {
    label: "訂單編號",
    name: "orderNumber",
    width: 150,
    sortable: { multiple: 1 },
  },
  {
    label: "訂單日期",
    name: "orderDate",
    width: 120,
    sortable: { multiple: 2 },
    render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD") : "-"),
  },
  {
    label: "訂單狀態",
    name: "status",
    width: 100,
    sortable: { multiple: 3 },
    render: (status: string) => getStatusTag(status),
  },

  {
    label: "客戶代碼",
    name: "businessPartnerCode",
    width: 120,
  },
  {
    label: "客戶名稱",
    name: "businessPartnerName",
    width: 180,
    ellipsis: true,
  },
  {
    label: "小計",
    name: "subTotal",
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
    label: "交貨日期",
    name: "requestedDeliveryDate",
    width: 120,
    render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD") : "-"),
  },
  {
    label: "承諾交貨日期",
    name: "promisedDeliveryDate",
    width: 140,
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
    name: "orderNumber",
    label: "訂單號碼",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
    componentProps: {
      placeholder: "【系統自動編碼】"
    }
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
      // 若清空客戶，一併清空相關欄位
      if (!_value) {
        setValue("partnerContactId", undefined);
        setValue("customerPoNumber", undefined);
        setValue("paymentTerms", undefined);
        setValue("shippingAddress", undefined);
        // Note: 電話和傳真好像沒有在 Orders 中?
      } else {
        setValue("partnerContactId", undefined);
        const option = args[1];
        if (option && option.originalData) {
          const bp = option.originalData;
          if (bp.address) setValue("shippingAddress", bp.address);
          if (bp.paymentTerms) setValue("paymentTerms", bp.paymentTerms);
        }
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
    fixed: 'right' as const,
    render: (_: any, record: OrderItemDto) => {
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
    dataIndex: "serialNumber",
    width: 60,
    align: "left",
    ellipsis: true,
    render: (val: any, record: any, index: number) => {
      const serial = record?.serialNumber || record?.SerialNumber || val;
      if (serial !== undefined && serial !== null && serial !== '') return serial;
      const line = record?.lineNumber || record?.LineNumber;
      if (line !== undefined && line !== null && line !== '') return line;
      return index + 1;
    }
  },
  {
    title: "類型",
    dataIndex: "goodsType",
    width: 80,
    align: "center",
    ellipsis: true,
    render: (val: string) => <DictTag dictKey="PRODUCT_TYPE" value={val} />,
  },
  {
    title: "商品編碼",
    dataIndex: "goodsCode",
    width: 160,
    align: "left",
    ellipsis: true,
    render: (val: string, record: any) => {
      if (!val) return "-";
      let color = "default";
      if (record.goodsType === "P") color = "orange";
      else if (record.goodsType === "M") color = "cyan";
      else if (record.goodsType === "S") color = "purple";
      return <Tag color={color} className="m-0">{val}</Tag>;
    },
  },
  { title: "商品名稱", dataIndex: "goodsName", width: 220, ellipsis: true },
  {
    title: "單位",
    dataIndex: "unit",
    width: 80,
    align: "center",
    ellipsis: true,
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
{
    title: "優先級",
    dataIndex: "priority",
    width: 80,
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
    title: "數量",
    dataIndex: "quantity",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "-",
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
    title: "小計",
    dataIndex: "lineAmount",
    width: 120,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? <span style={{ color: 'var(--ant-color-primary)' }}>{Number(val.toFixed(2)).toLocaleString()}</span> : "-",
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
      val != null ? <span style={{ color: 'var(--ant-color-success)' }}>{Number(val.toFixed(2)).toLocaleString()}</span> : "-",
  },
  {
    title: "取消數量",
    dataIndex: "quantityCancelled",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? <span style={{ color: 'var(--ant-color-error)' }}>{Number(val.toFixed(2)).toLocaleString()}</span> : "-",
  },
  {
    title: "剩餘數量",
    dataIndex: "quantityRemaining",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) =>
      val != null ? <span style={{ color: 'var(--ant-color-warning)' }}>{Number(val.toFixed(2)).toLocaleString()}</span> : "-",
  },
  { title: "備註", dataIndex: "notes", width: 160, ellipsis: true },
];

export const getItemFormConfig = (isCreatingMaterial = false): any[] => [
  {
    name: "goodsCode",
    label: "商品編碼",
    editable: isCreatingMaterial ? "createOnly" : "never",
    componentType: "AsyncSelect",
    componentProps: (context: any) => {
      const isM = context?.values?.goodsType === "M";
      return { configKey: isM ? "MATERIAL" : "PRODUCT" };
    },
    colSpan: 4,
    validation: z.string().min(1, "商品編碼為必填"),
    onChange: (_value: any, context: any, setValue: any, ...args: any[]) => {
      const option = args[1];
      if (option && option.originalData) {
        setValue("goodsName", option.originalData.name);
        const isM = context?.values?.goodsType === "M";
        if (isM) {
          setValue("spareQuantity", 0);
          setValue("unit", option.originalData.primaryUoM || "");
        } else {
          setValue("unit", option.originalData.unit || "");
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
    label: (context: any) => {
      const isM = context?.values?.goodsType === "M";
      return isM ? "單價(平方米)" : "單價";
    },
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
    name: "unit",
    label: "單位",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
    validation: z.string().optional().nullable(),
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
    editable: (context: any) => {
      return context?.values?.goodsType !== "M";
    },
    validation: z.number().min(0, "備品數量必須大於或等於0").optional().nullable(),
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
    editable: (context: any) => {
      return context?.values?.goodsType !== "M";
    },
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
    componentType: "Custom",
    colSpan: 6,
    validation: z.string().optional(),
    customRender: (props: any) => {
      return (
        <div className="flex items-center h-[32px]">
          <DictTag dictKey="PRODUCT_TYPE" value={props.value} />
        </div>
      );
    }
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
