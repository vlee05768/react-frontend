import re

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/quality/qcreceipt/QcReceiptDrawer.tsx', 'r') as f:
    content = f.read()
    print("createMutation:" in content)
