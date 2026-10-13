import { DictSelect } from "@/components/Form/DictSelect";
import type { TableColumnConfig } from "@/components/Form/types";
import { Tag, Space, Button, InputNumber } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { z } from "zod";
import { ContactSelectWithCreate } from "@/pages/sales/orders/components/ContactSelectWithCreate";
import { Link } from "react-router-dom";
import { TableText } from "@/components/Table/tableText";
import {
  calculatePurchaseReceiptTotalLength,
  calculatePurchaseReceiptRollArea,
  getReceiptItemDimensions,
} from "./purchaseReceiptItemCalculations";

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
        <TableText
          value={name}
          maxWidth={180}
          renderContent={text => (
            <Link
              to={`/basic/business-partners/${bpCode}`}
              style={{ color: "#1677ff", textDecoration: "underline", cursor: "pointer" }}
            >
              {text}
            </Link>
          )}
        />
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
    name: "paymentTerms",
    label: "付款條件",
    componentType: "Input",
    editable: "never",
    colSpan: 4,
  },
  {
    name: "subTotal",
    label: "小計 (未稅)",
    componentType: "InputNumber",
    editable: "never",
    colSpan: 4,
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
    colSpan: 4,
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
    colSpan: 4,
    componentProps: {
      formatter: (value: any) =>
        value != null ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "",
      parser: (value: any) => (value ? value.replace(/\$\s?|(,*)/g, "") : ""),
      style: { width: "100%" },
      controls: false,
    },
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
    label: "採購單價（卷料每卷）",
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
  { label: "到貨卷數", name: "rollCount", width: 90, align: "right" },
  { label: "採購幅寬 (mm)", name: "width", width: 120, align: "right" },
  { label: "每卷／片長", headerHint: "卷料：每卷長度(m)\n片料：片料長度(mm)", name: "length", width: 140, align: "right" },
];

export const getItemColumns = (
  disabled: boolean,
  onEdit?: (record: any) => void,
  onDelete?: (record: any) => void,
  isMold?: boolean,
): any[] => {
  let columns = [
    { title: "項次", dataIndex: "serialNumber", width: 70 },
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
              to={`/basic/molds/${val}`} 
              className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:underline font-mono cursor-pointer"
            >
              {val}
            </Link>
          );
        }
        return (
          <Link 
            to={`/basic/materials/${val}`} 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-mono cursor-pointer"
          >
            {val}
          </Link>
        );
      }
    },
    { title: isMold ? "模具名稱" : "原料名稱", dataIndex: "materialName", width: 150, ellipsis: true },
    { title: "到貨卷數", dataIndex: "rollCount", width: 100, align: "right" as const,
      render: (val: number, record: any) => (
        <span className="inline-block leading-[24px] align-middle w-full text-right">
          {record.isRoll ? `${val || 0} 卷` : "-"}
        </span>
      ) },
    {
      title: "每卷單價／單價",
      dataIndex: "unitPrice",
      width: 100,
      align: "right" as const,
      render: (val: number, record: any) => (
        <span className="inline-block leading-[24px] align-middle w-full text-right">
          {`${val != null ? Number(val.toFixed(4)).toLocaleString("zh-TW") : "0"}${record.isRoll ? " /卷" : ""}`}
        </span>
      ),
    },
    {
      title: "庫存面積／件數",
      dataIndex: "quantity",
      width: 100,
      align: "right" as const,
      render: (val: number, record: any) => (
        <span
          className="font-semibold text-[var(--ant-color-success)] inline-block leading-[24px] align-middle w-full text-right"
        >
          {val != null ? Number(val.toFixed(2)).toLocaleString("zh-TW") : "0"}
          <span className="text-xs text-gray-500 ml-1 font-normal">
            {isMold ? " PCS" : record.isRoll ? " SQM" : " PCS"}
          </span>
        </span>
      ),
    },
    {
      title: "總長度(M)",
      dataIndex: "totalLength",
      width: 100,
      align: "right" as const,
      render: (_val: number, record: any) => {
        const total = calculatePurchaseReceiptTotalLength(record);
        return (
          <span
            className="font-bold text-[var(--ant-color-primary)] inline-block leading-[24px] align-middle w-full text-right"
          >
            {record.isRoll ? `${Number(total.toFixed(2)).toLocaleString("zh-TW")} M` : "-"}
          </span>
        );
      }
    },    
    {
      title: "金額小計",
      dataIndex: "amount",
      width: 100,
      align: "right" as const,
      render: (val: number) =>
        val != null ? Number(val).toLocaleString("zh-TW") : "0",
    },
    {
      title: "採購幅寬(mm)",
      dataIndex: "width",
      width: 120,
      align: "right" as const,
      render: (_val: number, record: any) => (
        <span className="inline-block leading-[24px] align-middle w-full text-right">
          {getReceiptItemDimensions(record).width || "-"}
        </span>
      ),
    },
    {
      title: "每卷／片長",
      headerHint: "卷料：每卷長度(m)\n片料：片料長度(mm)",
      dataIndex: "length",
      width: 140,
      align: "right" as const,
      render: (_val: number, record: any) => {
        const length = getReceiptItemDimensions(record).length;
        if (record.isRoll) {
          return (
            <span className="font-semibold text-[var(--ant-color-success)] inline-block leading-[24px] align-middle w-full text-right">
              {Number(length).toLocaleString("zh-TW")} <span className="text-xs text-gray-500 font-normal">m</span>
            </span>
          );
        } else {
          return (
            <span className="font-semibold text-[var(--ant-color-warning)] inline-block leading-[24px] align-middle w-full text-right">
              {Number(length).toLocaleString("zh-TW")} <span className="text-xs text-gray-500 font-normal">mm</span>
            </span>
          );
        }
      }
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
        !["width", "length", "rollCount", "totalLength"].includes(col.dataIndex as string)
    );
  }

  if (!isMold) {
    const paymentKeys = ["unitPrice", "amount"];
    const payment = columns.filter(col => paymentKeys.includes(col.dataIndex as string));
    columns = columns.filter(col => !paymentKeys.includes(col.dataIndex as string));
    columns.splice(4, 0, ...payment);
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
      colSpan: 4,
    },
    {
      name: "materialCode",
      label: isMold ? "模具編碼" : "原料編碼",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "materialName",
      label: isMold ? "模具名稱" : "原料名稱",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "unit",
      label: "單位",
      componentType: "Input",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "targetStorageCode",
      label: "目的儲位",
      componentType: "Custom",
      editable: "never",
      customRender: (field: any) => (
        <DictSelect {...field} dictKey="STORAGE" disabled />
      ),
      colSpan: 4,
      validation: z.string().min(1, "請選擇目的儲位"),
    },
    {
      name: "unitPrice",
      label: (context: any) => context?.values?.isRoll ? "每卷單價" : "單價",
      componentType: "InputNumber",
      editable: "always",
      colSpan: 4,
      componentProps: {
        min: 0,
        precision: 4,
        controls: false,
        allowClear: false,
      },
      validation: z.number().min(0, "單價不能小於 0"),
    },
    {
      name: "rollCount",
      label: "到貨卷數",
      componentType: "InputNumber",
      editable: "always",
      colSpan: 4,
      componentProps: {
        min: 1,
        precision: 0,
        controls: false,
        allowClear: false,
      },
      validation: z.number().min(1, "到貨卷數必須大於等於 1"),
    },
    {
      name: "width",
      label: "採購幅寬 (mm)",
      componentType: "InputNumber",
      editable: "always",
      colSpan: 4,
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
      label: (context: any) => context?.values?.isRoll ? "每卷長度(m)" : "片料長度(mm)",
      componentType: "InputNumber",
      editable: "always",
      colSpan: 4,
      componentProps: (context: any) => ({
        min: 1,
        precision: 4,
        controls: false,
        allowClear: false,
        placeholder: context?.values?.isRoll ? "請輸入每卷長度(m)" : "請輸入片料長度(mm)",
      }),
      validation: z.number().min(1, "每卷長度(m)／片料長度(mm)必須大於 0"),
      dynamicValidation: (context: any) => {
        const label = context?.values?.isRoll ? "每卷長度(m)" : "片料長度(mm)";
        return z.number({ required_error: `請輸入${label}`, invalid_type_error: `${label}必須為數值` }).min(1, `${label}必須大於 0`);
      },
    },
    {
      name: "totalLength",
      label: "總長度 (M)",
      componentType: "Custom",
      editable: "always",
      colSpan: 4,
      customRender: (_props: any, context: any) => {
        const isRoll = context?.values?.isRoll ?? true;
        const total = calculatePurchaseReceiptTotalLength({
          isRoll,
          rollCount: context?.values?.rollCount,
          length: context?.values?.length,
        });
        return (
          <InputNumber
            id="totalLength"
            value={total}
            disabled
            style={{ width: "100%", fontWeight: "bold", color: "var(--ant-color-primary)" }}
            formatter={(val) => val != null ? `${val} M` : ""}
          />
        );
      }
    },
    {
      name: "quantity",
      label: "庫存面積 (SQM)",
      componentType: "Custom",
      editable: "always",
      colSpan: 4,
      hidden: (context: any) => !context?.values?.isRoll,
      customRender: (_props: any, context: any) => (
        <InputNumber id="quantity" disabled value={calculatePurchaseReceiptRollArea(context.values)}
          formatter={(val) => `${val} SQM`} className="w-full" />
      ),
    },
    {
      name: "amount",
      label: "已存貨款（按卷／超收封頂，儲存後重算）",
      componentType: "InputNumber",
      editable: "never",
      colSpan: 4,
    },
    {
      name: "costPerSqmPreview",
      label: "面積成本參考（已存貨款 ÷ SQM）",
      componentType: "Custom",
      editable: "always",
      colSpan: 4,
      hidden: (context: any) => !context?.values?.isRoll,
      customRender: (_props: any, context: any) => {
        const area = calculatePurchaseReceiptRollArea(context.values);
        return <InputNumber id="costPerSqmPreview" disabled value={area > 0 ? (context.values.amount || 0) / area : 0}
          precision={4} className="w-full" />;
      },
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
        col.name !== "length" &&
        col.name !== "rollCount" &&
        col.name !== "totalLength" &&
        col.name !== "quantity" &&
        col.name !== "costPerSqmPreview"
    );
  }

  return configs.map(config => ({
    ...config,
    group: ["rollCount", "unitPrice", "amount"].includes(config.name)
      ? "採購貨款（卷數 × 每卷單價，超收封頂）"
      : ["width", "length", "totalLength", "quantity", "costPerSqmPreview"].includes(config.name)
        ? "庫存換算（長度／幅寬／面積，非採購計價）"
        : "基本資料",
  }));
};
