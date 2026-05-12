with open("src/pages/quality/qcreceipt/QcReceiptDrawer.tsx", "r") as f:
    content = f.read()

content = content.replace("        />\n      </Spin>", "        />\n        </div>\n      </Spin>")

with open("src/pages/quality/qcreceipt/QcReceiptDrawer.tsx", "w") as f:
    f.write(content)
