import re
import os

filepath = "src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx"
if os.path.exists(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # match htmlType="submit"\s+form="([^"]+)"
    content = re.sub(
        r'htmlType="submit"\s+form="([^"]+)"',
        r'onClick={() => document.getElementById("\1")?.requestSubmit()}',
        content
    )

    with open(filepath, 'w') as f:
        f.write(content)
    print("Patched InventoryAdjustmentList.tsx")
