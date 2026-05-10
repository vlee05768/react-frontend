import { useState } from 'react';
import { Table, Button, Space, App, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  getApiV1OrdersByOrderNumberDetails,
  postApiV1OrdersByOrderNumberDetails,
  putApiV1OrdersByOrderNumberDetailsByLineNumber,
  deleteApiV1OrdersByOrderNumberDetailsByLineNumber
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import type { OrderDto, OrderItemDto } from '@/api/generated/types.gen';
import { getItemColumns, getItemFormConfig } from './OrderConfig';

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
  const [editingItem, setEditingItem] = useState<OrderItemDto | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['order-details', orderData.orderNumber],
    queryFn: () => getApiV1OrdersByOrderNumberDetails({ path: { orderNumber: orderData.orderNumber! } }),
    enabled: !!orderData.orderNumber,
  });

  const listData: OrderItemDto[] = (data?.data as any)?.data || data?.data || [];

  const notifyEdit = (editing: boolean) => {
    onEditingChange(editing);
  };

  const handleCreateOpen = () => {
    setIsCreating(true);
    notifyEdit(true);
  };

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
      queryClient.invalidateQueries({ queryKey: ['order-details', orderData.orderNumber] });
      handleCancel();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ lineNumber, values }: { lineNumber: string, values: any }) => 
      putApiV1OrdersByOrderNumberDetailsByLineNumber({ path: { orderNumber: orderData.orderNumber!, lineNumber }, body: values }),
    onSuccess: () => {
      message.success('更新明細成功');
      queryClient.invalidateQueries({ queryKey: ['order-details', orderData.orderNumber] });
      handleCancel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (lineNumber: string) => 
      deleteApiV1OrdersByOrderNumberDetailsByLineNumber({ path: { orderNumber: orderData.orderNumber!, lineNumber } }),
    onSuccess: () => {
      message.success('刪除明細成功');
      queryClient.invalidateQueries({ queryKey: ['order-details', orderData.orderNumber] });
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
    const isDuplicate = listData.some(
      (item) => 
        item.goodsCode === values.goodsCode && 
        item.lineNumber !== editingItem?.lineNumber
    );

    if (isDuplicate) {
      message.error(`此商品代碼 (${values.goodsCode}) 已存在於明細中，同張單據不可重複新增`);
      return;
    }

    const formattedValues = {
      ...values,
      requestedDeliveryDate: values.requestedDeliveryDate ? dayjs(values.requestedDeliveryDate).format('YYYY-MM-DD') : undefined,
      promisedDeliveryDate: values.promisedDeliveryDate ? dayjs(values.promisedDeliveryDate).format('YYYY-MM-DD') : undefined,
    };

    if (isCreating) {
      await createMutation.mutateAsync(formattedValues);
    } else if (editingItem) {
      await updateMutation.mutateAsync({ lineNumber: editingItem.lineNumber!, values: formattedValues });
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
            defaultValues={isCreating ? { goodsType: 'P', quantity: 1, unitPrice: 0 } : (editingItem || undefined)}
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
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateOpen}>
                  新增
                </Button>
              )}
            </div>
          </div>
          <Table
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
    </div>
  );
}
