import re

with open('src/pages/sales/orders/OrderConfig.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# According to the images, the main form in BusinessPartner uses mostly colSpan: 2 for half width or colSpan: 4 for quarter width. colSpan: 1 is full width.
# Wait, let's look at BusinessPartnerConfig.tsx:
# colSpan: 4 -> quarter width? No, the grid system in antd is 24 columns, but DynamicForm uses a custom grid or responsive grid.
# If colSpan: 1 is full width, 2 is half, 4 is quarter.
# Let's change getFormConfig in OrderConfig.tsx to use colSpan: 2 (half width) or colSpan: 4 (quarter width).

def replace_colspan(text):
    return text.replace("colSpan: 3,", "colSpan: 2,")

content = re.sub(r'(export const getFormConfig = \(\): any\[\] => \[\n[\s\S]*?\n\];)', lambda m: replace_colspan(m.group(1)), content)

with open('src/pages/sales/orders/OrderConfig.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
