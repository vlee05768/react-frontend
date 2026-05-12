import re

with open('src/pages/sales/orders/OrdersList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const listDataRaw = (data?.data as any)?.data?.data || (data?.data as any)?.data || data?.data;", "const resData = data?.data as any;\n  const listDataRaw = resData?.data?.data || resData?.data || resData;")

with open('src/pages/sales/orders/OrdersList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
