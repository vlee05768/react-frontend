with open('/home/hermes/git_projects/erp-frontend-react/src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'isUpdateMode={isEditing && !isCreating}',
    'isUpdateMode={isEditing && !isCreating}\n              onSubmit={handleFinish}'
)

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx', 'w') as f:
    f.write(content)
