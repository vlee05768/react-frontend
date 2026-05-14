import { Tooltip, Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import type { SearchFieldConfig } from "@/components/Form/types";
import type { ColumnsType } from "antd/es/table";
import type { SalesDeliveryGroupByCustomerDto } from "@/api/generated/types.gen";

export const searchConfig: SearchFieldConfig[] = [
  { 
    name: "dateRange", 
    label: "查詢期間", 
    componentType: "DateRangePicker", 
    colSpan: 4,
    componentProps: {
        allowClear: false
    }
  },
  { 
    name: "customerCode", 
    label: "客戶", 
    componentType: "AsyncSelect",
    componentProps: { configKey: "CUSTOMER" }, 
    colSpan: 2 
  },
];

export const getColumns = (
  onPrint: (row: SalesDeliveryGroupByCustomerDto) => void,
  isDownloading: boolean
): ColumnsType<SalesDeliveryGroupByCustomerDto> => [
  {
    title: "操作",
    key: "action",
    width: 80,
    align: "center",
    fixed: "left",
    render: (_, record) => (
      <Tooltip title="列印對帳單">
        <Button 
          type="text" 
          icon={<PrinterOutlined />} 
          style={{ color: '#2080f0' }}
          loading={isDownloading}
          onClick={() => onPrint(record)} 
        />
      </Tooltip>
    ),
  },
  { title: "客戶代碼", dataIndex: "businessPartnerCode", width: 120, ellipsis: true },
  { title: "客戶名稱", dataIndex: "businessPartnerName", width: 180, ellipsis: true },
  { title: "統一編號", dataIndex: "taxId", width: 120, ellipsis: true },
  { title: "電話", dataIndex: "phone", width: 140, ellipsis: true },
  { title: "傳真", dataIndex: "faxNumber", width: 140, ellipsis: true },
  { title: "地址", dataIndex: "address", width: 200, ellipsis: true },
  { title: "單據數量", dataIndex: "documentCount", width: 100, align: "right", render: (val) => val != null ? Number(val).toLocaleString() : "0" },
  { title: "銷貨小計總額", dataIndex: "totalSubTotal", width: 140, align: "right", render: (val) => val != null ? Number(val).toLocaleString() : "0" },
  { title: "稅額總額", dataIndex: "totalTaxAmount", width: 120, align: "right", render: (val) => val != null ? Number(val).toLocaleString() : "0" },
  { title: "含稅總額", dataIndex: "totalAmount", width: 140, align: "right", render: (val) => val != null ? Number(val).toLocaleString() : "0" },
];
