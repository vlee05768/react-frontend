import re
import glob
import os

files = [
    "src/pages/quality/qcreceipt/QcReceiptDrawer.tsx",
    "src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx",
    "src/pages/sales/orders/OrderDrawer.tsx",
    "src/pages/production/workorders/WorkOrderDrawer.tsx",
    "src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx"
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the form id in the file
    # e.g., htmlType="submit" form="qc-receipt-form"
    match = re.search(r'htmlType="submit" form="([^"]+)"', content)
    if match:
        form_id = match.group(1)
        # Replace htmlType="submit" form="..." with onClick={() => document.getElementById('...')?.requestSubmit()}
        new_button_props = f'onClick={{() => document.getElementById("{form_id}")?.requestSubmit()}}'
        content = content.replace(match.group(0), new_button_props)
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath} with {form_id}")

