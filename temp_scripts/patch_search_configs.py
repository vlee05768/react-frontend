import os
import re

# We will just print the current search configs to review them.
search_dirs = [
    "src/pages/basic/BusinessPartner/BusinessPartnerConfig.tsx",
    "src/pages/warehouse/Products/ProductConfig.tsx",
    "src/pages/purchase/Material/MaterialConfig.tsx",
    "src/pages/production/workorders/WorkOrderConfig.tsx",
    "src/pages/sales/orders/OrderConfig.tsx",
    "src/pages/system/UserConfig.tsx",
    "src/pages/system/RoleConfig.tsx",
    "src/pages/production/MachineConfig.tsx",
    "src/pages/production/MoldConfig.tsx",
    "src/pages/warehouse/StorageConfig.tsx",
    "src/pages/basic/EmployeeConfig.tsx",
    "src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentConfig.tsx",
]

for file_path in search_dirs:
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            content = f.read()
            match = re.search(r'export const \w+SearchFormConfig.*?\[(.*?)\];', content, re.DOTALL)
            if not match:
                match = re.search(r'export const searchConfig.*?\[(.*?)\];', content, re.DOTALL)
            if match:
                print(f"--- {file_path} ---")
                # print(match.group(0))
