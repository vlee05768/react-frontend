import re

with open('src/pages/sales/orders/OrdersList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add style and bordered to Table
content = content.replace("<Table\n        columns={columns}", "<Table\n        bordered\n        style={{ flex: 1 }}\n        columns={columns}")

# Add showTotal to pagination
content = content.replace("showSizeChanger: true,\n        }}", "showSizeChanger: true,\n          showTotal: (total) => `共 ${total} 筆資料`,\n        }}")

with open('src/pages/sales/orders/OrdersList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
