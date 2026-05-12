



export const productionReceiptSearchConfig = (): any[] => [
  {
    name: "documentNumber",
    label: "單據號碼",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "dateRange",
    label: "單據日期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
];

import type {
  TableColumnConfig,
  FormFieldConfig,
} from "@/components/Form/types";
import { Tag } from "antd";
import dayjs from "dayjs";
import { SyncOutlined, CheckCircleOutlined, LockOutlined } from "@ant-design/icons";

export const getStatusTag = (status: string | null | undefined) => {
  if (!status) return <Tag color="default">未確認</Tag>;
  switch (status.toUpperCase()) {
    case "UNCONFIRMED":
      return <Tag color="warning" icon={<SyncOutlined />}>未確認</Tag>;
    case "CONFIRMED":
      return <Tag color="success" icon={<CheckCircleOutlined />}>已確認</Tag>;
    case "CLOSED":
      return <Tag color="processing" icon={<LockOutlined />}>已結案</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

export const mainTableColumns = (): TableColumnConfig[] => [
  { label: "單據號碼", name: "documentNumber", width: 140 },
  {
    label: "單據日期",
    name: "documentDate",
    width: 120,
    render: (val: string) => (val ? dayjs(val).format("YYYY-MM-DD") : "-"),
  },
  {
    label: "狀態",
    name: "status",
    width: 100,
    align: "center",
    render: (status: string) => getStatusTag(status),
  },
  {
    label: "負責人",
    name: "responsibleUserName",
    width: 100,
    render: (v: string) => v || "-",
  },
  {
    label: "確認日期",
    name: "confirmDate",
    width: 120,
    render: (val: string) => (val ? dayjs(val).format("YYYY-MM-DD") : "-"),
  },
  {
    label: "確認人",
    name: "confirmUserName",
    width: 100,
    render: (v: string) => v || "-",
  },
  { label: "備註", name: "notes", width: 240, ellipsis: true },
];

export const mainFormConfig = (): FormFieldConfig[] => [
  {
    name: "documentNumber",
    label: "單據號碼",
    componentType: "Input",
    editable: "never",
    colSpan: 2,
  },
  {
    name: "documentDate",
    label: "單據日期",
    componentType: "DatePicker",
    editable: "never",
    colSpan: 2,
  },
  {
    name: "status",
    label: "狀態",
    componentType: "Input",
    editable: "never",
    customRender: (_field, context) => getStatusTag(context.values.status),
    colSpan: 2,
  },
  {
    name: "responsibleUserName",
    label: "負責人員",
    componentType: "Input",
    editable: "never",
    colSpan: 2,
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    editable: "never",
    componentProps: { rows: 2 },
    colSpan: 1,
  },
];
