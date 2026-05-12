content = open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'r', encoding='utf-8').read()

import re

# We need to remove the _oldHandleSubmit block
pattern = r'  const _oldHandleSubmit = \(\) => \{\n    if \(isCreateMode\) \{\n      createMutation\.mutate\(values\);\n    \} else \{\n      updateMutation\.mutate\(values\);\n    \}\n  \};\n'

content = re.sub(pattern, '', content)

with open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

