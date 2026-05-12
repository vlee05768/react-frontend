import os

files = [
    "src/pages/quality/qcreceipt/QcReceiptDrawer.tsx",
    "src/pages/sales/orders/OrderDrawer.tsx",
    "src/pages/production/workorders/WorkOrderDrawer.tsx",
    "src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx"
]

for filepath in files:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Replace `document.getElementById("xyz")?.requestSubmit()` with `(document.getElementById("xyz") as HTMLFormElement)?.requestSubmit()`
        import re
        content = re.sub(
            r'document\.getElementById\("([^"]+)"\)\?\.requestSubmit\(\)',
            r'(document.getElementById("\1") as HTMLFormElement)?.requestSubmit()',
            content
        )
        with open(filepath, 'w') as f:
            f.write(content)
