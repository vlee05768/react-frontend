import os
import re

filepath = '/home/hermes/git_projects/erp-frontend-react/src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. We need App from antd if it's not imported or just use `const { modal, message: messageApi } = App.useApp();`
# `InventoryAdjustmentList.tsx` already uses `const { message: messageApi } = App.useApp();`
# Let's change it to `const { message: messageApi, modal } = App.useApp();`
content = content.replace('const { message: messageApi } = App.useApp();', 'const { message: messageApi, modal } = App.useApp();')

# 2. We need to replace the actions in Drawer extra
# Look for the extra block.
# Currently:
"""
                {viewData?.status === 'Unconfirmed' && (
                  <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={openEditDrawer} disabled={isHeaderEditing}>
                    編輯主檔
                  </Button>
                )}
                {viewData?.status === 'Unconfirmed' && (
                  <Button 
                    type="primary" 
                    style={{ backgroundColor: '#52c41a' }} 
                    icon={<CheckCircleOutlined />} 
                    onClick={() => confirmMutation.mutate(viewData?.documentNumber)}
                    loading={confirmMutation.isPending}
                    disabled={isHeaderEditing}
                  >
                    確認
                  </Button>
                )}
                {viewData?.status === 'Confirmed' && (
                  <Popconfirm title="確定要取消確認？" onConfirm={() => cancelConfirmMutation.mutate(viewData?.documentNumber)}>
                    <Button icon={<SyncOutlined />} loading={cancelConfirmMutation.isPending} disabled={isHeaderEditing}>取消確認</Button>
                  </Popconfirm>
                )}
"""
# Replace with: Modal confirms, and move '編輯主檔' to the bottom.
