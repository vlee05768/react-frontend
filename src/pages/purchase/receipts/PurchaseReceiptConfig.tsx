import { DictSelect } from "@/components/Form/DictSelect";
import type { TableColumnConfig } from "@/components/Form/types";
import { Tag, Space, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { DictTag } from "@/components/Form/DictTag";
import dayjs from "dayjs";
import { z } from "zod";
import { ContactSelectWithCreate } from "@/pages/sales/orders/components/ContactSelectWithCreate";
import { Link } from "react-router-dom";
import { EllipsisText } from "@/components/Table/EllipsisText";

export const purchaseReceiptSearchConfig = (): any[] => [
  {
    name: "documentNumber",
    label: "進貨單號",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "purchaseOrderNumber",
    label: "採購單號",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "dateRange",
    label: "進貨日期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
  {
    name: "status",
    label: "狀態",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "待確認", value: "Unconfirmed" },
        { label: "已確認", value: "Confirmed" },
        { label: "已結案", value: "Closed" },
      ],
      allowClear: true,
    },
    colSpan: 2,
  },
];

export const getStatusTagProps = (
  status?: string | null,
  confirmDate?: string | null,
  closeDate?: string | null,
) => {
  if (closeDate) return { color: "default", text: "已結案" };
  if (confirmDate) return { color: "success", text: "已確認" };

  if (!status) return { color: "warning", text: "待確認" };
  switch (status.toUpperCase()) {
    case "CONFIRMED":
      return { color: "success", text: "已確認" };
    case "CLOSED":
      return { color: "default", text: "已結案" };
    case "UNCONFIRMED":
    default:
      return { color: "warning", text: "待確認" };
  }
};

export const getStatusTag = (
  status?: string | null,
  confirmDate?: string | null,
  closeDate?: string | null,
) => {
  const props = getStatusTagProps(status, confirmDate, closeDate);
  return <Tag color={props.color}>{props.text}</Tag>;
};

export const mainTableColumns = (): TableColumnConfig[] => [
  {
    label: "進貨單號",
    name: "documentNumber",
    sortable: { multiple: 1 },
    width: 140,
  },
  {
    label: "進貨日期",
    name: "documentDate",
    sortable: { multiple: 2 },
    width: 110,
    render: (val: string) => (val ? dayjs(val).format("YYYY-MM-DD") : "-"),
  },
  {
    label: "單據狀態",
    name: "status",
    sortable: { multiple: 3 },
    width: 100,
    align: "center",
    render: (status: string, record: any) =>
      getStatusTag(status, record?.confirmDate, record?.closeDate),
  },
  { label: "關聯採購單", name: "purchaseOrderNumber", width: 140 },
  {
    label: "供應商",
    name: "businessPartnerName",
    width: 200,
    render: (val: string, record: any) => {
      const displayCode = record.partnerRoleCode || record.businessPartnerCode;
      const bpCode = record.businessPartnerCode;
      const name =
        val && displayCode
          ? `[${displayCode}] ${val}`
          : val || displayCode || "-";
      if (!bpCode) return "-";
      return (
        <Link
          to={`/basic/business-partners/${bpCode}`}
          style={{
            color: "#1677ff",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          <EllipsisText text={name} maxWidth={180} />
        </Link>
      );
    },
  },
  {
    label: "收料人員",
    name: "responsibleUserName",
    width: 100,
    render: (v: string) => v || "-",
  },
  {
    label: "總金額",
    name: "totalAmount",
    width: 110,
    align: "right",
    render: (v: number) =>
      v != null ? Number(v.toFixed(2)).toLocaleString() : "0",
  },
  { label: "備註", name: "notes", width: 200, ellipsis: true },
];

export const mainFormConfig = (): any[] => [
  {
    name: "documentNumber",
    label: "進貨單號",
    componentType: "Input",
    editable: "never",
    autoGenerate: true,
    colSpan: 4,
  },
  {
    name: "documentDate",
    label: "進貨日期",
    componentType: "DatePicker",
    editable: "always",
    colSpan: 4,
  },
  {
    name: "businessPartnerCode",
    label: "供應商",
    componentType: "AsyncSelect",
    componentProps: (context: any) => {
      const code =
        context?.values?.partnerRoleCode ||
        context?.values?.businessPartnerCode ||
        "";
      const isMold = code.startsWith("TS") || context?.values?.subType === "Mold";
      return { configKey: isMold ? "TOOLING_SUPPLIER" : "MATERIAL_SUPPLIER" };
    },
    editable: "createOnly",
    colSpan: 2,
    validation: z.string().min(1, "請選擇供應商"),
    onChange: (_value: any, _context: any, setValue: any, ...args: any[]) => {
      if (!_value) {
        setValue("businessPartnerName", undefined);
        setValue("partnerContactId", undefined);
        setValue("contactPhone", undefined);
        setValue("paymentTerms", undefined);
      } else {
        const option = args[1];
        if (option && option.originalData) {
          const bp = option.originalData;
          setValue("businessPartnerName", bp.name || undefined);
          setValue("paymentTerms", bp.paymentTerms || undefined);
          setValue("partnerContactId", undefined);
          setValue("contactPhone", undefined);
        }
      }
    },
  },

  {
    name: "responsibleEmployeeCode",
    label: "收料人員",
    componentType: "Custom",
    editable: "always",
    customRender: (field: any) => <DictSelect {...field} dictKey="EMPLOYEE" />,
    colSpan: 4,
  },
  {
    name: "invoiceNumber",
    label: "發票號碼",
    componentType: "Input",
    editable: "always",
    colSpan: 4,
  },

  {
    name: "partnerContactId",
    label: "廠商聯絡人",
    componentType: "Custom",
    customRender: (field: any, context: any, setValue: any) => (
      <ContactSelectWithCreate
        value={field.value}
        onChange={(val) => {
          field.onChange(val);
          if (!val) {
            setValue("contactPhone", undefined);
          }
        }}
        onContactChange={(contact) => {
          if (contact) {
            const phoneVal = contact.phone
              ? contact.phone +
                (contact.phoneExtension ? ` #${contact.phoneExtension}` : "")
              : contact.mobilePhone || undefined;
            setValue("contactPhone", phoneVal);
          }
        }}
        disabled={field.disabled}
        businessPartnerCode={context.values.businessPartnerCode}
        contactType="sales"
      />
    ),
    colSpan: 4,
  },
  {
    name: "contactPhone",
    label: "聯絡電話",
    componentType: "Input",
    editable: "never",
    colSpan: 4,
  },

  {
    name: "subTotal",
    label: "小計 (未稅)",
    componentType: "InputNumber",
    editable: "never",
    colSpan: 3,
    componentProps: {
      formatter: (value: any) =>
        value != null ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "",
      parser: (value: any) => (value ? value.replace(/\$\s?|(,*)/g, "") : ""),
      style: { width: "100%" },
      controls: false,
    },
  },
  {
    name: "taxAmount",
    label: "稅額",
    componentType: "InputNumber",
    editable: "never",
    colSpan: 3,
    componentProps: {
      formatter: (value: any) =>
        value != null ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "",
      parser: (value: any) => (value ? value.replace(/\$\s?|(,*)/g, "") : ""),
      style: { width: "100%" },
      controls: false,
    },
  },
  {
    name: "totalAmount",
    label: "含稅小計 (總金額)",
    componentType: "InputNumber",
    editable: "never",
    colSpan: 3,
    componentProps: {
      formatter: (value: any) =>
        value != null ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "",
      parser: (value: any) => (value ? value.replace(/\$\s?|(,*)/g, "") : ""),
      style: { width: "100%" },
      controls: false,
    },
  },
  {
    name: "paymentTerms",
    label: "付款條件",
    componentType: "Input",
    editable: "never",
    colSpan: 3,
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

export const itemTableColumns = (): TableColumnConfig[] => [
  { label: "項次", name: "lineNumber", width: 80 },
  { label: "採購明細編號", name: "referenceNumber", width: 150 },
  { label: "原料編碼", name: "materialCode", width: 140 },
  { label: "原料名稱", name: "materialName", width: 180 },
  {
    label: "進貨量",
    name: "quantity",
    width: 110,
    align: "right",
    render: (val: number) => (
      <span style={{ color: "var(--ant-color-success)", fontWeight: 600 }}>
        {val?.toLocaleString() || "0"}
      </span>
    ),
  },
  { label: "單位", name: "unit", width: 80, align: "center" },
  {
    label: "單價",
    name: "unitPrice",
    width: 100,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "0",
  },
  {
    label: "金額",
    name: "amount",
    width: 110,
    align: "right",
    render: (val: number) =>
      val != null ? Number(val.toFixed(2)).toLocaleString() : "0",
  },
  {
    label: "目的儲位",
    name: "targetStorageCode",
    width: 120,
    render: (v: string) => v || "TW-QC-GEN",
  },
  { label: "拆卷數", name: "rollCount", width: 90, align: "right" },
  { label: "規格寬度 (mm)", name: "width", width: 120, align: "right" },
  { label: "規格長度 (M)", name: "length", width: 120, align: "right" },
  { label: "到貨廠牌", name: "brand", width: 120 },
  { label: "到貨型號", name: "modelNo", width: 120 },
];

export const getItemColumns = (
  disabled: boolean,
  onEdit?: (record: any) => void,
  onDelete?: (record: any) => void,
  isMold?: boolean,
): any[] => {
  let columns = [
    { title: "項次", dataIndex: "serialNumber", width: 70 },
    { title: "採購明細編號", dataIndex: "referenceNumber", width: 140, ellipsis: true },
    { 
      title: isMold ? "模具編碼" : "原料編碼", 
      dataIndex: "materialCode", 
      width: 130, 
      ellipsis: true,
      render: (val: string) => {
        if (!val) return "-";
        if (isMold) {
          return (
            <Link 
              to={`/production-quality/molds/${val}`} 
              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:underline font-mono cursor-pointer"
            >
              {val}
            </Link>
          );
        }
        return (
          <Link 
            to={`/warehouse/materials/${val}`} 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-mono cursor-pointer"
          >
            {val}
          </Link>
        );
      }
    },
    { title: isMold ? "模具名稱" : "原料名稱", dataIndex: "materialName", width: 150, ellipsis: true },
    {
      title: "單價",
      dataIndex: "unitPrice",
      width: 100,
      align: "right" as const,
      render: (val: number) =>
        val != null ? Number(val.toFixed(4)).toLocaleString("zh-TW") : "0",
    },
    { title: "單位", dataIndex: "unit", width: 60, align: "center" as const },
    {
      title: "進貨量",
      dataIndex: "quantity",
      width: 100,
      align: "right" as const,
      render: (val: number) => (
        <span className="font-semibold text-[var(--ant-color-success)]">
          {val != null ? Number(val.toFixed(4)).toLocaleString("zh-TW") : "0"}
        </span>
      ),
    },
    {
      title: "金額",
      dataIndex: "amount",
      width: 100,
      align: "right" as const,
      render: (val: number) =>
        val != null ? Number(val).toLocaleString("zh-TW") : "0",
    },
    {
      title: "目的儲位",
      dataIndex: "targetStorageCode",
      width: 120,
      align: "center" as const,
      render: (v: string) => (v ? <DictTag dictKey="STORAGE" value={v} /> : "-"),
    },
    {
      title: "卷/包",
      dataIndex: "rollCount",
      width: 60,
      align: "right" as const,
    },
    {
      title: "寬度(mm)",
      dataIndex: ["extraData", "width"],
      width: 100,
      align: "right" as const,
    },
    {
      title: "長度",
      dataIndex: ["extraData", "length"],
      width: 100,
      align: "right" as const,
    },
    { title: "備註", dataIndex: "notes", width: 150, ellipsis: true },
    ...(!disabled
      ? [
          {
            title: "操作",
            key: "actions",
            fixed: "right" as const,
            width: 100,
            align: "center" as const,
            render: (_: any, record: any) => (
              <Space size={4}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit?.(record)}
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete?.(record)}
                />
              </Space>
            ),
          },
        ]
      : []),
  ];

  if (isMold) {
    columns = columns.filter(
      col =>
        col.title !== "目的儲位" &&
        col.title !== "規格寬度 (mm)" &&
        col.title !== "規格長度 (M)"
    );
  }

  return columns;
};

export const getItemFormConfig = (isMold?: boolean): any[] => {
  let configs = [
    {
      name: "lineNumber",
      label: "項次",
      componentType: "Input",
      editable: "never",
      colSpan: 3,
    },
    {
      name: "materialCode",
      label: isMold ? "模具編碼" : "原料編碼",
      componentType: "Input",
      editable: "never",
      colSpan: 3,
    },
    {
      name: "materialName",
      label: isMold ? "模具名稱" : "原料名稱",
      componentType: "Input",
      editable: "never",
      colSpan: 3,
    },
    {
      name: "unit",
      label: "單位",
      componentType: "Input",
      editable: "never",
      colSpan: 3,
    },
    {
      name: "targetStorageCode",
      label: "目的儲位",
      componentType: "Custom",
      editable: "never",
      customRender: (field: any) => (
        <DictSelect {...field} dictKey="STORAGE" disabled />
      ),
      colSpan: 3,
      validation: z.string().min(1, "請選擇目的儲位"),
    },
    {
      name: "rollCount",
      label: "拆卷數",
      componentType: "InputNumber",
      editable: "always",
      colSpan: 3,
      componentProps: {
        min: 1,
        precision: 0,
        controls: false,
        allowClear: false,
      },
      validation: z.number().min(1, "拆卷數必須大於等於 1"),
    },
    {
      name: "width",
      label: "規格寬度 (mm)",
      componentType: "InputNumber",
      editable: "always",
      colSpan: 3,
      componentProps: {
        min: 1,
        precision: 4,
        controls: false,
        allowClear: false,
      },
      validation: z.number().min(1, "寬度必須大於 0"),
    },
    {
      name: "length",
      label: "規格長度 (M)",
      componentType: "InputNumber",
      editable: "always",
      colSpan: 3,
      componentProps: {
        min: 1,
        precision: 4,
        controls: false,
        allowClear: false,
      },
      validation: z.number().min(1, "長度必須大於 0"),
    },
    {
      name: "unitPrice",
      label: "單價",
      componentType: "InputNumber",
      editable: "always",
      colSpan: 3,
      componentProps: {
        min: 0,
        precision: 4,
        controls: false,
        allowClear: false,
      },
      validation: z.number().min(0, "單價不能小於 0"),
    },
    {
      name: "brand",
      label: "到貨廠牌",
      componentType: "Input",
      editable: "always",
      colSpan: 3,
    },
    {
      name: "modelNo",
      label: "到貨型號",
      componentType: "Input",
      editable: "always",
      colSpan: 3,
    },
    {
      name: "notes",
      label: "備註",
      componentType: "TextArea",
      editable: "always",
      componentProps: { rows: 2 },
      colSpan: 1,
    },
  ];

  if (isMold) {
    configs = configs.filter(
      col =>
        col.name !== "targetStorageCode" &&
        col.name !== "width" &&
        col.name !== "length"
    );
  }

  return configs;
};
