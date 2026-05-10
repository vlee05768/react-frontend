import re

with open('src/pages/sales/orders/OrderDrawer.tsx', 'r') as f:
    content = f.read()

# 1. Add useRef to imports
content = content.replace("import { useState, useMemo } from 'react';", "import { useState, useMemo, useRef, useEffect } from 'react';")

# 2. Add hasAutoSwitchedRef and useEffect after orderData definition
effect_code = """  const orderData: OrderDto | undefined = (data?.data?.data as any) || undefined;

  const hasAutoSwitchedRef = useRef(false);
  const locationState = window.history.state; // We'll just rely on the effect for 'items' if empty
  
  useEffect(() => {
    // If we just successfully created an order, activeTab should be 'items'. We can just use the state from navigate if we passed it, but actually let's just do it directly.
    if (!isLoading && orderData && !hasAutoSwitchedRef.current && isViewMode) {
      hasAutoSwitchedRef.current = true;
      if (!orderData.orderItems || orderData.orderItems.length === 0) {
        setActiveTab('items');
      }
    }
  }, [isLoading, orderData, isViewMode]);
"""
content = content.replace("  const orderData: OrderDto | undefined = (data?.data?.data as any) || undefined;", effect_code)

# 3. Update activeTab setting on create success
create_success = """      if (newOrderNum) {
        // 使用 setTimeout 確保 navigation 完成後才切換 tab
        setTimeout(() => {
           setActiveTab('items');
        }, 100);
        navigate(`/sales/orders/${newOrderNum}`, { replace: true });
        setIsEditing(false);
      }"""
content = content.replace("""      if (newOrderNum) {
        navigate(`/sales/orders/${newOrderNum}`, { replace: true });
        setIsEditing(false);
        setActiveTab('items');
      }""", create_success)

# 4. Update the getExtraActions to disable Confirm if no items, and add a tooltip/check
actions_code = """    const canUpdate = hasPermission('Sales.Orders.Update');
    const hasItems = orderData?.orderItems && orderData.orderItems.length > 0;
"""
content = content.replace("    const canUpdate = hasPermission('Sales.Orders.Update');", actions_code)

confirm_btn = """        {canUpdate && isDraft && (
          <ActionButton 
            intent="success" 
            icon={<CheckCircleOutlined />} 
            disabled={isDetailEditing || !hasItems}
            loading={confirmMutation.isPending}
            onClick={() => {
              if (!hasItems) {
                message.error('沒有任何訂單明細，無法確認單據');
                return;
              }
              modal.confirm({
                title: '確認單據',
                content: '確定要確認此單據嗎？',
                centered: true,
                width: 400,
                onOk: () => confirmMutation.mutateAsync(),
              })
            }}
          >
            確認
          </ActionButton>
        )}"""
old_confirm_btn = """        {canUpdate && isDraft && (
          <ActionButton 
            intent="success" 
            icon={<CheckCircleOutlined />} 
            disabled={isDetailEditing}
            loading={confirmMutation.isPending}
            onClick={() => modal.confirm({
              title: '確認單據',
              content: '確定要確認此單據嗎？',
              centered: true,
              width: 400,
              onOk: () => confirmMutation.mutateAsync(),
            })}
          >
            確認
          </ActionButton>
        )}"""
content = content.replace(old_confirm_btn, confirm_btn)

with open('src/pages/sales/orders/OrderDrawer.tsx', 'w') as f:
    f.write(content)
