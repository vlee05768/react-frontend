import re

with open('src/pages/sales/orders/OrderConfig.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace colSpan: 3 with colSpan: 1 in the main form, except notes
# Because the main form seems to use a standard grid where colSpan: 1 means 1 column in a 3 or 4 col layout? Let's check BusinessPartnerConfig.tsx

