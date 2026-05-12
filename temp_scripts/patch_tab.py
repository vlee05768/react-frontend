import re

with open('src/pages/sales/orders/OrderItemsTab.tsx', 'r') as f:
    content = f.read()

# 1. Imports
imports = """import { CustomerProductPickerModal } from './components/CustomerProductPickerModal';
"""
content = content.replace("import { getItemColumns, getItemFormConfig } from './OrderConfig';", "import { getItemColumns, getItemFormConfig } from './OrderConfig';\n" + imports)

# 2. State
state_code = """  const [isCreating, setIsCreating] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);"""
content = content.replace("  const [isCreating, setIsCreating] = useState(false);", state_code)

# 3. Create Button
create_btn = """              {isMasterViewMode && orderData.status === 'Draft' && (
                <Space>
                  <Button type="primary" disabled={!orderData.businessPartnerCode} onClick={() => setIsPickerOpen(true)}>
                    挑選客戶產品
                  </Button>
                  <Button icon={<PlusOutlined />} onClick={handleCreateOpen}>
                    新增
                  </Button>
                </Space>
              )}"""
old_create_btn = """              {isMasterViewMode && orderData.status === 'Draft' && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateOpen}>
                  新增
                </Button>
              )}"""
content = content.replace(old_create_btn, create_btn)

# 4. Handler for Picker
picker_handler = """  const handlePickerConfirm = async (selectedProducts: any[]) => {
    if (!orderData.orderNumber) return;
    setIsBatchSubmitting(true);
    try {
      const itemsToCreate = selectedProducts.map(p => ({
        goodsType: 'P',
        goodsCode: p.code || '',
        goodsName: p.name || '',
        customerProductId: p.customerProductId || null,
        unitPrice: p.orderUnitPrice || 0,
        quantity: p.orderQuantity || 1,
        spareQuantity: 0,
        requestedDeliveryDate: orderData.requestedDeliveryDate ? dayjs(orderData.requestedDeliveryDate).format('YYYY-MM-DD') : null,
        promisedDeliveryDate: orderData.promisedDeliveryDate ? dayjs(orderData.promisedDeliveryDate).format('YYYY-MM-DD') : null,
        isOutsource: false,
        priority: '0001',
        tag: null,
        notes: null,
      }));

      // In React Query, we can use Promise.all to map over mutations or just call the API directly
      await Promise.all(
        itemsToCreate.map(item => 
          postApiV1OrdersByOrderNumberDetails({
            path: { orderNumber: orderData.orderNumber! },
            body: item
          })
        )
      );

      message.success(`已成功新增 ${itemsToCreate.length} 項明細`);
      setIsPickerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['order', orderData.orderNumber] });
    } catch (error: any) {
      message.error(error?.message || '新增明細失敗');
    } finally {
      setIsBatchSubmitting(false);
    }
  };"""

content = content.replace("  const isEditingState = isCreating || !!editingItem;", picker_handler + "\n\n  const isEditingState = isCreating || !!editingItem;")

# 5. JSX Modal
modal_jsx = """      )}
      {orderData.businessPartnerCode && (
        <CustomerProductPickerModal
          open={isPickerOpen}
          customerCode={orderData.businessPartnerCode}
          excludeProductCodes={listData.map(item => item.goodsCode).filter(Boolean) as string[]}
          onCancel={() => setIsPickerOpen(false)}
          onConfirm={handlePickerConfirm}
          loading={isBatchSubmitting}
        />
      )}
    </div>
  );
}"""

# Replace the last `      )} \n    </div> \n  );\n}`
content = content.rsplit("      )}\n    </div>\n  );\n}", 1)[0] + modal_jsx

with open('src/pages/sales/orders/OrderItemsTab.tsx', 'w') as f:
    f.write(content)
