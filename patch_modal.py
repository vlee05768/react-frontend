with open('src/pages/sales/orders/components/CustomerProductPickerModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("onChange={(val) => handlePriceChange(record.code!, val)} // FIXME: should be quantity", "onChange={(val) => handleQuantityChange(record.code!, val)}")

with open('src/pages/sales/orders/components/CustomerProductPickerModal.tsx', 'w') as f:
    f.write(content)
