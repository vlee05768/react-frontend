import re

with open("src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx", "r") as f:
    content = f.read()

content = re.sub(r'const closeMutation = useMutation\(\{.*?\}\);', '', content, flags=re.DOTALL)
content = re.sub(r'const cancelCloseMutation = useMutation\(\{.*?\}\);', '', content, flags=re.DOTALL)

with open("src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx", "w") as f:
    f.write(content)
