content = open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'r', encoding='utf-8').read()

import re

# Find handleSubmit function
pattern = r'(const handleSubmit = \(values: any\) => \{\n)(    if \(isCreateMode\) \{)'

replacement = r'''\1    const payload = {
      ...values,
      workOrderDate: values.workOrderDate ? dayjs(values.workOrderDate).format("YYYY-MM-DD") : null,
      productionDate: values.productionDate ? dayjs(values.productionDate).format("YYYY-MM-DD") : null,
    };

    if (isCreateMode) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const _oldHandleSubmit = () => {
\2'''

content = re.sub(pattern, replacement, content)

with open('src/pages/production/workorders/WorkOrderDrawer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

