import re

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add dynamicValidation to actualQuantity
old_actual = """  {
    name: "actualQuantity",
    label: "實際數量",
    componentType: "InputNumber",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "actualQuantity"),
    validation: z.number().min(0, "不可為負數").optional().nullable(),
    group: "生產資訊",
  },"""

new_actual = """  {
    name: "actualQuantity",
    label: "實際數量",
    componentType: "InputNumber",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "actualQuantity"),
    dynamicValidation: (ctx) => {
      if (ctx.values?._ui_editMode === 'work') {
        return z.number({ required_error: "生產完成請輸入實際數量", invalid_type_error: "生產完成請輸入實際數量" }).min(0, "不可為負數");
      }
      return z.number().min(0, "不可為負數").optional().nullable();
    },
    group: "生產資訊",
  },"""
content = content.replace(old_actual, new_actual)

# 2. Add dynamicValidation to storageCode
old_storage = """  {
    name: "storageCode",
    label: "生產入庫儲位",
    componentType: "AsyncSelect",
    componentProps: { configKey: "STORAGE" },
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "storageCode"),
    group: "生產資訊",
  },"""

new_storage = """  {
    name: "storageCode",
    label: "生產入庫儲位",
    componentType: "AsyncSelect",
    componentProps: { configKey: "STORAGE" },
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "storageCode"),
    dynamicValidation: (ctx) => {
      if (ctx.values?._ui_editMode === 'prepare' || ctx.values?._ui_editMode === 'work') {
        return z.string({ required_error: "此階段請選擇生產入庫儲位" }).min(1, "請選擇生產入庫儲位");
      }
      return z.string().optional().nullable();
    },
    group: "生產資訊",
  },"""
content = content.replace(old_storage, new_storage)

# 3. Add dynamicValidation to plannedQuantity
old_planned = """  {
    name: "plannedQuantity",
    label: "預計生產數量",
    componentType: "InputNumber",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "plannedQuantity"),
    validation: z.number().min(0, "不可為負數").optional().nullable(),
  },"""

new_planned = """  {
    name: "plannedQuantity",
    label: "預計生產數量",
    componentType: "InputNumber",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "plannedQuantity"),
    dynamicValidation: (ctx) => {
      if (ctx.values?._ui_editMode === 'prepare' || ctx.values?._ui_editMode === 'update') {
        return z.number({ required_error: "請輸入預計生產數量", invalid_type_error: "請輸入預計生產數量" }).min(0, "不可為負數");
      }
      return z.number().min(0, "不可為負數").optional().nullable();
    },
  },"""
content = content.replace(old_planned, new_planned)

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
