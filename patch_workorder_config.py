import re

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import the new PersonnelWorkingHoursField
if "PersonnelWorkingHoursField" not in content:
    content = content.replace('import { z } from "zod";', 'import { z } from "zod";\nimport { PersonnelWorkingHoursField } from "./PersonnelWorkingHoursField";')

# 2. Add personnelWorkingHours to permissions
perm_line = "defectReason: { create: false, update: false, work: true, prepare: false },"
new_perm_line = perm_line + "\n  personnelWorkingHours: { create: false, update: false, work: true, prepare: false },"
content = content.replace(perm_line, new_perm_line)

# 3. Add to formConfig
field_block = """  {
    name: "defectReason",
    label: "不良原因",
    componentType: "TextArea",
    colSpan: 1,
    editable: (ctx) => checkPermission(ctx, "defectReason"),
    validation: z.string().optional().nullable(),
    group: "生產資訊",
  },"""

new_field_block = field_block + """
  {
    name: "personnelWorkingHours",
    label: "人員工時",
    componentType: "Custom",
    colSpan: 4,
    editable: (ctx) => checkPermission(ctx, "personnelWorkingHours"),
    group: "生產資訊",
    customRender: (props, ctx, setValue) => (
      <PersonnelWorkingHoursField
        value={props.value}
        disabled={props.disabled}
        onChange={(val) => setValue("personnelWorkingHours", val, { shouldDirty: true, shouldValidate: true })}
      />
    ),
  },"""

content = content.replace(field_block, new_field_block)

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
