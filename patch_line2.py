import sys
with open('src/pages/system/GeneralType/CategoryItemList.tsx', 'r') as f:
    content = f.read()

content = content.replace("icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }}  onClick={() => modal.confirm({ title: '刪除確認', content: '確定要刪除？此操作無法還原。', centered: true, width: 400, okButtonProps: { danger: true }, onOk: () => handleDelete(record) })} />}", "icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />}")

with open('src/pages/system/GeneralType/CategoryItemList.tsx', 'w') as f:
    f.write(content)
