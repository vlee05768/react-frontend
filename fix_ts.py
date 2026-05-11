import re

# Fix PersonnelWorkingHoursField.tsx
with open('src/pages/production/workorders/PersonnelWorkingHoursField.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const { message } = App.useApp();\n", "")
content = content.replace(", App", "")
content = content.replace("render: (val: string | null, record: any, index: number) => {", "render: (val: string | null, _: any, index: number) => {")
content = content.replace("render: (val: number | undefined, record: any, index: number) => (", "render: (val: number | undefined, _: any, index: number) => (")

with open('src/pages/production/workorders/PersonnelWorkingHoursField.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix WorkOrderConfig.tsx
with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = content2.replace("customRender: (props, ctx, setValue) => (", "customRender: (props, _ctx, setValue) => (")

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'w', encoding='utf-8') as f:
    f.write(content2)
