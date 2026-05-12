content = open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'r', encoding='utf-8').read()

import re

# Revert the manual payload building in WorkOrderDrawer
pattern = r'const handleSubmit = \(values: any\) => \{\n    const payload = \{\n      \.\.\.values,\n      workOrderDate: values\.workOrderDate \? dayjs\(values\.workOrderDate\)\.format\("YYYY-MM-DD"\) : null,\n      productionDate: values\.productionDate \? dayjs\(values\.productionDate\)\.format\("YYYY-MM-DD"\) : null,\n    \};\n\n    if \(isCreateMode\) \{\n      createMutation\.mutate\(payload\);\n    \} else \{\n      updateMutation\.mutate\(payload\);\n    \}\n  \};\n'

replacement = r'''const handleSubmit = (values: any) => {
    if (isCreateMode) {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  };
'''

content = re.sub(pattern, replacement, content)

with open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

