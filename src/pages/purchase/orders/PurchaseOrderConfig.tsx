import { z } from "zod";
import { Tag, Space, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { SearchFieldConfig, TableColumnConfig } from "@/components/Form/types";
import type { ColumnsType } from "antd/es/table";
import type { PurchaseOrderDto, PurchaseOrderItemDto } from "@/api/generated/types.gen";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { EllipsisText } from "@/components/Table/EllipsisText";

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
    name: "purchaseOrderType",
    label: "採購類別",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "原料採購 (Material)", value: "Material" },
        { label: "模具採購 (Mold)", value: "Mold" },
      ],
      allowClear: true,
    },
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
    label: "採購類別",
    name: "purchaseOrderType",
    width: 110,
    render: (val: string) => val === "Mold" ? <Tag color="purple">模具採購</Tag> : <Tag color="blue">原料採購</Tag>,
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
    name: "purchaseOrderType",
    label: "採購類別",
    componentType: "Select",
    editable: "createOnly",
    colSpan: 4,
    componentProps: {
      options: [
        { label: "原料採購 (Material)", value: "Material" },
        { label: "模具採購 (Mold)", value: "Mold" }
      ]
    },
    validation: z.string().min(1, "採購類別為必填"),
    onChange: (_value: any, _context: any, setValue: any) => {
      setValue("businessPartnerCode", undefined);
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
    componentProps: (context: any) => {
      const isMold = context?.values?.purchaseOrderType === "Mold";
      return { configKey: isMold ? "TOOLING_SUPPLIER" : "MATERIAL_SUPPLIER" };
    },
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
    colSpan: 4,
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
    colSpan: 4,
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
    colSpan: 4,
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
  purchaseOrderType?: string,
): ColumnsType<PurchaseOrderItemDto> => {
  const cols: ColumnsType<PurchaseOrderItemDto> = [
  {
    title: "操作",
    key: "action",
    width: 80,
    align: "center",
    fixed: 'left' as const,
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
    title: "採購類別",
    dataIndex: "purchaseOrderType",
    width: 100,
    render: (val: string) => val === "Mold" ? <Tag color="purple">模具</Tag> : <Tag color="blue">原料</Tag>,
  },
  {
    title: "商品代碼",
    dataIndex: "goodsCode",
    width: 150,
    render: (val: string, record: any) => {
      if (!val) return "-";
      if (record.purchaseOrderType === "Mold") {
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
  {
    title: "商品名稱",
    dataIndex: "goodsName",
    width: 200,
    ellipsis: true,
  },
  {
    title: "寬度 (mm)",
    dataIndex: "width",
    width: 100,
    align: "right",
    render: (val: number, record: any) => {
      if (record.purchaseOrderType === "Mold" || val == null) return "-";
      return Number(val.toFixed(4)).toLocaleString();
    }
  },
  {
    title: "長度",
    dataIndex: "length",
    width: 100,
    align: "right",
    render: (val: number, record: any) => {
      if (record.purchaseOrderType === "Mold" || val == null) return "-";
      const isRoll = record.materialForm === "R" || record.goodsCode?.startsWith("R-") || record.goodsCode?.endsWith("-R") || record.unit === "m2";
      const isSheet = record.materialForm === "S" || record.goodsCode?.startsWith("S-") || record.goodsCode?.endsWith("-S") || record.unit === "pcs";
      const formattedVal = Number(val.toFixed(4)).toLocaleString();
      
      if (isRoll) {
        return (
          <span className="text-blue-600 dark:text-blue-400 font-mono font-medium">
            {formattedVal} m
          </span>
        );
      }
      if (isSheet) {
        return (
          <span className="text-amber-600 dark:text-amber-400 font-mono font-medium">
            {formattedVal} mm
          </span>
        );
      }
      return <span className="font-mono">{formattedVal}</span>;
    }
  },
  {
    title: "客戶編碼",
    dataIndex: "customerCode",
    width: 120,
    render: (val: string) => val || "-",
  },
  {
    title: "成品編碼",
    dataIndex: "productCode",
    width: 120,
    render: (val: string) => val || "-",
  },
  {
    title: "單價",
    dataIndex: "unitPrice",
    width: 100,
    align: "right",
    render: (val: number) => (val != null ? Number(val.toFixed(2)).toLocaleString() : "0"),
  },
  {
    title: "數量",
    dataIndex: "quantity",
    width: 100,
    align: "right",
    render: (val: number) => (val != null ? Number(val.toFixed(4)).toLocaleString() : "0"),
  },
  {
    title: "已到貨數量",
    dataIndex: "receivedQuantity",
    width: 100,
    align: "right",
    render: (val: number) => (val != null ? Number(val.toFixed(4)).toLocaleString() : "0"),
  },
  {
    title: "採購計價單位",
    dataIndex: "unit",
    width: 80,
    align: "center",
    render: (val: string, record: any) => {
      if (record.purchaseOrderType === "Mold") return val || "-";
      const isRoll = record.materialForm === "R" || record.goodsCode?.startsWith("R-") || record.goodsCode?.endsWith("-R") || val === "m2";
      if (isRoll) return "m²";
      return val || "-";
    }
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

  if (purchaseOrderType === "Material") {
    return cols.filter(
      (col) => {
        const key = col.key || (col as any).dataIndex;
        return key !== "customerCode" && key !== "productCode";
      }
    );
  }

  if (purchaseOrderType === "Mold") {
    return cols.filter(
      (col) => {
        const key = col.key || (col as any).dataIndex;
        return key !== "width" && key !== "length";
      }
    );
  }

  return cols;
};

export const getItemFormConfig = (): any[] => [
  {
    name: "purchaseOrderType",
    label: "採購類別",
    componentType: "Input",
    editable: "never",
    colSpan: 4,
    hidden: true,
  },
  {
    name: "materialForm",
    label: "原料形態",
    componentType: "Input",
    editable: "never",
    colSpan: 4,
    hidden: true,
  },
  {
    name: "goodsCode",
    label: (context: any) => {
      const isMold = context?.values?.purchaseOrderType === "Mold";
      return isMold ? "模具編碼" : "原料編碼";
    },
    componentType: "AutoComplete",
    componentProps: (context: any) => {
      const isMold = context?.values?.purchaseOrderType === "Mold";
      return { 
        configKey: isMold ? "MOLD" : "MATERIAL",
        additionalParams: isMold ? { IsArrived: false } : { IsCustomerSupplied: false }
      };
    },
    colSpan: 4,
    validation: z.string().min(1, "編碼為必填"),
    onChange: (_value: any, _context: any, setValue: any, ...args: any[]) => {
      const option = args[1];
      if (option && option.originalData) {
        setValue("goodsName", option.originalData.name || "");
        
        const isMaterial = _context?.values?.purchaseOrderType === "Material";
        if (isMaterial) {
          const form = option.originalData.materialForm; // "R" = 捲材, "S" = 片材
          setValue("materialForm", form);
          setValue("unit", form === "R" ? "m2" : "pcs");

          // 💡 2.挑選原料後,要把原料的長寬都自動帶過來
          const defaultWidth = option.originalData.width ?? option.originalData.widthMm ?? option.originalData.productWidth;
          const defaultLength = option.originalData.length ?? option.originalData.lengthMm;
          
          if (defaultWidth !== undefined && defaultWidth !== null) {
            setValue("width", defaultWidth);
          }
          if (defaultLength !== undefined && defaultLength !== null) {
            setValue("length", defaultLength);
          }

          if (form === "R") {
            const widthVal = defaultWidth ?? _context?.values?.width ?? 0;
            const lengthVal = defaultLength ?? _context?.values?.length ?? 0;
            const m2 = Math.round(((widthVal / 1000) * lengthVal) * 100) / 100;
            setValue("quantity", m2);
            const price = _context?.values?.unitPrice ?? 0;
            setValue("subTotal", Math.round(price * m2));
          } else {
            if (defaultLength === undefined || defaultLength === null) {
              setValue("length", undefined);
            }
          }
        } else {
          setValue("materialForm", undefined);
          setValue("unit", "pcs");
          setValue("length", null);
          setValue("width", null);
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
    label: "預計交期",
    componentType: "DatePicker",
    colSpan: 4,
    validation: z.any().optional(),
  },
  {
    name: "width",
    label: "寬度 (mm)",
    componentType: "InputNumber",
    colSpan: 4,
    hidden: (context: any) => context?.values?.purchaseOrderType !== "Material",
    componentProps: {
      controls: false,
      style: { width: "100%" },
      placeholder: "請輸入寬度",
    },
    validation: z.union([z.number(), z.null(), z.undefined()]).optional(),
    dynamicValidation: (context: any) => {
      const isMaterial = context?.values?.purchaseOrderType === "Material";
      if (isMaterial) {
        return z.number({ required_error: "原料採購之寬度為必填項目", invalid_type_error: "寬度必須為數值" }).min(0.0001, "寬度必須大於 0");
      }
      return z.union([z.number(), z.null(), z.undefined()]).optional();
    },
    onChange: (value: any, context: any, setValue: any) => {
      const isRollMaterial = context?.values?.purchaseOrderType === "Material" && context?.values?.materialForm === "R";
      if (isRollMaterial) {
        const width = value || 0;
        const length = context.values.length || 0;
        const m2 = Math.round(((width / 1000) * length) * 100) / 100;
        setValue("quantity", m2);
        const price = context.values.unitPrice || 0;
        setValue("subTotal", Math.round(price * m2));
      }
    },
  },
  {
    name: "length",
    label: (context: any) => {
      const isSheet = context?.values?.materialForm === "S" || context?.values?.goodsCode?.startsWith("S-") || context?.values?.goodsCode?.endsWith("-S") || context?.values?.unit === "pcs";
      return isSheet ? "長度 (mm)" : "長度 (m)";
    },
    componentType: "InputNumber",
    colSpan: 4,
    hidden: (context: any) => context?.values?.purchaseOrderType !== "Material",
    componentProps: (context: any) => {
      const isSheet = context?.values?.materialForm === "S" || context?.values?.goodsCode?.startsWith("S-") || context?.values?.goodsCode?.endsWith("-S") || context?.values?.unit === "pcs";
      return {
        controls: false,
        style: { width: "100%" },
        placeholder: isSheet ? "請輸入片料長度 (毫米)" : "請輸入卷料長度 (米)",
      };
    },
    validation: z.union([z.number(), z.null(), z.undefined()]).optional(),
    dynamicValidation: (context: any) => {
      const isMaterial = context?.values?.purchaseOrderType === "Material";
      if (isMaterial) {
        return z.number({ required_error: "原料採購之長度為必填項目", invalid_type_error: "長度必須為數值" }).min(0.0001, "長度必須大於 0");
      }
      return z.union([z.number(), z.null(), z.undefined()]).optional();
    },
    onChange: (value: any, context: any, setValue: any) => {
      const isRollMaterial = context?.values?.purchaseOrderType === "Material" && context?.values?.materialForm === "R";
      if (isRollMaterial) {
        const width = context.values.width || 0;
        const length = value || 0;
        const m2 = Math.round(((width / 1000) * length) * 100) / 100;
        setValue("quantity", m2);
        const price = context.values.unitPrice || 0;
        setValue("subTotal", Math.round(price * m2));
      }
    },
  },
  {
    name: "customerCode",
    label: "客戶編碼",
    componentType: "AsyncSelect",
    componentProps: {
      configKey: "CUSTOMER",
      placeholder: "請選擇客戶 (選填)"
    },
    colSpan: 4,
    hidden: (context: any) => context?.values?.purchaseOrderType !== "Mold",
    validation: z.string().nullable().optional(),
    onChange: (_value: any, _context: any, setValue: any) => {
      if (!_value) {
        setValue("productCode", undefined);
      }
    }
  },
  {
    name: "productCode",
    label: "成品編碼",
    componentType: "AsyncSelect",
    componentProps: (context: any) => {
      const customerCode = context?.values?.customerCode;
      return {
        configKey: "PRODUCT",
        disabled: !customerCode,
        placeholder: !customerCode ? "請先選擇客戶" : "請選擇成品 (選填)",
      };
    },
    colSpan: 4,
    hidden: (context: any) => context?.values?.purchaseOrderType !== "Mold",
    validation: z.string().nullable().optional(),
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
    dynamicValidation: (context: any) => {
      const isMaterial = context?.values?.purchaseOrderType === "Material";
      if (isMaterial) {
        return z.number({ required_error: "單價為必填項目", invalid_type_error: "單價必須為數值" }).min(0.0001, "單價必須大於 0");
      }
      return z.number().min(0, "單價不能為負數");
    },
    onChange: (value: any, context: any, setValue: any) => {
      const qty = context.values.quantity || 0;
      const price = value || 0;
      setValue("subTotal", Math.round(price * qty));
    },
    componentProps: {
      controls: false,
      style: { width: "100%" }
    }
  },
  {
    name: "quantity",
    label: (context: any) => {
      const isRoll = context?.values?.purchaseOrderType === "Material" && context?.values?.materialForm === "R";
      return isRoll ? "m²" : "數量";
    },
    componentType: "InputNumber",
    colSpan: 4,
    disabled: (context: any) => {
      return context?.values?.purchaseOrderType === "Material" && context?.values?.materialForm === "R";
    },
    validation: z.number().min(0.0001, "數量必須大於0"),
    dynamicValidation: (context: any) => {
      const isMaterial = context?.values?.purchaseOrderType === "Material";
      if (isMaterial) {
        return z.number({ required_error: "數量為必填項目", invalid_type_error: "數量必須為數值" }).min(0.0001, "數量必須大於 0");
      }
      return z.number().min(0.0001, "數量必須大於0");
    },
    onChange: (value: any, context: any, setValue: any) => {
      const qty = value || 0;
      const price = context.values.unitPrice || 0;
      setValue("subTotal", Math.round(price * qty));
    },
    componentProps: (context: any) => {
      const isRoll = context?.values?.purchaseOrderType === "Material" && context?.values?.materialForm === "R";
      return {
        controls: false,
        style: { width: "100%" },
        disabled: isRoll,
        placeholder: isRoll ? "自動計算 (寬度 x 長度)" : "請輸入數量",
      };
    }
  },
  {
    name: "unit",
    label: "採購單位",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
    validation: z.string().min(1, "採購單位為必填"),
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
