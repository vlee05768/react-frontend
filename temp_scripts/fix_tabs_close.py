with open("src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx", "r") as f:
    content = f.read()

content = content.replace("          />\n        </Spin>", "          />\n          </div>\n        </Spin>")

with open("src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx", "w") as f:
    f.write(content)
