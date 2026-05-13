import sys
with open('src/pages/quality/qcreceipt/QcReceiptItemsTab.tsx', 'r') as f:
    content = f.read()

content = content.replace("icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }}  onClick={() => modal.confirm({ title: '刪除確認', content: '確定要刪除嗎？此操作無法還原。', centered: true, width: 400, okButtonProps: { danger: true }, onOk: () => deleteMutation.mutate(record.referenceNumber) })} />}", "icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />}")

with open('src/pages/quality/qcreceipt/QcReceiptItemsTab.tsx', 'w') as f:
    f.write(content)
