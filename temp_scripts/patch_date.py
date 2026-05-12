import re

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_prod_date = """  {
    name: "productionDate",
    label: "生產日期",
    componentType: "DatePicker",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "productionDate"),
    validation: z.any().optional(),
    group: "生產資訊",
  },"""

new_prod_date = """  {
    name: "productionDate",
    label: "生產日期",
    componentType: "DatePicker",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "productionDate"),
    dynamicValidation: (ctx) => {
      if ((ctx.values as any)?._ui_editMode === 'work') {
        return z.any({ required_error: "生產完成請輸入生產日期" });
      }
      return z.any().optional();
    },
    group: "生產資訊",
  },"""

content = content.replace(old_prod_date, new_prod_date)

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
