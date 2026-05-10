import re

with open('src/pages/sales/orders/OrderConfig.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import z from 'zod'
if "import { z }" not in content:
    content = "import { z } from 'zod';\n" + content

# Replace validation: {} as any, // FIXME with actual zod schemas
# orderDate: DatePicker
content = content.replace("validation: {} as any, // FIXME", "validation: z.string().optional(),")

with open('src/pages/sales/orders/OrderConfig.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
