import re

with open("src/pages/quality/qcreceipt/QcReceiptDrawer.tsx", "r") as f:
    content = f.read()

# Add imports
imports = """import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
"""
content = content.replace("import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';", imports + "import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';")

# getHeaderActions and getActionBarActions and steps
actions_code = """
  const getHeaderActions = () => {
    if (isCreating || isEditing) return null;
    if (!receiptData) return null;

    return (
      <Space>
        {isViewMode && !isConfirmed && (
          <ActionButton 
            key="confirm"
            intent="success" icon={<CheckCircleOutlined />} 
            loading={confirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '確認單據',
                content: '確定要確認此單據？',
                centered: true,
                width: 400,
                onOk: () => confirmMutation.mutateAsync()
              });
            }}
          >
            確認單據
          </ActionButton>
        )}
        {isViewMode && isConfirmed && (
          <ActionButton 
            key="cancel-confirm"
            intent="warning" icon={<SyncOutlined />} 
            loading={cancelConfirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消確認',
                content: '確定要取消確認此單據？',
                centered: true,
                width: 400,
                okButtonProps: { danger: true },
                onOk: () => cancelConfirmMutation.mutateAsync()
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
    if (isCreating || isEditing) {
      return (
        <Space>
          <Button key="save" type="primary" htmlType="submit" form="qc-receipt-form" icon={<SaveOutlined />} loading={createMutation.isPending || updateMutation.isPending}>
            儲存主檔
          </Button>
          <Button key="cancel" onClick={(e) => {
            e.preventDefault();
            isCreating ? handleClose() : setIsEditing(false)
          }}>
            取消
          </Button>
        </Space>
      );
    }

    if (!receiptData) return null;

    return (
      <Space>
        {isViewMode && !isConfirmed && (
          <Button key="edit" type="primary" icon={<EditOutlined />} onClick={(e) => { e.preventDefault(); setIsEditing(true); }}>
            編輯主檔
          </Button>
        )}
      </Space>
    );
  };

  let steps: any[] = [];
  if (receiptData) {
    steps = [
      {
        title: '準備中',
        status: receiptData.status !== 'Unconfirmed' ? 'finish' : 'process',
        date: receiptData.createdAt,
        user: receiptData.createdBy,
      },
      {
        title: '檢驗確認',
        status: receiptData.status === 'Unconfirmed' ? 'wait' : 'finish',
        date: receiptData.confirmDate,
        user: receiptData.confirmUserName,
      }
    ];
  }

  const drawerStyles = {
    body: { padding: 0, overflow: 'hidden' as const }
  };
"""

content = re.sub(r'  return \(\s*<Drawer', actions_code + r'\n  return (\n    <Drawer', content, count=1)

# replace Drawer properties
content = re.sub(r'<Drawer(.*?)extra=\{.*?\}\s*>', 
                 r'<Drawer\1styles={drawerStyles}\n      extra={getHeaderActions()}\n    >', 
                 content, flags=re.DOTALL)

# Insert ActionBar and DocumentLifecycleBanner
spin_pattern = r'(<Spin spinning=\{isLoading\}>)\s*<MasterDetailTabs'

new_spin_content = r"""\1
        {!isCreating && receiptData && (
          <ActionBar 
            createdBy={receiptData.createdBy || undefined}
            createdAt={receiptData.createdAt || undefined}
            updatedBy={receiptData.updatedBy || undefined}
            updatedAt={receiptData.updatedAt || undefined}
            actions={getActionBarActions()}
          />
        )}
        <div style={{ padding: "8px 24px" }}>
          {!isCreating && receiptData && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={!isCreating && receiptData ? 320 : 160}"""

content = re.sub(spin_pattern, new_spin_content, content)

# Close div
tabs_close_pattern = r'(</MasterDetailTabs>\s*)</Spin>'
content = re.sub(tabs_close_pattern, r'\1</div>\n      </Spin>', content)

with open("src/pages/quality/qcreceipt/QcReceiptDrawer.tsx", "w") as f:
    f.write(content)
