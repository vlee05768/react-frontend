import { Space, Button, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, PlusCircleOutlined } from "@ant-design/icons";
import { z } from "zod";
import { Tag } from "antd";
import { SyncOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { SearchFieldConfig, TableColumnConfig } from "@/components/Form/types";
import type { ColumnsType } from "antd/es/table";
import type { SalesDeliveryDto, SalesDeliveryItemDto } from "@/api/generated/types.gen";
import dayjs from "dayjs";
import { ContactSelectWithCreate } from "../orders/components/ContactSelectWithCreate";
import { DictTag } from "@/components/Form/DictTag";
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

export const getColumns = (): TableColumnConfig<SalesDeliveryDto>[] => [
  {
    label: "單據號碼",
    name: "documentNumber",
    width: 150,
    fixed: "left",
    sortable: { multiple: 1 },
  },
  { label: "單據日期", name: "documentDate", width: 120, sortable: { multiple: 2 }, render: (val) => (val ? dayjs(val).format("YYYY-MM-DD") : "-") },
  { label: "客戶代碼", name: "businessPartnerCode", width: 100 },
  { label: "客戶名稱", name: "businessPartnerName", width: 180, ellipsis: true },
  { label: "發票號碼", name: "invoiceNumber", width: 120, sortable: { multiple: 3 } },
  { label: "業務員", name: "responsibleUserName", width: 100 },
  { label: "小計", name: "subTotal", width: 100, align: "right", render: (val) => val != null ? Number(val).toLocaleString() : "-" },
  { label: "稅額", name: "taxAmount", width: 100, align: "right", render: (val) => val != null ? Number(val).toLocaleString() : "-" },
  { label: "總金額", name: "totalAmount", width: 120, align: "right", render: (val) => <span className="font-semibold">{val != null ? Number(val).toLocaleString() : "-"}</span> },
  { label: "狀態", name: "status", width: 100, render: (_, row) => getStatusTag(row) },
  { label: "確認人員", name: "confirmUserName", width: 100 },
  { label: "確認日期", name: "confirmDate", width: 120, render: (val) => (val ? dayjs(val).format("YYYY-MM-DD") : "-") },
  { label: "備註", name: "notes", ellipsis: true, width: 200 },
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
  onAddSpare?: (record: SalesDeliveryItemDto) => void,
  items?: SalesDeliveryItemDto[],
): ColumnsType<SalesDeliveryItemDto> => [
  {
    title: "操作",
    key: "action",
    width: 120,
    align: "left",
    fixed: 'right' as const,
    render: (_: any, record: SalesDeliveryItemDto) => {
      if (isViewMode) return null;
      const isProduct = record.inventoryType === "P";
      const isSpare = record.subType === "SP" || record.transactionType === "SP";
      const hasSpare = Array.isArray(items) && items.some(item => 
        item.inventoryCode === record.inventoryCode && 
        item.referenceNumber === record.referenceNumber && 
        (item.subType === 'SP' || item.transactionType === 'SP')
      );
      const showAddSpare = isProduct && !isSpare && !hasSpare && onAddSpare;
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
          {showAddSpare && (
            <Tooltip title="新增備品">
              <Button
                type="text"
                icon={<PlusCircleOutlined style={{ fontSize: "16px", color: "var(--ant-color-primary)" }} />}
                onClick={() => onAddSpare(record)}
              />
            </Tooltip>
          )}
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
    render: (val: any, record: any, index: number) => {
      const serial = record?.serialNumber || record?.SerialNumber || val;
      if (serial !== undefined && serial !== null && serial !== '') return serial;
      const line = record?.lineNumber || record?.LineNumber;
      if (line !== undefined && line !== null && line !== '') return line;
      return index + 1;
    }
  },
  {
    title: "來源單號",
    dataIndex: "referenceNumber",
    width: 160,
    align: "left",
    ellipsis: true,
    render: (val, record: any) => {
      let tooltipContent: React.ReactNode = null;
      let displayText = val || "-";
      let isMerged = false;

      if (record.extraData) {
        try {
          const allocations = Array.isArray(record.extraData) 
            ? record.extraData 
            : (typeof record.extraData === 'object' && record.extraData !== null)
              ? (record.extraData as any).rootElement 
                ? JSON.parse(JSON.stringify(record.extraData)) 
                : record.extraData
              : JSON.parse(typeof record.extraData === 'string' ? record.extraData : '{}');
          
          const list = Array.isArray(allocations) ? allocations : (allocations?.data || []);
          if (Array.isArray(list) && list.length > 0) {
            const sourceItems = list.map((a, idx) => {
              const num = a.OrderItemLineNumber || a.orderItemLineNumber || '未知';
              const q = a.Quantity ?? a.quantity ?? 0;
              return (
                <div key={idx} style={{ whiteSpace: 'nowrap', lineHeight: '1.6' }}>
                  {num} ({Number(q).toLocaleString()})
                </div>
              );
            });
            tooltipContent = <div style={{ padding: '2px 0' }}>{sourceItems}</div>;

            if (list.length > 1) {
              isMerged = true;
              displayText = `[合併 ${list.length} 筆訂單]`;
            } else {
              displayText = list[0].OrderItemLineNumber || list[0].orderItemLineNumber || val || "-";
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (!tooltipContent && val) {
        tooltipContent = <div style={{ padding: '2px 0' }}>{val}</div>;
      }

      if (!tooltipContent) {
        return <span>-</span>;
      }

      return (
        <Tooltip title={tooltipContent} placement="topLeft">
          {isMerged ? (
            <span style={{ color: 'var(--ant-color-primary)', fontWeight: '500', textDecoration: 'underline decoration-dotted', cursor: 'pointer' }}>
              {displayText}
            </span>
          ) : (
            <span style={{ cursor: 'pointer' }}>{displayText}</span>
          )}
        </Tooltip>
      );
    }
  },
  {
    title: "類型",
    dataIndex: "inventoryType",
    width: 80,
    align: "center",
    ellipsis: true,
    render: (val: string) => <DictTag dictKey="PRODUCT_TYPE" value={val} />,
  },
  {
    title: "銷售類別",
    dataIndex: "subType",
    width: 100,
    align: "center",
    ellipsis: true,
    render: (val: string) => {
      if (val === 'SP') return <Tag color="success" className="m-0">備品</Tag>;
      if (val === 'OF') return <Tag color="purple" className="m-0">其他費用</Tag>;
      return <Tag color="blue" className="m-0">一般銷售</Tag>;
    }
  },
  {
    title: "料號",
    dataIndex: "inventoryCode",
    width: 140,
    align: "left",
    ellipsis: true,
    render: (val: string, record: any) => {
      if (!val) return "-";
      let color = "default";
      if (record.inventoryType === "P") color = "orange";
      else if (record.inventoryType === "M") color = "cyan";
      else if (record.inventoryType === "S") color = "purple";
      return <Tag color={color} className="m-0">{val}</Tag>;
    },
  },
  {
    title: "品名",
    dataIndex: "inventoryName",
    width: 220,
    ellipsis: true,
  },
  {
    title: "單位",
    dataIndex: "unit",
    width: 80,
    align: "center",
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
    name: "subType",
    label: "銷售類別",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "一般銷售", value: "OD" },
        { label: "備品", value: "SP" },
        { label: "其他費用", value: "OF" }
      ],
      disabled: true,
      style: { width: "100%" }
    },
    colSpan: 4,
    editable: "never"
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
