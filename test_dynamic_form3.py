content = open('src/components/Form/DynamicForm.tsx', 'r', encoding='utf-8').read()

import re

# We need to fix the TS errors
content = content.replace("} else if (componentType === 'DateRangePicker') {", "} else if ((componentType as any) === 'DateRangePicker') {")
content = content.replace("val.map(d => d &&", "val.map((d: any) => d &&")

with open('src/components/Form/DynamicForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

