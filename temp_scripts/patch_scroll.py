import re

file_path = "src/pages/production/workorders/WorkOrderItemsTab.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove height: '100%' and flex column from root div
content = content.replace(
    "<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>",
    "<div style={{ display: 'flex', flexDirection: 'column' }}>"
)

# Remove flex: 1 and overflowY: 'auto' from table wrapper, or just simplify it
content = content.replace(
    "<div style={{ flex: 1, overflowY: 'auto' }}>",
    "<div>"
)

# Add scroll prop to Table
content = content.replace(
    "pagination={false}",
    "pagination={false}\n          scroll={{ x: 'max-content' }}"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
