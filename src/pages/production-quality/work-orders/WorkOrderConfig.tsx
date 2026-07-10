import { z } from "zod";
import { PersonnelWorkingHoursField } from "./PersonnelWorkingHoursField";
import { Tag } from "antd";
import {
  SyncOutlined,
} from "@ant-design/icons";
import type {
  SearchFieldConfig,
  FormFieldConfig,
  TableColumnConfig,
} from "@/components/Form/types";
import dayjs from "dayjs";
import { DictTag } from "@/components/Form/DictTag";
import { Link } from "react-router-dom";
import { EllipsisText } from "@/components/Table/EllipsisText";

export const getStatusTag = (status: string | null | undefined) => {
  const hollowStyle = { background: "transparent", borderColor: "currentColor" };
  return (
    <DictTag 
      dictKey="WORK_ORDER_STATUS" 
      value={status || 'Draft'} 
      bordered={true}
      style={hollowStyle}
      icons={{
        InPreparation: <SyncOutlined spin />
      }}
    />
  );
};

export const searchConfig: SearchFieldConfig[] = [
  {
    name: "workOrderNumber",
    label: "製令單號",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "orderNumber",
    label: "訂單編號",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "productCodeOrName",
    label: "產品編碼/名稱",
    componentType: "Input",
    colSpan: 2,
  },
  {
    name: "machineCode",
    label: "機台",
    componentType: "DictSelect",
    componentProps: { dictKey: "MACHINE" },
    colSpan: 2,
  },
  {
    name: "status",
    label: "狀態",
    componentType: "Select",
    colSpan: 2,
    componentProps: {
      options: [
        { label: "已開工未入庫", value: "StartedUnwarehoused" },
        { label: "新單據", value: "Draft" },
        { label: "備料中", value: "InPreparation" },
        { label: "備料確認", value: "PreparationCompleted" },
        { label: "生產中", value: "InProduction" },
        { label: "生產完成", value: "ProductionCompleted" },
        { label: "入庫完成", value: "WarehousingCompleted" },
        { label: "已取消", value: "Cancelled" },
      ],
    },
  },
  {
    name: "workOrderDate",
    label: "製令日期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
  {
    name: "productionDate",
    label: "生產日期",
    componentType: "DateRangePicker",
    colSpan: 2,
  },
  {
    name: "others",
    label: "其他條件",
    componentType: "Input",
    colSpan: 2,
  },
];

export const tableColumns: TableColumnConfig[] = [
  {
    name: "workOrderNumber",
    label: "製令單號",
    width: 160,
    align: "left",
    ellipsis: true,
    sortable: true,
  },
  {
    name: "mode",
    label: "模式",
    width: 90,
    align: "center",
    render: (val) => {
      if (val === "ORD") return <Tag color="blue">訂單轉製令</Tag>;
      if (val === "MNU") return <Tag color="green">手動新增</Tag>;
      return val ? <Tag>{val}</Tag> : "-";
    },
  },
  {
    name: "status",
    label: "狀態",
    width: 90,
    align: "center",
    render: (val) => getStatusTag(val),
  },
  {
    name: "orderNumber",
    label: "訂單編號",
    width: 150,
    align: "left",
    sortable: true,
    render: (val: string) => {
      if (!val) return "-";
      return (
        <Link
          to={`/sales/orders/${val}`}
          style={{
            color: '#1677ff',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          <EllipsisText text={val} maxWidth={130} />
        </Link>
      );
    }
  },
  {
    name: "customerCode",
    label: "客戶",
    width: 220,
    align: "left",
    render: (val: string, record: any) => {
      const text = record.customerName ? `[${val}] ${record.customerName}` : val;
      const bpCode = record.businessPartnerCode;
      if (!bpCode) return text || "-";
      return (
        <Link
          to={`/basic/business-partners/${bpCode}`}
          style={{
            color: '#1677ff',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          <EllipsisText text={text} maxWidth={200} />
        </Link>
      );
    }
  },
  {
    name: "workOrderDate",
    label: "製令日期",
    width: 110,
    align: "center",
    render: (val) => (val ? dayjs(val).format("YYYY-MM-DD") : "-"),
  },
  {
    name: "productionDate",
    label: "生產日期",
    width: 110,
    align: "center",
    render: (val) => (val ? dayjs(val).format("YYYY-MM-DD") : "-"),
  },
  {
    name: "lotNumber",
    label: "批號",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    name: "referenceNumber",
    label: "產品入庫單號",
    width: 150,
    align: "left",
    ellipsis: true,
  },
  {
    name: "productCode",
    label: "產品編碼",
    width: 160,
    align: "left",
    render: (val: string) => {
      if (!val) return "-";
      return (
        <Link
          to={`/warehouse/products/${val}`}
          style={{
            color: '#1677ff',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          <EllipsisText text={val} maxWidth={140} />
        </Link>
      );
    }
  },
  {
    name: "productName",
    label: "產品名稱",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    name: "orderQuantity",
    label: "訂單數量",
    width: 100,
    align: "right",
    render: (val) => <span className="font-semibold" style={{color: 'var(--ant-color-info)'}}>{val != null ? Number(val).toLocaleString() : "-"}</span>,
  },
  {
    name: "plannedQuantity",
    label: "預計數量",
    width: 100,
    align: "right",
    render: (val) => <span className="font-semibold" style={{color: 'var(--ant-color-warning)'}}>{val != null ? Number(val).toLocaleString() : "-"}</span>,
  },
  {
    name: "actualQuantity",
    label: "實際數量",
    width: 100,
    align: "right",
    render: (val) => <span className="font-semibold" style={{color: 'var(--ant-color-success)'}}>{val != null ? Number(val).toLocaleString() : "-"}</span>,
  },
  {
    name: "goodQuantity",
    label: "良品數量",
    width: 100,
    align: "right",
    render: (val) => <span className="font-semibold" style={{color: 'var(--ant-color-success)'}}>{val != null ? Number(val).toLocaleString() : "-"}</span>,
  },

  {
    name: "machineCode",
    label: "機台",
    width: 130,
    align: "left",
    ellipsis: true,
    render: (val, record: any) =>
      record.machineName ? `${val} - ${record.machineName}` : val,
  },
  {
    name: "storageCode",
    label: "儲位編號",
    width: 125,
    align: "left",
    ellipsis: true,
  },

  { name: "notes", label: "備註", width: 200, align: "left", ellipsis: true },
];

import type {
  WorkOrderDto,
  WorkOrderMaterialDto,
} from "@/api/generated/types.gen";


// --- 欄位權限配置 (對齊 Vue 版本) ---
export type FieldPermission = {
  create: boolean;
  update: boolean;
  work: boolean;
  prepare: boolean;
};

const permissions: Record<string, FieldPermission> = {
  customerCode: { create: true, update: false, work: false, prepare: false },
  workOrderDate: { create: true, update: false, work: false, prepare: false },
  orderNumber: { create: true, update: false, work: false, prepare: false },
  orderLineNumber: { create: true, update: false, work: false, prepare: false },
  productCode: { create: true, update: false, work: false, prepare: false },
  productName: { create: true, update: false, work: false, prepare: false },
  customerProductCode: { create: true, update: false, work: false, prepare: false },
  pcsPerSheet: { create: true, update: false, work: false, prepare: false },
  pcsPerPackage: { create: true, update: false, work: false, prepare: false },
  productSpecification: { create: true, update: false, work: false, prepare: false },
  workMethod: { create: true, update: true, work: false, prepare: false },
  projectTag: { create: true, update: false, work: false, prepare: false },
  moldsCode: { create: true, update: false, work: false, prepare: false },
  machineCode: { create: true, update: false, work: false, prepare: false },
  pitch: { create: true, update: false, work: false, prepare: false },
  punchCavities: { create: true, update: false, work: false, prepare: false },
  productionDate: { create: true, update: true, work: true, prepare: true },
  plannedQuantity: { create: true, update: true, work: false, prepare: false },
  actualQuantity: { create: false, update: false, work: true, prepare: false },
  notes: { create: true, update: true, work: true, prepare: true },
  defectReason: { create: false, update: false, work: true, prepare: false },
  personnelWorkingHours: { create: false, update: false, work: true, prepare: false },
  storageCode: { create: false, update: false, work: false, prepare: false },
};

const checkPermission = (ctx: any, fieldName: string) => {
  const perm = permissions[fieldName];
  if (!perm) return false;
  
  // _ui_editMode is injected by the Drawer to indicate the current stage mode
  // values: 'update' | 'prepare' | 'work' | null
  const mode = (ctx.values as any)?._ui_editMode;
  
  if (!ctx.values?.status) return perm.create;
  
  if (mode === 'update') return perm.update;
  if (mode === 'prepare') return perm.prepare;
  if (mode === 'work') return perm.work;
  
  return false;
};

export const formConfig: FormFieldConfig<WorkOrderDto>[] = [
  // --- 基本資訊 ---
  {
    name: "workOrderNumber",
    label: "製令單號",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
  },
  {
    name: "mode",
    label: "模式",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "訂單轉製令", value: "ORD" },
        { label: "手動新增", value: "MNU" },
      ],
    },
    colSpan: 4,
    editable: "never",
  },
  {
    name: "status",
    label: "狀態",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
    customRender: (_, context) => getStatusTag(context.values?.status),
  },
  {
    name: "workOrderDate",
    label: "製令日期",
    componentType: "DatePicker",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "workOrderDate"),
    validation: z.any().optional(),
  },

  {
    name: "customerCode",
    label: "客戶",
    componentType: "AsyncSelect",
    componentProps: { configKey: "CUSTOMER" },
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "customerCode"),
    group: "基本資訊",
    onChange: (_val, _context, setValue, ...args) => {
      const option = args[1] as any;
      if (option?.originalData) {
        const c = option.originalData;
        if (c.name) setValue("customerName", c.name);
      }
    },
  },

  {
    name: "productCode",
    label: "產品編碼",
    componentType: "AsyncSelect",
    componentProps: { configKey: "PRODUCT" },
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "productCode"),
    validation: z.string().min(1, "必填"),

    onChange: (_val, _context, setValue, ...args) => {
      const option = args[1] as any;
      if (option?.originalData) {
        const p = option.originalData;
        if (p.name) setValue("productName", p.name);
        if (p.customerProductId)
          setValue("customerProductCode", p.customerProductId);
      }
    },
  },
  {
    name: "productName",
    label: "產品名稱",
    componentType: "Input",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "productName"),
  },
  {
    name: "customerProductCode",
    label: "客戶料號",
    componentType: "Input",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "customerProductCode"),
  },

  {
    name: "orderLineNumber",
    label: "訂單項次",
    componentType: "Input",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "orderLineNumber"),
  },

  {
    name: "orderQuantity",
    label: "訂單數量",
    componentType: "InputNumber",
    componentProps: { className: 'wo-qty-order w-full' },
    colSpan: 4,
    editable: "createOnly",
    validation: z.number().min(0, "不可為負數").optional().nullable(),
  },
  {
    name: "plannedQuantity",
    label: "預計生產數量",
    componentType: "InputNumber",
    componentProps: { className: 'wo-qty-planned w-full' },
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "plannedQuantity"),
    dynamicValidation: (ctx) => {
      if ((ctx.values as any)?._ui_editMode === 'prepare' || (ctx.values as any)?._ui_editMode === 'update') {
        return z.number({ required_error: "請輸入預計生產數量", invalid_type_error: "請輸入預計生產數量" }).min(0, "不可為負數");
      }
      return z.number().min(0, "不可為負數").optional().nullable();
    },
  },  
  {
    name: "pcsPerSheet",
    label: "PCS/張",
    componentType: "InputNumber",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "pcsPerSheet"),
    validation: z.number().min(0, "不可為負數").optional().nullable(),
  },
 
  {
    name: "productSpecification",
    label: "產品規格",
    componentType: "TextArea",
    colSpan: 2,
    editable: (ctx) => checkPermission(ctx, "productSpecification"),
  },
  {
    name: "workMethod",
    label: "工法",
    componentType: "TextArea",
    colSpan: 2,
    editable: (ctx) => checkPermission(ctx, "workMethod"),
  },
  {
    name: "notes",
    label: "備註",
    componentType: "TextArea",
    colSpan: 1,
    editable: (ctx) => checkPermission(ctx, "notes"),
    validation: z.string().optional().nullable(),
  },
  // --- 生產資訊 ---
  {
    name: "productionDate",
    label: "生產日期",
    componentType: "DatePicker",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "productionDate"),
    dynamicValidation: (ctx) => {
      if ((ctx.values as any)?._ui_editMode === 'work') {
        return z.any().refine((val) => val != null && val !== '', { message: "生產完成請輸入生產日期" });
      }
      return z.any().optional();
    },
    group: "生產資訊",
  },  
    {
    name: "projectTag",
    label: "專案標籤",
    componentType: "Input",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "projectTag"),
    group: "生產資訊",    
  },  


  {
    name: "moldsCode",
    label: "模具編碼",
    componentType: "Input",
    colSpan: 2,
    editable: (ctx) => checkPermission(ctx, "moldsCode"),
    group: "生產資訊",
  },
  {
    name: "machineCode",
    label: "機台編碼",
    componentType: "DictSelect",
    componentProps: { dictKey: "MACHINE" },
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "machineCode"),
    group: "生產資訊",
    onChange: (_val, _context, setValue, ...args) => {
      const option = args[1] as any;
      if (option?.originalData) {
        const m = option.originalData;
        if (m.name) setValue("machineName", m.name);
      } else if (option) {
        // DictSelect maps raw option to the value and label
        // Wait, DictSelect maps fields using fieldNames.
        // We should just use the option label if it's there.
        // Wait, option is the selected item.
        const name = option.name || option._displayName;
        if (name) {
          // We only want the name, but _displayName is `${item.name} (${item.code})`.
          // Let's extract the name if needed, but original name is in the option.
          setValue("machineName", option.name || "");
        }
      } else {
        setValue("machineName", "");
      }
    },
  },

  {
    name: "pitch",
    label: "跳距(mm)",
    componentType: "InputNumber",
    componentProps: { precision: 2 },
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "pitch"),
    validation: z.number().min(0, "不可為負數").optional().nullable(),
    group: "生產資訊",
  },
  {
    name: "punchCavities",
    label: "刀穴數量",
    componentType: "InputNumber",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "punchCavities"),
    validation: z.number().min(0, "不可為負數").optional().nullable(),
    group: "生產資訊",
  },
  {
    name: "actualQuantity",
    label: "實際數量",
    componentType: "InputNumber",
    componentProps: { className: 'wo-qty-actual w-full' },
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "actualQuantity"),
    dynamicValidation: (ctx) => {
      if ((ctx.values as any)?._ui_editMode === 'work') {
        return z.number({ required_error: "生產完成請輸入實際數量", invalid_type_error: "生產完成請輸入實際數量" }).positive("實際數量必須大於 0");
      }
      return z.number().min(0, "不可為負數").optional().nullable();
    },
    group: "生產資訊",
  },
  {
    name: "goodQuantity",
    label: "良品數量",
    componentType: "InputNumber",
    componentProps: { className: 'wo-qty-actual w-full' },
    colSpan: 4,
    editable: "never",
    group: "生產資訊",
  },
   {
    name: "pcsPerPackage",
    label: "單包包裝數",
    componentType: "Input",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "pcsPerPackage"),
    group: "生產資訊",    
  },

  {
    name: "lotNumber",
    label: "批號",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
    group: "生產資訊",
  },
  {
    name: "referenceNumber",
    label: "產品入庫單號",
    componentType: "Input",
    colSpan: 4,
    editable: "never",
    group: "生產資訊",
  },
    {
    name: "personnelWorkingHours",
    label: "人員工時",
    componentType: "Custom",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "personnelWorkingHours"),
    group: "生產資訊",
    customRender: (props, _ctx, setValue) => (
      <PersonnelWorkingHoursField
        value={props.value}
        disabled={props.disabled}
        onChange={(val) => setValue("personnelWorkingHours", val, { shouldDirty: true, shouldValidate: true })}
      />
    ),
  },
  {
    name: "storageCode",
    label: "生產入庫儲位",
    componentType: "AsyncSelect",
    componentProps: { configKey: "STORAGE" },
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "storageCode"),
    dynamicValidation: (ctx) => {
      if ((ctx.values as any)?._ui_editMode === 'prepare' || (ctx.values as any)?._ui_editMode === 'work') {
        return z.string({ required_error: "此階段請選擇生產入庫儲位" }).min(1, "請選擇生產入庫儲位");
      }
      return z.string().optional().nullable();
    },
    group: "生產資訊",
  },
  {
    name: "defectReason",
    label: "不良原因",
    componentType: "TextArea",
    colSpan: 1,
    editable: (ctx) => checkPermission(ctx, "defectReason"),
    validation: z.string().optional().nullable(),
    group: "生產資訊",
  },

];

export const itemColumns: TableColumnConfig[] = [
  {
    name: "serialNumber",
    label: "序號",
    width: 80,
    align: "center",
  },
  {
    name: "storageCode",
    label: "儲位編號",
    width: 120,
    align: "left",
    ellipsis: true,
  },
  {
    name: "materialCode",
    label: "原料編號",
    width: 150,
    align: "left",
    ellipsis: true,
  },
  {
    name: "materialName",
    label: "原料名稱",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    name: "materialWidth",
    label: "幅寬(mm)",
    width: 100,
    align: "right",
    render: (val) => (val != null ? Number(val).toLocaleString() : "-"),
  },
  {
    name: "requiredAmount",
    label: "用量",
    width: 100,
    align: "right",
    render: (val) => (val != null ? Number(val).toLocaleString() : "-"),
  },
  {
    name: "totalLength",
    label: "總長(米)",
    width: 120,
    align: "right",
    render: (val) => (val != null ? Number(val).toLocaleString() : "-"),
  },
  {
    name: "specification",
    label: "規格",
    width: 150,
    align: "left",
    ellipsis: true,
  },
  {
    name: "lotNumber",
    label: "批號",
    width: 150,
    align: "left",
    ellipsis: true,
  },
];

export const itemFormConfig: FormFieldConfig<WorkOrderMaterialDto>[] = [
  {
    name: "materialCode",
    label: "材料",
    componentType: "AsyncSelect",
    componentProps: { configKey: "MATERIAL" },
    colSpan: 2,
    editable: "createOnly",
    validation: z.string().min(1, "必填"),
    onChange: (_val, _context, setValue, ...args) => {
      const option = args[1] as any;
      if (option?.originalData) {
        const m = option.originalData;
        if (m.materialName) setValue("materialName", m.materialName);
        if (m.defaultStorageCode) setValue("storageCode", m.defaultStorageCode);
      }
    },
  },
  {
    name: "materialName",
    label: "材料名稱",
    componentType: "Input",
    colSpan: 2,
    editable: "never",
  },
  {
    name: "storageCode",
    label: "儲位",
    componentType: "AsyncSelect",
    componentProps: { configKey: "STORAGE" },
    colSpan: 2,
    editable: "always",
    validation: z.string().min(1, "必填"),
  },
  {
    name: "requiredAmount",
    label: "預計數量",
    componentType: "InputNumber",
    colSpan: 2,
    editable: "always",
    validation: z.number().min(0, "不可為負數"),
  },
  {
    name: "materialWidth",
    label: "幅寬(mm)",
    componentType: "InputNumber",
    colSpan: 2,
    editable: "never", // usually backend computed or controlled by inventory issuance
  },
  {
    name: "totalLength",
    label: "總長(米)",
    componentType: "TextArea",
    colSpan: 1,
    editable: "always",
    validation: z.string().optional().nullable(),
  },
];

export const requisitionHeaderFormConfig = (): FormFieldConfig<any>[] => [
  {
    name: "documentDate",
    label: "單據日期",
    componentType: "DatePicker",
    colSpan: 2,
    editable: "always",
    validation: z.any().refine(val => !!val, { message: "單據日期為必填" }),
  },
  {
    name: "plannedQuantity",
    label: "製令預計產量 (僅參考)",
    componentType: "InputNumber",
    colSpan: 2,
    editable: "never"
  },
  {
    name: "notes",
    label: "備註說明",
    componentType: "TextArea",
    colSpan: 1,
    editable: "always",
    validation: z.string().optional().nullable(),
  }
];

export const requisitionItemFormConfig = (materials: any[]): FormFieldConfig<any>[] => [
  {
    name: "materialCode",
    label: "領用原料料號",
    componentType: "Select",
    componentProps: {
      options: materials.map(m => ({ label: `${m.materialCode} (${m.materialForm === 'R' ? '捲材' : '片材'})`, value: m.materialCode }))
    },
    colSpan: 1,
    editable: "always",
    validation: z.string().min(1, "必填"),
  },
  {
    name: "sourceStorageCode",
    label: "來源儲位",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "原料主倉 (TW-GEN-INV)", value: "TW-GEN-INV" },
        { label: "現場車間倉 (TW-WIP-GEN)", value: "TW-WIP-GEN" }
      ]
    },
    colSpan: 1,
    editable: "always",
    validation: z.string().min(1, "必填"),
  },
  {
    name: "quantity",
    label: "領用數量",
    componentType: "InputNumber",
    colSpan: 1,
    editable: "always",
    validation: z.number().min(0.0001, "領用數量必須大於 0"),
  },
  {
    name: "referenceQuantity1",
    label: "領用面積 (SQM)",
    componentType: "InputNumber",
    colSpan: 1,
    editable: "never"
  }
];

export const returnHeaderFormConfig = (): FormFieldConfig<any>[] => [
  {
    name: "documentDate",
    label: "單據日期",
    componentType: "DatePicker",
    colSpan: 1,
    editable: "always",
    validation: z.any().refine(val => !!val, { message: "單據日期為必填" }),
  },
  {
    name: "notes",
    label: "退料原因 / 備註",
    componentType: "Input",
    colSpan: 2,
    editable: "always",
    validation: z.string().optional().nullable(),
  }
];

export const returnItemFormConfig = (materials: any[]): FormFieldConfig<any>[] => [
  {
    name: "materialCode",
    label: "原料料號",
    componentType: "Select",
    componentProps: {
      options: materials.map(m => ({ label: `${m.materialCode} (捲材)`, value: m.materialCode }))
    },
    colSpan: 1,
    editable: "always",
    validation: z.string().min(1, "必填"),
  },
  {
    name: "targetStorageCode",
    label: "退回目的儲位",
    componentType: "Select",
    componentProps: {
      options: [
        { label: "原料主倉 (TW-GEN-INV)", value: "TW-GEN-INV" }
      ]
    },
    colSpan: 1,
    editable: "always",
    validation: z.string().min(1, "必填"),
  },
  {
    name: "quantity",
    label: "退回總長度 (M)",
    componentType: "InputNumber",
    colSpan: 1,
    editable: "never"
  },
  {
    name: "referenceQuantity1",
    label: "退回總面積 (SQM)",
    componentType: "InputNumber",
    colSpan: 1,
    editable: "never"
  }
];
