import re

with open("src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx", "r") as f:
    content = f.read()

# Add imports
imports = """import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
"""
content = content.replace("import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';", imports + "import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';")

actions_code = """
  const getHeaderActions = () => {
    if (!formData) return null;

    return (
      <Space>
        {status === 'Unconfirmed' && (
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
                onOk: () => confirmMutation.mutateAsync(id!)
              });
            }}
          >
            確認單據
          </ActionButton>
        )}
        {status === 'Confirmed' && (
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
                onOk: () => cancelConfirmMutation.mutateAsync(id!)
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
    return null;
  };

  let steps: any[] = [];
  if (formData) {
    steps = [
      {
        title: '準備中',
        status: formData.status !== 'Unconfirmed' ? 'finish' : 'process',
        date: formData.createdAt,
        user: formData.createdBy,
      },
      {
        title: '入庫確認',
        status: formData.status === 'Unconfirmed' ? 'wait' : 'finish',
        date: formData.confirmDate,
        user: formData.confirmUserName,
      }
    ];
  }

  const drawerStyles = {
    body: { padding: 0, overflow: 'hidden' as const }
  };
"""

content = content.replace("  return (\n    <Drawer", actions_code + "\n  return (\n    <Drawer")

extra_match = re.search(r'extra=\{\s*<Space>.*?\s*</Space>\s*\}', content, flags=re.DOTALL)
if extra_match:
    content = content[:extra_match.start()] + 'styles={drawerStyles}\n      extra={getHeaderActions()}' + content[extra_match.end():]

spin_pattern = r'(<Spin spinning=\{isLoading\}>)\s*<MasterDetailTabs'
new_spin_content = r"""\1
        {formData && (
          <ActionBar 
            createdBy={formData.createdBy || undefined}
            createdAt={formData.createdAt || undefined}
            updatedBy={formData.updatedBy || undefined}
            updatedAt={formData.updatedAt || undefined}
            actions={getActionBarActions()}
          />
        )}
        <div style={{ padding: "8px 24px" }}>
          {formData && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={formData ? 320 : 160}"""
content = re.sub(spin_pattern, new_spin_content, content)

content = content.replace("        />\n      </Spin>", "        />\n        </div>\n      </Spin>")

# Replace type of formData
content = content.replace("const formData = response?.data?.data || response?.data;", "const formData: any = response?.data?.data || response?.data;")

# Fix the ts warnings about unused mutations by commenting them out explicitly
content = re.sub(r'(const closeMutation = useMutation\(\{.*?\n  \}\);)', r'/* \1 */', content, flags=re.DOTALL)
content = re.sub(r'(const cancelCloseMutation = useMutation\(\{.*?\n  \}\);)', r'/* \1 */', content, flags=re.DOTALL)

with open("src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx", "w") as f:
    f.write(content)
