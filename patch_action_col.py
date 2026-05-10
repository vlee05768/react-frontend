import re

with open('src/pages/sales/orders/OrdersList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("baseColumns.unshift({", "baseColumns.push({")
content = content.replace("fixed: 'left',", "fixed: 'right',")

with open('src/pages/sales/orders/OrdersList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
