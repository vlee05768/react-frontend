import re

file_path = "src/pages/production/workorders/WorkOrderItemsTab.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Import buildTableColumns
content = re.sub(
    r'(import { itemColumns } from "./WorkOrderConfig";)',
    r'\1\nimport { buildTableColumns } from "@/utils/tableUtils";',
    content
)

# Convert itemColumns using buildTableColumns
content = re.sub(
    r'columns=\{itemColumns\}',
    r'columns={buildTableColumns(itemColumns)}',
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
