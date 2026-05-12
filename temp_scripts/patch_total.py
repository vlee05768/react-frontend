import re

with open('src/pages/sales/orders/OrdersList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const total = (data?.data as any)?.totalRecords || listData.length;", "const total = resData?.data?.totalRecords || resData?.totalRecords || listData.length;")

with open('src/pages/sales/orders/OrdersList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
