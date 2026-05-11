import re

content = open('src/pages/production/workorders/WorkOrderConfig.tsx', 'r', encoding='utf-8').read()

# We need to insert the helper functions right before formConfig
helpers = """
// --- 權限輔助函數 ---
const isCreating = (ctx: any) => !ctx.values?.status;
const isNotCompleted = (ctx: any) => {
  const s = ctx.values?.status;
  return s !== 'ProductionCompleted' && s !== 'WarehousingCompleted' && s !== 'Cancelled';
};
const isDraftOrPrep = (ctx: any) => {
  const s = ctx.values?.status;
  return !s || s === 'Draft' || s === 'InPreparation';
};
const isInProduction = (ctx: any) => {
  return ctx.values?.status === 'InProduction';
};

"""

content = content.replace('export const formConfig: FormFieldConfig<WorkOrderDto>[] = [', helpers + 'export const formConfig: FormFieldConfig<WorkOrderDto>[] = [')

replacements = {
    'name: "customerProductCode",\n    label: "客戶料號",\n    componentType: "Input",\n    colSpan: 4,\n    editable: "always",': 'name: "customerProductCode",\n    label: "客戶料號",\n    componentType: "Input",\n    colSpan: 4,\n    editable: "createOnly",',
    'name: "orderQuantity",\n    label: "訂單數量",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: "always",': 'name: "orderQuantity",\n    label: "訂單數量",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: "createOnly",',
    'name: "pcsPerSheet",\n    label: "PCS/張",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: "always",': 'name: "pcsPerSheet",\n    label: "PCS/張",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: "createOnly",',
    'name: "pcsPerPackage",\n    label: "單包包裝數",\n    componentType: "Input",\n    colSpan: 4,\n    editable: "always",': 'name: "pcsPerPackage",\n    label: "單包包裝數",\n    componentType: "Input",\n    colSpan: 4,\n    editable: "createOnly",',
    'name: "productSpecification",\n    label: "產品規格",\n    componentType: "TextArea",\n    colSpan: 1,\n    editable: "always",': 'name: "productSpecification",\n    label: "產品規格",\n    componentType: "TextArea",\n    colSpan: 1,\n    editable: (ctx) => isCreating(ctx) || isNotCompleted(ctx),',
    'name: "workMethod",\n    label: "工法",\n    componentType: "TextArea",\n    colSpan: 1,\n    editable: "always",': 'name: "workMethod",\n    label: "工法",\n    componentType: "TextArea",\n    colSpan: 1,\n    editable: (ctx) => isCreating(ctx) || isNotCompleted(ctx),',

    'name: "projectTag",\n    label: "專案標籤",\n    componentType: "Input",\n    colSpan: 4,\n    editable: "always",': 'name: "projectTag",\n    label: "專案標籤",\n    componentType: "Input",\n    colSpan: 4,\n    editable: "createOnly",',
    'name: "moldsCode",\n    label: "模具編碼",\n    componentType: "AsyncSelect",\n    componentProps: { configKey: "MOLD" },\n    colSpan: 4,\n    editable: "always",': 'name: "moldsCode",\n    label: "模具編碼",\n    componentType: "AsyncSelect",\n    componentProps: { configKey: "MOLD" },\n    colSpan: 4,\n    editable: "createOnly",',
    'name: "machineCode",\n    label: "機台編碼",\n    componentType: "DictSelect",\n    componentProps: { dictKey: "MACHINE" },\n    colSpan: 4,\n    editable: "always",': 'name: "machineCode",\n    label: "機台編碼",\n    componentType: "DictSelect",\n    componentProps: { dictKey: "MACHINE" },\n    colSpan: 4,\n    editable: "createOnly",',
    'name: "pitch",\n    label: "跳距(mm)",\n    componentType: "InputNumber",\n    componentProps: { precision: 2 },\n    colSpan: 4,\n    editable: "always",': 'name: "pitch",\n    label: "跳距(mm)",\n    componentType: "InputNumber",\n    componentProps: { precision: 2 },\n    colSpan: 4,\n    editable: "createOnly",',
    'name: "punchCavities",\n    label: "刀穴數量",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: "always",': 'name: "punchCavities",\n    label: "刀穴數量",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: "createOnly",',

    'name: "productionDate",\n    label: "生產日期",\n    componentType: "DatePicker",\n    colSpan: 4,\n    editable: "always",': 'name: "productionDate",\n    label: "生產日期",\n    componentType: "DatePicker",\n    colSpan: 4,\n    editable: (ctx) => isCreating(ctx) || isDraftOrPrep(ctx) || isInProduction(ctx),',
    'name: "plannedQuantity",\n    label: "預計生產數量",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: "always",': 'name: "plannedQuantity",\n    label: "預計生產數量",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: (ctx) => isCreating(ctx) || isDraftOrPrep(ctx),',
    'name: "actualQuantity",\n    label: "實際數量",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: "always",': 'name: "actualQuantity",\n    label: "實際數量",\n    componentType: "InputNumber",\n    colSpan: 4,\n    editable: (ctx) => isInProduction(ctx),',
    'name: "notes",\n    label: "備註",\n    componentType: "TextArea",\n    colSpan: 2,\n    editable: "always",': 'name: "notes",\n    label: "備註",\n    componentType: "TextArea",\n    colSpan: 2,\n    editable: (ctx) => isCreating(ctx) || isNotCompleted(ctx),',
    'name: "defectReason",\n    label: "不良原因",\n    componentType: "TextArea",\n    colSpan: 2,\n    editable: "always",': 'name: "defectReason",\n    label: "不良原因",\n    componentType: "TextArea",\n    colSpan: 2,\n    editable: (ctx) => isInProduction(ctx),',
    'name: "storageCode",\n    label: "生產入庫儲位",\n    componentType: "AsyncSelect",\n    componentProps: { configKey: "STORAGE" },\n    colSpan: 4,\n    editable: "always",': 'name: "storageCode",\n    label: "生產入庫儲位",\n    componentType: "AsyncSelect",\n    componentProps: { configKey: "STORAGE" },\n    colSpan: 4,\n    editable: (ctx) => isCreating(ctx) || isDraftOrPrep(ctx) || isInProduction(ctx),',
}

for old, new_s in replacements.items():
    if old not in content:
        print(f"FAILED TO FIND:\n{old}\n")
    content = content.replace(old, new_s)

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

