import re

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("ctx.values?._ui_editMode", "(ctx.values as any)?._ui_editMode")

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
