import re

with open('src/pages/sales/orders/components/CustomerProductPickerModal.tsx', 'r') as f:
    content = f.read()

old_query = """      query: {
        CodeOrName: searchTerm || undefined,
        pageNumber: page,
        pageSize: pageSize,
      }"""

new_query = """      query: {
        CodeOrName: searchTerm || undefined,
        ExcludeProductsCode: excludeProductCodes.length > 0 ? excludeProductCodes : undefined,
        pageNumber: page,
        pageSize: pageSize,
      }"""

content = content.replace(old_query, new_query)

with open('src/pages/sales/orders/components/CustomerProductPickerModal.tsx', 'w') as f:
    f.write(content)
