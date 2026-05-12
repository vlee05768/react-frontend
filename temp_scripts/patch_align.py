import re

with open('src/pages/sales/orders/OrdersList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("fixed: 'left',\n      align: 'center',\n      render: (_, record: OrderDto) => {", "fixed: 'left',\n      render: (_, record: OrderDto) => {")
content = content.replace("<Button\n                  type=\"text\"\n                  icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />}\n                  onClick={() => navigate(`/sales/orders/${record.orderNumber}`)}\n                />", "<Button\n                  type=\"text\"\n                  style={{ color: '#1890ff' }}\n                  icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />}\n                  onClick={() => navigate(`/sales/orders/${record.orderNumber}`)}\n                />")

with open('src/pages/sales/orders/OrdersList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
