import re

file_path = "src/pages/production/workorders/WorkOrderConfig.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_item_columns = """export const itemColumns: TableColumnConfig[] = [
  {
    name: "serialNumber",
    label: "序號",
    width: 80,
    align: "center",
  },
  {
    name: "lineNumber",
    label: "製令項次",
    width: 100,
    align: "center",
  },
  {
    name: "storageCode",
    label: "儲位編號",
    width: 120,
    align: "left",
    ellipsis: true,
  },
  {
    name: "materialCode",
    label: "原料編號",
    width: 150,
    align: "left",
    ellipsis: true,
  },
  {
    name: "materialName",
    label: "原料名稱",
    width: 200,
    align: "left",
    ellipsis: true,
  },
  {
    name: "materialWidth",
    label: "幅寬(mm)",
    width: 100,
    align: "right",
    render: (val) => (val != null ? Number(val).toLocaleString() : "-"),
  },
  {
    name: "requiredAmount",
    label: "用量",
    width: 100,
    align: "right",
    render: (val) => (val != null ? Number(val).toLocaleString() : "-"),
  },
  {
    name: "totalLength",
    label: "總長(米)",
    width: 120,
    align: "right",
    render: (val) => (val != null ? Number(val).toLocaleString() : "-"),
  },
  {
    name: "specification",
    label: "規格",
    width: 150,
    align: "left",
    ellipsis: true,
  },
  {
    name: "lotNumber",
    label: "批號",
    width: 150,
    align: "left",
    ellipsis: true,
  },
];"""

# Replace the existing itemColumns array
pattern = re.compile(r'export const itemColumns: TableColumnConfig\[\] = \[\s*\{[\s\S]*?\n\];', re.MULTILINE)
if pattern.search(content):
    content = pattern.sub(new_item_columns, content)
else:
    print("Could not find itemColumns pattern")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

