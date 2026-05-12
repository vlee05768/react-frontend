import re

with open("src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx", "r") as f:
    content = f.read()

# Replace MasterDetailTabs import
imports = """import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';"""
content = content.replace("import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';", imports)

# We need to build getHeaderActions and getActionBarActions and steps
# and insert them before the return statement

actions_code = """
  const getHeaderActions = () => {
    if (isDrawerEditing || isCreateDrawerOpen) return null;
    if (!viewData) return null;

    return (
      <Space>
        {viewData?.status === 'Unconfirmed' && (
          <ActionButton 
            key="confirm"
            intent="success" 
            icon={<CheckCircleOutlined />} 
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '確認單據',
                content: '確定要確認此單據？',
                centered: true,
                width: 400,
                onOk: () => confirmMutation.mutateAsync(viewData?.documentNumber)
              });
            }}
            loading={confirmMutation.isPending}
            disabled={isHeaderEditing}
          >
            確認
          </ActionButton>
        )}
        {viewData?.status === 'Confirmed' && (
          <ActionButton 
            key="cancel-confirm"
            intent="warning" icon={<SyncOutlined />} 
            loading={cancelConfirmMutation.isPending} 
            disabled={isHeaderEditing}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消確認',
                content: '確定要取消確認此單據？',
                centered: true,
                width: 400,
                okButtonProps: { danger: true },
                onOk: () => cancelConfirmMutation.mutateAsync(viewData?.documentNumber)
              });
            }}
          >
            取消確認
          </ActionButton>
        )}
      </Space>
    );
  };

  const getActionBarActions = () => {
    if (isDrawerEditing || isCreateDrawerOpen) {
      return (
        <Space>
          <Button 
            key="save"
            type="primary" 
            htmlType="submit"
            form={isCreateDrawerOpen ? "inventoryAdjustmentCreateForm" : "inventoryAdjustmentEditForm"}
            icon={<SaveOutlined />} 
            loading={isCreateDrawerOpen ? createMutation.isPending : updateMutation.isPending}
          >
            儲存主檔
          </Button>
          <Button key="cancel" onClick={(e) => {
            e.preventDefault();
            if (isDrawerEditing) {
              setIsDrawerEditing(false);
            } else {
              closeCreateDrawer();
            }
          }}>取消</Button>
        </Space>
      );
    }

    if (!viewData) return null;

    return (
      <Space>
        {viewData?.status === 'Unconfirmed' && (
          <Button 
            key="edit"
            type="primary" 
            icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
            onClick={(e) => { e.preventDefault(); openEditDrawer(); }} 
            disabled={isHeaderEditing}
          >
            編輯主檔
          </Button>
        )}
      </Space>
    );
  };

  let steps: any[] = [];
  if (viewData) {
    steps = [
      {
        title: '準備中',
        status: viewData.status !== 'Unconfirmed' ? 'finish' : 'process',
        date: viewData.createdAt,
        user: viewData.createdBy,
      },
      {
        title: '單據確認',
        status: viewData.status === 'Unconfirmed' ? 'wait' : 'finish',
        date: viewData.confirmDate,
        user: viewData.confirmUserName,
      }
    ];
  }

  const drawerStyles = {
    body: { padding: 0, overflow: 'hidden' as const }
  };
"""

content = re.sub(r'(  return \(\s*<div)', actions_code + r'\n\1', content, count=1)

# Now, replace the Drawer portion
drawer_start = r'<Drawer\s*title=\{.*?onClose=\{isCreateDrawerOpen \? closeCreateDrawer : closeViewDrawer\}'
# we want to insert styles={drawerStyles} 

def repl_drawer_props(m):
    return m.group(0) + '\n        styles={drawerStyles}'
content = re.sub(drawer_start, repl_drawer_props, content, flags=re.DOTALL)

# Replace the extra={...} block
extra_pattern = r'extra=\{\s*<Space>.*?</Space>\s*\}'
content = re.sub(extra_pattern, 'extra={getHeaderActions()}', content, flags=re.DOTALL)

# Insert ActionBar and DocumentLifecycleBanner inside Spin
spin_pattern = r'(<Spin spinning=\{isFetchingView && !isCreateDrawerOpen\}>)\s*<MasterDetailTabs'

new_spin_content = r"""\1
          {(!isCreateDrawerOpen && viewData) && (
            <ActionBar 
              createdBy={viewData.createdBy || undefined}
              createdAt={viewData.createdAt || undefined}
              updatedBy={viewData.updatedBy || undefined}
              updatedAt={viewData.updatedAt || undefined}
              actions={getActionBarActions()}
            />
          )}
          <div style={{ padding: "8px 24px" }}>
            {(!isCreateDrawerOpen && viewData) && <DocumentLifecycleBanner steps={steps} />}
            <MasterDetailTabs
              heightOffset={(!isCreateDrawerOpen && viewData) ? 320 : 160}"""

content = re.sub(spin_pattern, new_spin_content, content)

# Also we need to close that `div` wrapping the Tabs
tabs_close_pattern = r'(</MasterDetailTabs>)\s*</Spin>'
content = re.sub(tabs_close_pattern, r'\1\n          </div>\n        </Spin>', content)


with open("src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx", "w") as f:
    f.write(content)
