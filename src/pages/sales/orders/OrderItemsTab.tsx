import { useState } from 'react';
import { Table, Button, Space, App, Typography } from 'antd';
// import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  postApiV1OrdersByOrderNumberDetails,
  putApiV1OrdersByOrderNumberDetailsByLineNumber,
  deleteApiV1OrdersByOrderNumberDetailsByLineNumber
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import type { OrderDto, OrderItemDto } from '@/api/generated/types.gen';
import { getItemColumns, getItemFormConfig } from './OrderConfig';
import { CustomerProductPickerModal } from './components/CustomerProductPickerModal';


const { Text } = Typography;

interface Props {
  orderData: OrderDto;
  isMasterViewMode: boolean;
  onEditingChange: (isEditing: boolean) => void;
}

export default function OrderItemsTab({ orderData, isMasterViewMode, onEditingChange }: Props) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItemDto | null>(null);

  // 直接從訂單主檔獲取明細資料，不再重複呼叫 API
  const listData: OrderItemDto[] = Array.isArray(orderData.orderItems) ? orderData.orderItems : [];
  const isLoading = false;

  const notifyEdit = (editing: boolean) => {
    onEditingChange(editing);
  };

  // const handleCreateOpen = () => {
  //   setIsCreating(true);
  //   notifyEdit(true);
  // };

  const handleEditOpen = (record: OrderItemDto) => {
    setEditingItem(record);
    notifyEdit(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingItem(null);
    notifyEdit(false);
  };

  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1OrdersByOrderNumberDetails({ path: { orderNumber: orderData.orderNumber! }, body: values }),
    onSuccess: () => {
      message.success('新增明細成功');
      queryClient.invalidateQueries({ queryKey: ['order', orderData.orderNumber] });
      handleCancel();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ lineNumber, values }: { lineNumber: string, values: any }) => 
      putApiV1OrdersByOrderNumberDetailsByLineNumber({ path: { orderNumber: orderData.orderNumber!, lineNumber }, body: values }),
    onSuccess: () => {
      message.success('更新明細成功');
      queryClient.invalidateQueries({ queryKey: ['order', orderData.orderNumber] });
      handleCancel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (lineNumber: string) => 
      deleteApiV1OrdersByOrderNumberDetailsByLineNumber({ path: { orderNumber: orderData.orderNumber!, lineNumber } }),
    onSuccess: () => {
      message.success('刪除明細成功');
      queryClient.invalidateQueries({ queryKey: ['order', orderData.orderNumber] });
    },
  });

  const handleDelete = (record: OrderItemDto) => {
    modal.confirm({
      title: '刪除明細',
      content: `確定要刪除明細 ${record.lineNumber} 嗎？`,
      centered: true,
      width: 400,
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(record.lineNumber!),
    });
  };

  const handleSubmit = async (values: any) => {
    const formattedValues = {
      ...values,
      requestedDeliveryDate: values.requestedDeliveryDate ? dayjs(values.requestedDeliveryDate).format('YYYY-MM-DD') : undefined,
      promisedDeliveryDate: values.promisedDeliveryDate ? dayjs(values.promisedDeliveryDate).format('YYYY-MM-DD') : undefined,
    };

    const isDuplicate = listData.some(
      (item) => 
        item.goodsCode === formattedValues.goodsCode && 
        item.lineNumber !== editingItem?.lineNumber
    );

    if (isDuplicate) {
      message.error(`此商品代碼 (${formattedValues.goodsCode}) 已存在於明細中，同張單據不可重複新增`);
      return;
    }

    if (isCreating) {
      await createMutation.mutateAsync(formattedValues);
    } else if (editingItem) {
      await updateMutation.mutateAsync({ lineNumber: editingItem.lineNumber!, values: formattedValues });
    }
  };

  const handlePickerConfirm = async (selectedProducts: any[]) => {
    if (!orderData.orderNumber) return;
    setIsBatchSubmitting(true);
    try {
      const itemsToCreate = selectedProducts.map(p => ({
        goodsType: 'P',
        goodsCode: p.code || '',
        goodsName: p.name || '',
        customerProductId: p.customerProductId || undefined,
        unitPrice: p.orderUnitPrice || 0,
        quantity: p.orderQuantity || 1,
        spareQuantity: 0,
        requestedDeliveryDate: orderData.requestedDeliveryDate && dayjs(orderData.requestedDeliveryDate).isValid() ? dayjs(orderData.requestedDeliveryDate).format('YYYY-MM-DD') : undefined,
        promisedDeliveryDate: orderData.promisedDeliveryDate && dayjs(orderData.promisedDeliveryDate).isValid() ? dayjs(orderData.promisedDeliveryDate).format('YYYY-MM-DD') : undefined,
        isOutsource: false,
        priority: '0001',
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
      await queryClient.invalidateQueries({ queryKey: ['order', orderData.orderNumber] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (error: any) {
      message.error(error?.message || '新增明細失敗');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const isEditingState = isCreating || !!editingItem;

  return (
    <div>
      {isEditingState ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text strong>{isCreating ? '新增明細' : `編輯明細 (${editingItem?.lineNumber})`}</Text>
            <Space>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" htmlType="submit" form="itemForm" loading={createMutation.isPending || updateMutation.isPending}>儲存</Button>
            </Space>
          </div>
          <DynamicForm
            formId="itemForm"
            fields={getItemFormConfig()}
            defaultValues={
              isCreating 
                ? { goodsType: 'P', quantity: 1, unitPrice: 0 } 
                : editingItem ? {
                    ...editingItem,
                    requestedDeliveryDate: editingItem.requestedDeliveryDate ? dayjs(editingItem.requestedDeliveryDate) : undefined,
                    promisedDeliveryDate: editingItem.promisedDeliveryDate ? dayjs(editingItem.promisedDeliveryDate) : undefined,
                  } : undefined
            }
            isViewMode={false}
            isUpdateMode={!isCreating}
            hideDefaultFooter={true}
            onSubmit={handleSubmit}
          />
        </div>
      ) : (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px',
            padding: '8px 12px',
            backgroundColor: 'var(--ant-color-fill-alter)',
            borderRadius: '6px'
          }}>
            <div style={{ color: 'var(--ant-color-text-secondary)' }}>
              目前共有 <span>{listData.length}</span> 筆明細
            </div>
            <div>
              {isMasterViewMode && orderData.status === 'Draft' && (
                <Space>
                  <Button type="primary" disabled={!orderData.businessPartnerCode} onClick={() => setIsPickerOpen(true)}>
                    挑選客戶產品
                  </Button>
                {/* <Button icon={<PlusOutlined />} onClick={handleCreateOpen}>
                  新增
                </Button> */}
                </Space>
              )}
            </div>
          </div>
          <Table
            bordered
            columns={getItemColumns(!isMasterViewMode || orderData.status !== 'Draft', handleEditOpen, handleDelete)}
            dataSource={listData}
            rowKey="lineNumber"
            loading={isLoading}
            pagination={false}
            scroll={{ x: 'max-content' }}
            size="small"
          />
        </div>
      )}
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
}