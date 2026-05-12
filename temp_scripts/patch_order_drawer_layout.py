import re

with open("src/pages/sales/orders/OrderDrawer.tsx", "r") as f:
    content = f.read()

# Replace getExtraActions with getHeaderActions (but remove Save/Cancel/Edit)
header_actions_start = """
  const getHeaderActions = () => {
    const isDraft = orderData?.status === 'Draft';
    const isConfirmed = orderData?.status === 'Confirmed';
    const isFinished = orderData?.status === 'Finished';
    const canUpdate = hasPermission('Sales.Orders.Update');
    const hasItems = orderData?.orderItems && orderData.orderItems.length > 0;

    if (isCreating || isEditing) return null;
    if (!orderData) return null;

    return (
      <Space>
        {canUpdate && isDraft && (
          <ActionButton 
            key="confirm"
            intent="success" 
            icon={<CheckCircleOutlined />} 
            disabled={isDetailEditing || !hasItems}
            loading={confirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              if (!hasItems) {
                message.error('沒有任何訂單明細，無法確認單據');
                return;
              }
              modal.confirm({
                title: '確認單據',
                content: '確定要確認此單據嗎？',
                centered: true,
                width: 400,
                onOk: () => { confirmMutation.mutate(); },
              })
            }}
          >
            確認單據
          </ActionButton>
        )}
        
        {canUpdate && isConfirmed && (
          <ActionButton 
            key="close"
            intent="success" 
            icon={<LockOutlined />} 
            disabled={isDetailEditing}
            loading={closeMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '單據結案',
                content: '確定要將此單據結案嗎？',
                centered: true,
                width: 400,
                onOk: () => { closeMutation.mutate(); },
              })
            }}
          >
            結案
          </ActionButton>
        )}

        {canUpdate && isConfirmed && (
          <ActionButton 
            key="cancel-confirm"
            intent="warning" 
            icon={<SyncOutlined />} 
            disabled={isDetailEditing}
            loading={cancelConfirmMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消確認',
                content: '確定要取消確認此單據嗎？',
                centered: true,
                width: 400,
                onOk: () => { cancelConfirmMutation.mutate(); },
              })
            }}
          >
            取消確認
          </ActionButton>
        )}

        {canUpdate && isFinished && (
          <ActionButton 
            key="cancel-close"
            intent="warning" 
            icon={<UnlockOutlined />} 
            disabled={isDetailEditing}
            loading={cancelCloseMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消結案',
                content: '確定要取消結案此單據嗎？',
                centered: true,
                width: 400,
                onOk: () => { cancelCloseMutation.mutate(); },
              })
            }}
          >
            取消結案
          </ActionButton>
        )}
      </Space>
    );
  };
"""

action_bar_actions = """
  const getActionBarActions = () => {
    if (isCreating || isEditing) {
      return (
        <Space>
          <Button key="save" type="primary" htmlType="submit" form="orderForm" loading={createMutation.isPending || updateMutation.isPending}>儲存</Button>
          <Button key="cancel" onClick={handleClose}>取消</Button>
        </Space>
      );
    }

    if (!orderData) return null;

    const isDraft = orderData?.status === 'Draft';
    const canUpdate = hasPermission('Sales.Orders.Update');

    return (
      <Space>
        {canUpdate && isDraft && (
          <Button 
            key="edit" 
            type="primary" 
            onClick={(e) => { e.preventDefault(); setIsEditing(true); }} 
            disabled={isDetailEditing}
          >
            編輯
          </Button>
        )}
      </Space>
    );
  };

  let steps: any[] = [];
  if (orderData) {
    steps = [
      {
        title: '準備中',
        status: orderData.status !== 'Draft' ? 'finish' : 'process',
        date: orderData.createdAt,
        user: orderData.createdBy,
      },
      {
        title: '單據確認',
        status: orderData.status === 'Draft' ? 'wait' : (orderData.status === 'Confirmed' ? 'process' : 'finish'),
        date: orderData.confirmDate,
        user: orderData.confirmUserName,
      },
      {
        title: '單據結案',
        status: orderData.status !== 'Finished' ? 'wait' : 'finish',
        date: orderData.closeDate,
        user: orderData.closeUserName,
      }
    ];
  }

  const drawerStyles = {
    body: { padding: 0, overflow: 'hidden' as const }
  };
"""

content = re.sub(r'const getExtraActions = \(\) => \{.*?^  \};', header_actions_start + action_bar_actions, content, flags=re.MULTILINE|re.DOTALL)

# Let's fix the imports
imports = """import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
"""

content = content.replace("import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';", imports + "import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';")

# Let's find the Drawer return block
return_pattern = r"return \(\s*<Drawer.*?>\s*<Spin spinning=\{isLoading\}>.*?<\/Spin>\s*<\/Drawer>\s*\);"
return_block = """return (
    <Drawer
      styles={drawerStyles}
      title={
        <DrawerTitle
          moduleName="訂單"
          isCreate={isCreating}
          isEdit={isEditing}
          record={orderData}
          displayField={(r: OrderDto) => r?.orderNumber ? `${r.orderNumber}` : ''}
        />
      }
      open={true}
      onClose={() => navigate('/sales/orders')}
      size={DRAWER_WIDTH_MAIN as any}
      extra={getHeaderActions()}
      mask={{ closable: isViewMode }}
      keyboard={isViewMode}
    >
      <Spin spinning={isLoading}>
        {!isCreating && orderData && (
          <ActionBar 
            createdBy={orderData.createdBy}
            createdAt={orderData.createdAt}
            updatedBy={orderData.updatedBy}
            updatedAt={orderData.updatedAt}
            actions={getActionBarActions()}
          />
        )}
        <div style={{ padding: "8px 24px" }}>
          {!isCreating && orderData && <DocumentLifecycleBanner steps={steps} />}
          <MasterDetailTabs
            heightOffset={!isCreating && orderData ? 320 : 160}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCreateMode={isCreating}
            isEditMode={isEditing}
            viewId={id}
            disableTabSwitching={isDetailEditing}
            masterContent={
              <div style={{ display: activeTab === 'master_info' ? 'block' : 'none' }}>
                <DynamicForm
                  formId="orderForm"
                  fields={getFormConfig()}
                  defaultValues={defaultValues}
                  isViewMode={!isEditing && !isCreating}
                  isUpdateMode={!isCreating}
                  hideDefaultFooter={true}
                  onSubmit={handleSubmit}
                />
              </div>
            }
            detailTabs={[
              {
                key: 'items',
                label: '訂單明細',
                children: !isCreating && orderData ? (
                  <OrderItemsTab 
                    orderData={orderData} 
                    isMasterViewMode={isViewMode} 
                    onEditingChange={setIsDetailEditing}
                  />
                ) : (
                  <Empty description="請先儲存訂單主檔" />
                )
              }
            ]}
          />
        </div>
      </Spin>
    </Drawer>
  );"""

content = re.sub(r'return \(\s*<Drawer.*?>\s*<Spin spinning=\{isLoading\}>.*?<\/Spin>\s*<\/Drawer>\s*\);', return_block, content, flags=re.MULTILINE|re.DOTALL)

with open("src/pages/sales/orders/OrderDrawer.tsx", "w") as f:
    f.write(content)
