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
import { Link } from "react-router-dom";
import { EllipsisText } from "@/components/Table/EllipsisText";

export const isRollUnit = (goodsType: string | undefined | null, goodsCode: string | undefined | null) => {
  if (!goodsType || !goodsCode) return false;
  return goodsType === "M" && goodsCode.toUpperCase().endsWith("R");
};

export const getStatusTag = (status: string | null | undefined, closeDate?: string | null) => {
  if (status === 'Finished') {
    return closeDate 
      ? <Tag color="error" className="m-0">強制結案</Tag>
      : <Tag color="blue" className="m-0">出貨完畢</Tag>;
  }
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
    componentType: "Select",
    componentProps: {
      options: [
        { label: "新單據", value: "Draft" },
        { label: "已確認", value: "Confirmed" },
        { label: "出貨完畢", value: "ShippedCompleted" },
        { label: "強制結案", value: "ForcedClosed" },
      ],
      allowClear: true,
    },
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
    render: (status: string, record: any) => getStatusTag(status, record.closeDate),
  },

  {
    label: "客戶",
    name: "businessPartnerName",
    width: 240,
    render: (val: string, record: any) => {
      const customerCode = record.customerCode || record.businessPartnerCode;
      const bpCode = record.businessPartnerCode;
      const displayCode = customerCode || bpCode;
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
    name: "customerCode",
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
        businessPartnerCode={context.values.customerCode}
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

export const formatOrderQuantity = (val: number | undefined | null, record: any, color?: string) => {
  if (val == null) return "-";
  
  const isM = record?.goodsType === "M";
  if (isM) {
    const unitUpper = record?.unit?.toUpperCase() || "";
    if (unitUpper === "SQM" || unitUpper === "M²" || unitUpper === "M") {
      const width = record?.widthMm || 0;
      let area = 0;
      if (unitUpper === "SQM" || unitUpper === "M²") {
        area = val;
      } else {
        // 歷史數據以長度 M 為單位，需要乘以寬度得出面積
        area = val * (width / 1000);
      }
      const formattedArea = `${Number(area.toFixed(2)).toLocaleString()} m²`;
      return (
        <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%', color }}>
          {formattedArea}
        </span>
      );
    } else if (unitUpper === "PCS") {
      return (
        <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%', color }}>
          {Number(val.toFixed(2)).toLocaleString()} pcs
        </span>
      );
    }
  }
  
  return (
    <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%', color }}>
      {Number(val.toFixed(2)).toLocaleString()}
    </span>
  );
};

export const formatRollAndSheetQty = (val: number | undefined | null, record: any, color?: string) => {
  if (val == null) return "-";
  
  const isM = record?.goodsType === "M";
  if (isM) {
    const unitUpper = record?.unit?.toUpperCase() || "";
    if (unitUpper === "SQM" || unitUpper === "M²" || unitUpper === "M") {
      const width = record?.widthMm || 0;
      let area = 0;
      let lengthM = 0;
      
      if (unitUpper === "SQM" || unitUpper === "M²") {
        area = val;
        lengthM = width > 0 ? (val / (width / 1000)) : 0;
      } else {
        area = val * (width / 1000);
        lengthM = val;
      }
      
      const formattedArea = `${Number(area.toFixed(2)).toLocaleString()} m²`;
      let formattedLength = "";
      if (width > 0) {
        formattedLength = `(${Number(lengthM.toFixed(2)).toLocaleString()} m)`;
      } else {
        formattedLength = "(寬度未填)";
      }
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', width: '100%', padding: '2px 0' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: color || 'inherit', lineHeight: '1.2' }}>
            {formattedArea}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--ant-color-text-secondary)', lineHeight: '1.2', marginTop: '2px' }}>
            {formattedLength}
          </span>
        </div>
      );
    } else if (unitUpper === "PCS") {
      return (
        <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%', color }}>
          {Number(val.toFixed(2)).toLocaleString()} pcs
        </span>
      );
    }
  }
  
  return (
    <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%', color }}>
      {Number(val.toFixed(2)).toLocaleString()}
    </span>
  );
};

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
    fixed: 'left' as const,
    render: (_: any, record: OrderItemDto) => {
      if (isViewMode) return null;
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '24px', verticalAlign: 'middle' }}>
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ fontSize: "14px" }} />}
              onClick={() => onEdit(record)}
            />
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined style={{ fontSize: "14px" }} />}
              onClick={() => onDelete(record)}
            />
          </Space>
        </div>
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
      const displayVal = (serial !== undefined && serial !== null && serial !== '') ? serial : (record?.lineNumber || record?.LineNumber || index + 1);
      return (
        <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle' }}>
          {displayVal}
        </span>
      );
    }
  },
  {
    title: "類型",
    dataIndex: "goodsType",
    width: 80,
    align: "center",
    ellipsis: true,
    render: (val: string) => (
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '24px', verticalAlign: 'middle' }}>
        <DictTag dictKey="PRODUCT_TYPE" value={val} style={{ margin: 0 }} />
      </div>
    ),
  },
  {
    title: "商品編碼",
    dataIndex: "goodsCode",
    width: 160,
    align: "left",
    ellipsis: true,
    render: (val: string, record: any) => {
      if (!val) return (
        <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle' }}>
          -
        </span>
      );
      let color = "default";
      let toPath = "";
      if (record.goodsType === "P") {
        color = "orange";
        toPath = `/basic/products/${val}`;
      } else if (record.goodsType === "M") {
        color = "cyan";
        toPath = `/basic/materials/${val}`;
      } else if (record.goodsType === "S") {
        color = "purple";
      }

      const tagElement = (
        <Tag 
          color={color} 
          style={{ margin: 0 }}
          className="cursor-pointer hover:opacity-85 transition-opacity inline-flex items-center"
        >
          {val}
        </Tag>
      );

      const content = toPath ? (
        <Link to={toPath} style={{ textDecoration: "none", cursor: "pointer", display: 'inline-flex', alignItems: 'center' }}>
          {tagElement}
        </Link>
      ) : tagElement;

      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', height: '24px', verticalAlign: 'middle' }}>
          {content}
        </div>
      );
    },
  },
  { 
    title: "商品名稱", 
    dataIndex: "goodsName", 
    width: 220, 
    ellipsis: true,
    render: (val: string) => (
      <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {val || "-"}
      </span>
    )
  },
  {
    title: "寬度(mm)",
    dataIndex: "widthMm",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) => (
      <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%' }}>
        {val != null ? val.toLocaleString() : "-"}
      </span>
    )
  },
  {
    title: "長度",
    dataIndex: "lengthM",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number, record: any) => {
      if (val == null) return "-";
      const isM = record?.goodsType === "M";
      if (isM) {
        const unitUpper = record?.unit?.toUpperCase() || "";
        const isSheet = unitUpper === "PCS";
        if (isSheet) {
          return (
            <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%' }}>
              {Number(val.toFixed(2)).toLocaleString()} mm
            </span>
          );
        } else {
          return (
            <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%' }}>
              {Number(val.toFixed(2)).toLocaleString()} m
            </span>
          );
        }
      }
      return (
        <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%' }}>
          {Number(val.toFixed(2)).toLocaleString()}
        </span>
      );
    }
  },
  {
    title: "優先級",
    dataIndex: "priority",
    width: 80,
    align: "center",
    ellipsis: true,
    render: (val: string) => (
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '24px', verticalAlign: 'middle' }}>
        {val ? <DictLabel dictKey="ORDER_PRIORITY" value={val} /> : "-"}
      </div>
    ),
  },
  {
    title: "產生製令",
    dataIndex: "generateWorkOrder",
    width: 90,
    align: "center",
    ellipsis: true,
    render: (v: boolean | undefined | null, record: any) => {
      if (record?.goodsType === "M") return "-";
      let icon = null;
      if (v === true) {
        icon = <CheckOutlined style={{ color: 'green', fontSize: '14px' }} />;
      } else if (v === false) {
        icon = <CloseOutlined style={{ color: 'red', fontSize: '14px' }} />;
      }
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '24px', verticalAlign: 'middle' }}>
          {icon || "-"}
        </div>
      );
    },
  },
  {
    title: "單價",
    dataIndex: "unitPrice",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number) => (
      <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%' }}>
        {val != null ? Number(val.toFixed(2)).toLocaleString() : "-"}
      </span>
    ),
  },

  {
    title: "單位",
    dataIndex: "unit",
    width: 80,
    align: "center",
    ellipsis: true,
    render: (val: string) => (
      <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'center', width: '100%' }}>
        {val || "-"}
      </span>
    )
  },

  {
    title: "數量",
    dataIndex: "quantity",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number, record: any) => formatOrderQuantity(val, record),
  },
  {
    title: "小計",
    dataIndex: "lineAmount",
    width: 120,
    align: "right",
    ellipsis: true,
    render: (val: number) => (
      <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%', color: 'var(--ant-color-primary)' }}>
        {val != null ? Number(val.toFixed(2)).toLocaleString() : "-"}
      </span>
    ),
  },
  {
    title: "要求交期",
    dataIndex: "requestedDeliveryDate",
    width: 120,
    align: "center",
    ellipsis: true,
    render: (d: string) => (
      <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'center', width: '100%' }}>
        {d ? dayjs(d).format("YYYY-MM-DD") : "-"}
      </span>
    ),
  },
  {
    title: "承諾交期",
    dataIndex: "promisedDeliveryDate",
    width: 120,
    align: "center",
    ellipsis: true,
    render: (d: string) => (
      <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'center', width: '100%' }}>
        {d ? dayjs(d).format("YYYY-MM-DD") : "-"}
      </span>
    ),
  },  
  {
    title: "備品數量",
    dataIndex: "spareQuantity",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number, record: any) => {
      if (record?.goodsType === "M") return "-";
      return (
        <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', textAlign: 'right', width: '100%' }}>
          {val != null ? Number(val.toFixed(2)).toLocaleString() : "-"}
        </span>
      );
    },
  },
  {
    title: "已出貨",
    dataIndex: "quantityShipped",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number, record: any) => formatRollAndSheetQty(val, record, 'var(--ant-color-success)'),
  },
  {
    title: "取消數量",
    dataIndex: "quantityCancelled",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number, record: any) => formatRollAndSheetQty(val, record, 'var(--ant-color-error)'),
  },
  {
    title: "剩餘數量",
    dataIndex: "quantityRemaining",
    width: 100,
    align: "right",
    ellipsis: true,
    render: (val: number, record: any) => formatRollAndSheetQty(val, record, 'var(--ant-color-warning)'),
  },
  { 
    title: "備註", 
    dataIndex: "notes", 
    width: 160, 
    ellipsis: true,
    render: (val: string) => (
      <span style={{ display: 'inline-block', lineHeight: '24px', verticalAlign: 'middle', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {val || "-"}
      </span>
    )
  },
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
    colSpan: 2,
    validation: z.string().min(1, "商品編碼為必填"),
    onChange: (_value: any, context: any, setValue: any, ...args: any[]) => {
      const option = args[1];
      if (option && option.originalData) {
        setValue("goodsName", option.originalData.name);
        const isM = context?.values?.goodsType === "M";
        if (isM) {
          setValue("spareQuantity", 0);
          setValue("generateWorkOrder", false);
          const form = option.originalData.materialForm;
          if (form === "R") {
            setValue("unit", "m²"); // 💡 捲料原料：一律以平方公尺 (m²) 計價！
            const defaultWidth = option.originalData.widthMm ?? option.originalData.width ?? 0;
            const defaultLength = option.originalData.lengthM ?? option.originalData.length ?? 0;
            setValue("widthMm", defaultWidth); // 預設帶入寬度
            setValue("lengthM", defaultLength); // 預設帶入長度

            // 💡 捲料原料：自動計算面積和金額，並四捨五入到小數第2位
            const sqm = Number(((defaultWidth / 1000) * defaultLength).toFixed(2));
            setValue("quantity", sqm);
            const price = context?.values?.unitPrice || 0;
            setValue("lineAmount", Math.round(price * sqm));
          } else if (form === "S") {
            setValue("unit", "pcs"); // 💡 片料原料：一律以片數 (pcs) 交易！
            const defaultWidth = option.originalData.widthMm ?? option.originalData.width ?? 0;
            const defaultLength = option.originalData.lengthMm ?? option.originalData.length ?? undefined;
            setValue("widthMm", defaultWidth); // 預設帶入寬度
            setValue("lengthM", defaultLength); // 預設帶入長度
          } else {
            setValue("unit", option.originalData.primaryUoM || "");
          }
        } else {
          setValue("unit", option.originalData.unit || "");
        }
      }
    }
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
    name: "widthMm",
    label: "規格寬度 (mm)",
    componentType: "InputNumber",
    colSpan: 4,
    hidden: (context: any) => context?.values?.goodsType !== "M",
    validation: z.union([z.number(), z.null(), z.undefined()]).optional(),
    dynamicValidation: (context: any) => {
      const isM = context?.values?.goodsType === "M";
      if (isM) {
        return z.number({ required_error: "規格寬度為必填項目", invalid_type_error: "寬度必須為數值" }).min(0.0001, "規格寬度必須大於 0");
      }
      return z.union([z.number(), z.null(), z.undefined()]).optional();
    },
    onChange: (value: any, context: any, setValue: any) => {
      const isRoll = isRollUnit(context?.values?.goodsType, context?.values?.goodsCode);
      if (isRoll) {
        const w = Number(value) || 0;
        const l = Number(context.values.lengthM) || 0;
        const sqm = Number(((w / 1000) * l).toFixed(2));
        setValue("quantity", sqm);
        
        // 重新計算小計
        const price = context.values.unitPrice || 0;
        setValue("lineAmount", Math.round(price * sqm));
      }
    },
    componentProps: {
      placeholder: "輸入寬度(mm)",
      style: { width: "100%" }
    }
  },
  {
    name: "lengthM",
    label: (context: any) => {
      const isSheet = context?.values?.unit === "PCS" || context?.values?.unit === "pcs";
      return isSheet ? "規格長度 (mm)" : "規格長度 (m)";
    },
    componentType: "InputNumber",
    colSpan: 4,
    hidden: (context: any) => context?.values?.goodsType !== "M",
    validation: z.union([z.number(), z.null(), z.undefined()]).optional(),
    dynamicValidation: (context: any) => {
      const isM = context?.values?.goodsType === "M";
      if (isM) {
        const isSheet = context?.values?.unit === "PCS" || context?.values?.unit === "pcs";
        const labelName = isSheet ? "規格長度 (mm)" : "規格長度 (m)";
        return z.number({ required_error: `${labelName}為必填項目`, invalid_type_error: `${labelName}必須為數值` }).min(0.0001, `${labelName}必須大於 0`);
      }
      return z.union([z.number(), z.null(), z.undefined()]).optional();
    },
    onChange: (value: any, context: any, setValue: any) => {
      const isRoll = isRollUnit(context?.values?.goodsType, context?.values?.goodsCode);
      if (isRoll) {
        const w = Number(context.values.widthMm) || 0;
        const l = Number(value) || 0;
        const sqm = Number(((w / 1000) * l).toFixed(2));
        setValue("quantity", sqm);
        
        // 重新計算小計
        const price = context.values.unitPrice || 0;
        setValue("lineAmount", Math.round(price * sqm));
      }
    },
    componentProps: (context: any) => {
      const isSheet = context?.values?.unit === "PCS" || context?.values?.unit === "pcs";
      return {
        placeholder: isSheet ? "輸入長度(mm)" : "輸入長度(m)",
        style: { width: "100%" }
      };
    }
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
    name: "quantity",
    label: (context: any) => {
      const isRoll = isRollUnit(context?.values?.goodsType, context?.values?.goodsCode);
      return isRoll ? "數量 (平方米)" : "數量";
    },
    componentType: "InputNumber",
    colSpan: 4,
    editable: (context: any) => {
      const isRoll = isRollUnit(context?.values?.goodsType, context?.values?.goodsCode);
      return isRoll ? "never" : "editOnly";
    },
    validation: z.number().min(0.0001, "數量必須大於 0"),
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
    name: "unit",
    label: "單位",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
    validation: z.string().optional().nullable(),
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
    hidden: (context: any) => context?.values?.goodsType === "M",
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
    hidden: (context: any) => context?.values?.goodsType === "M",
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
