import re

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx', 'r') as f:
    content = f.read()

# Replace `import { Spin, Drawer, Space, App } from 'antd';`
# with `import { Spin, Drawer, Space, App, Button } from 'antd';`
content = content.replace(
    "import { Spin, Drawer, Space, App } from 'antd';",
    "import { Spin, Drawer, Space, App, Button } from 'antd';"
)

# And fix `Parameter 'e' implicitly has an 'any' type` by changing `(e) =>` to `(e: React.MouseEvent) =>`
content = content.replace('(e) => { e.preventDefault();', '(e: any) => { e.preventDefault();')

# Ensure handleClose is declared once
content = re.sub(r'const handleClose = \(\) => \{\n    navigate\(\'/production-quality/production-receipts\'\);\n  \};\n(?=.*?const handleClose)', '', content, flags=re.DOTALL)

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx', 'w') as f:
    f.write(content)
