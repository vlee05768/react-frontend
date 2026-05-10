import re

file_path = '/home/hermes/git_projects/erp-frontend-react/src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentConfig.tsx'
with open(file_path, 'r') as file:
    content = file.read()

# Replace responsibleById with responsibleEmployeeCode
content = content.replace('name: "responsibleById",', 'name: "responsibleEmployeeCode",')

# Fix initial value in handleCreate
if "formData: {" in content:
    content = content.replace(
        "formData: {",
        "formData: {\n      responsibleEmployeeCode: user?.employeeCode,"
    )

with open(file_path, 'w') as file:
    file.write(content)
