import re

file_path = "src/layouts/MainLayout.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add to ROUTE_MAPPING
if "'ProductionQuality.QcReceipts'" not in content:
    content = content.replace(
        "'ProductionQuality.WorkOrders': '/production/workorders',",
        "'ProductionQuality.WorkOrders': '/production/workorders',\n  'ProductionQuality.QcReceipts': '/production-quality/qc-receipts',\n  'ProductionQuality.ProductionReceipts': '/production-quality/production-receipts',"
    )

# Add to ROUTE_PERMISSION_MAP
if "'/production-quality/qc-receipts'" not in content:
    content = content.replace(
        "'/production/workorders': 'ProductionQuality.WorkOrders.View',",
        "'/production/workorders': 'ProductionQuality.WorkOrders.View',\n  '/production-quality/qc-receipts': 'ProductionQuality.QcReceipts.View',\n  '/production-quality/production-receipts': 'ProductionQuality.ProductionReceipts.View',"
    )

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
