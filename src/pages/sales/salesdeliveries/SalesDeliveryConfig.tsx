import { z } from "zod";
import { Tag } from "antd";
import { SyncOutlined, CheckCircleOutlined, LockOutlined } from "@ant-design/icons";
import type { SearchFieldConfig } from "@/components/Form/types";
import type { ColumnsType } from "antd/es/table";
import type { SalesDeliveryDto } from "@/api/generated/types.gen";
import dayjs from "dayjs";
// import { DictLabel } from "@/components/Form/DictLabel";

export const getStatusTag = (row: SalesDeliveryDto) => {
  if (row.closeDate) {
    return <Tag color="processing" icon={<LockOutlined />}>已結案</Tag>;
  } else if (row.confirmDate) {
    return <Tag color="success" icon={<CheckCircleOutlined />}>已確認</Tag>;
  }
  return <Tag color="warning" icon={<SyncOutlined />}>未確認</Tag>;
};

export const searchConfig: SearchFieldConfig[] = [
  { name: "keyword", label: "關鍵字", componentType: "Input", colSpan: 2 },
  { name: "businessPartnerCode", label: "客戶代碼", componentType: "Input", colSpan: 2 },
  { name: "businessPartnerName", label: "客戶名稱", componentType: "Input", colSpan: 2 },
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
  { name: "documentNumber", label: "單據號碼", componentType: "Input", colSpan: 2, editable: "never" },
  { name: "documentDate", label: "單據日期", componentType: "DatePicker", colSpan: 2, editable: "createOnly", validation: z.any() },
  { name: "businessPartnerCode", label: "客戶代碼", componentType: "Input", colSpan: 2, editable: "createOnly", validation: z.string().min(1, "必填") },
  { name: "businessPartnerName", label: "客戶名稱", componentType: "Input", colSpan: 2, editable: "never" },
  { name: "partnerContactId", label: "聯絡人", componentType: "Custom", colSpan: 2, editable: "always", customRender: (field: any) => <span>{field.value}</span> },
  { name: "invoiceNumber", label: "發票號碼", componentType: "Input", colSpan: 2, editable: "always" },
  { name: "address", label: "送貨地址", componentType: "Input", colSpan: 4, editable: "always" },
  { name: "notes", label: "備註", componentType: "TextArea", colSpan: 4, editable: "always", componentProps: { rows: 3 } },
];
