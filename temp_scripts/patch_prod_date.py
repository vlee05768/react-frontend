content = open('src/pages/production/workorders/WorkOrderConfig.tsx', 'r', encoding='utf-8').read()

import re

# We want to replace the editable condition for productionDate
pattern = r'(name:\s*"productionDate",\s*label:\s*"生產日期",\s*componentType:\s*"DatePicker",\s*colSpan:\s*4,\s*editable:\s*)\(ctx\)\s*=>[^,]+,'
replacement = r'\1"createOnly",'

content = re.sub(pattern, replacement, content)

with open('src/pages/production/workorders/WorkOrderConfig.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

