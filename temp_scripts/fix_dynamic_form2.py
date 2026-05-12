import re

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'onSubmit=\{\(\) => \{\}\}', 'onSubmit={handleFinish}', content)

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx', 'w') as f:
    f.write(content)
