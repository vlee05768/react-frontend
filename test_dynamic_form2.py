content = open('src/components/Form/DynamicForm.tsx', 'r', encoding='utf-8').read()

import re

# We need to fix the TS errors: componentType casting and `d: any`
pattern = r"\} else if \(componentType === 'DateRangePicker'\) \{"
replacement = r"} else if (componentType === 'DateRangePicker' as any) {"
content = content.replace(pattern, replacement)

pattern2 = r"val\.map\(d =>"
replacement2 = r"val.map((d: any) =>"
content = content.replace(pattern2, replacement2)

with open('src/components/Form/DynamicForm.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

