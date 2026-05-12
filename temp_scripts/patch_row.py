import re

with open('src/pages/sales/orders/OrdersList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate, useParams } from 'react-router-dom';")
content = content.replace("export default function OrdersList() {\n  const navigate = useNavigate();", "export default function OrdersList() {\n  const navigate = useNavigate();\n  const { id: viewId } = useParams<{ id: string }>();")
content = content.replace("<Table\n        bordered\n        style={{ flex: 1 }}\n        columns={columns}", "<Table\n        bordered\n        rowClassName={(record) => String(record.orderNumber) === String(viewId) ? 'selected-table-row' : ''}\n        style={{ flex: 1 }}\n        columns={columns}")

with open('src/pages/sales/orders/OrdersList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
