import os
for file in [
    'src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx',
    'src/pages/warehouse/InventoryAdjustment/Tabs/InventoryAdjustmentItemsTab.tsx',
    'src/pages/quality/qcreceipt/QcReceiptItemsTab.tsx',
    'src/pages/quality/qcreceipt/QcReceiptsList.tsx',
    'src/pages/basic/BusinessPartner/ContactList.tsx'
]:
    path = os.path.join('/home/hermes/git_projects/erp-frontend-react', file)
    with open(path, 'r') as f: content = f.read()
    if '<Popconfirm' in content and 'Popconfirm' not in content[:1000]:
        with open(path, 'w') as f:
            f.write("import { Popconfirm } from 'antd';\n" + content)
            
    # Also handle setDeletingRecordId not found
    if 'setDeletingRecordId' in content and 'useState' not in content.split('setDeletingRecordId')[0] and 'setDeletingRecordId' not in content.split('setDeletingRecordId')[0]:
        content = content.replace("if (typeof setDeletingRecordId !== 'undefined') setDeletingRecordId(open ? String(recordId) : null);", "// no deleting record ID state")
        with open(path, 'w') as f:
            f.write(content)
