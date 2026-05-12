with open('src/pages/sales/orders/components/CustomerProductPickerModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("const rawProducts: ProductDto[] = data?.data?.data || [];", "const rawProducts: ProductDto[] = data?.data?.data?.data || [];")
content = content.replace("const rawProducts = data?.data?.data || [];", "const rawProducts: ProductDto[] = data?.data?.data?.data || [];")
content = content.replace("const totalCount = data?.data?.totalRecords || 0;", "const totalCount = data?.data?.data?.totalRecords || 0;")

with open('src/pages/sales/orders/components/CustomerProductPickerModal.tsx', 'w') as f:
    f.write(content)
