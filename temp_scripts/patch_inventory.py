import re

content = open('/home/hermes/git_projects/erp-frontend-react/src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx').read()

content = content.replace(
    """<Button \n                    type="primary" \n                    style={{ backgroundColor: '#52c41a' }} \n                    icon={<CheckCircleOutlined />} """,
    """<Button \n                    color="primary"\n                    variant="solid"\n                    style={{ backgroundColor: 'green' }} \n                    icon={<CheckCircleOutlined />} """
)

with open('/home/hermes/git_projects/erp-frontend-react/src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx', 'w') as f:
    f.write(content)
