import { useState, useMemo } from 'react';
import { Table, Button, App, Space, Typography } from 'antd';
import type { SalesDeliveryItemDto, CreateSalesDeliveryItemDto } from '@/api/generated/types.gen';
import { 
  deleteApiV1SalesDeliveryByMovementNumberItemsByLineNumber,
  postApiV1SalesDeliveryByMovementNumberItems,
  putApiV1SalesDeliveryByMovementNumberItemsByLineNumber
} from '@/api/generated/sdk.gen';
import { useMutation } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/utils/apiError';
import UndeliveredOrderItemPicker from './components/UndeliveredOrderItemPicker';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { getItemColumns, getItemFormConfig } from './SalesDeliveryConfig';

const { Text } = Typography;

interface Props {
  documentNumber: string;
  customerCode: string;
  items: SalesDeliveryItemDto[];
  isEditing: boolean;
  isConfirmed: boolean;
  onRefresh: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export default function SalesDeliveryItemsTab({ documentNumber, customerCode, items, isEditing, isConfirmed, onRefresh, onEditingChange }: Props) {
  const { modal, message } = App.useApp();
  const [showPicker, setShowPicker] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesDeliveryItemDto | null>(null);

  const originalOrderItems = useMemo(() => {
    const keys = new Set<string>();
    items.forEach((i: any) => {
      if (i.referenceNumber) {
        keys.add(i.referenceNumber);
      }
      if (i.extraData) {
        try {
          const allocations = Array.isArray(i.extraData) 
            ? i.extraData 
            : (typeof i.extraData === 'object' && i.extraData !== null)
              ? (i.extraData as any).rootElement 
                ? JSON.parse(JSON.stringify(i.extraData)) 
                : i.extraData
              : JSON.parse(typeof i.extraData === 'string' ? i.extraData : '{}');
          
          const list = Array.isArray(allocations) ? allocations : (allocations?.data || []);
          if (Array.isArray(list)) {
            list.forEach((alloc: any) => {
              const lineNum = alloc.OrderItemLineNumber || alloc.orderItemLineNumber || alloc.lineNumber || alloc.LineNumber;
              if (lineNum) {
                keys.add(lineNum);
              }
            });
          }
        } catch (e) {
          // ignore
        }
      }
    });
    return Array.from(keys);
  }, [items]);

  const canModifyItems = !isEditing && !isConfirmed;
  const isViewMode = !canModifyItems;
  const isEditingState = !!editingItem;

  const notifyEdit = (editing: boolean) => {
    if (onEditingChange) onEditingChange(editing);
  };

  const handleEditOpen = (record: SalesDeliveryItemDto) => {
    setEditingItem(record);
    notifyEdit(true);
  };

  const handleCancel = () => {
    setEditingItem(null);
    notifyEdit(false);
  };

  const deleteMutation = useMutation({
    mutationFn: (lineNumber: string) => deleteApiV1SalesDeliveryByMovementNumberItemsByLineNumber({ path: { movementNumber: documentNumber, lineNumber } }),
    onSuccess: () => {
      message.success('刪除明細成功');
      onRefresh();
    },
    onError: (error) => {
      modal.error({ centered: true, title: '刪除失敗', content: getApiErrorMessage(error) });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ lineNumber, values }: { lineNumber: string, values: any }) => 
      putApiV1SalesDeliveryByMovementNumberItemsByLineNumber({ path: { movementNumber: documentNumber, lineNumber }, body: values }),
    onSuccess: () => {
      message.success('更新明細成功');
      onRefresh();
      handleCancel();
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `更新明細失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const addItemsMutation = useMutation({
    mutationFn: async (newItems: CreateSalesDeliveryItemDto[]) => {
      for (const item of newItems) {
        await postApiV1SalesDeliveryByMovementNumberItems({
          path: { movementNumber: documentNumber },
          body: item
        });
      }
    },
    onSuccess: () => {
      message.success('明細新增成功');
      setShowPicker(false);
      onRefresh();
    },
    onError: (error) => {
      modal.error({ centered: true, title: '新增失敗', content: getApiErrorMessage(error) });
    }
  });

  const handleDelete = (record: SalesDeliveryItemDto) => {
    modal.confirm({
      title: '確認刪除',
      content: `確定要刪除明細 ${record.lineNumber} 嗎？`,
      centered: true,
      width: 400,
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(record.lineNumber!)
    });
  };

  const handlePickerConfirm = (selectedItems: CreateSalesDeliveryItemDto[]) => {
    addItemsMutation.mutate(selectedItems);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ lineNumber: editingItem.lineNumber!, values });
      }
    } catch (e) {
      // handled in onError
    }
  };

  return (
    <div>
      {isEditingState ? (
        <div className="p-4" style={{border: '1px solid var(--ant-color-border-secondary)', borderRadius: '8px', backgroundColor: 'var(--ant-color-bg-container)'}}>
          <div className="flex justify-between mb-4">
            <Text strong style={{ fontSize: '16px' }}>{`編輯明細 (${editingItem?.lineNumber})`}</Text>
            <Space>
              <Button type="primary" htmlType="submit" form="itemForm" loading={updateMutation.isPending}>儲存</Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </div>
          <DynamicForm
            formId="itemForm"
            fields={getItemFormConfig()}
            defaultValues={editingItem || undefined}
            isViewMode={false}
            isUpdateMode={true}
            hideDefaultFooter={true}
            onSubmit={handleSubmit}
          />
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4 py-2 px-3" style={{backgroundColor: 'var(--ant-color-fill-alter)', borderRadius: '6px'}}>
            <div style={{ color: 'var(--ant-color-text-secondary)' }}>
              目前共有 <span>{items.length}</span> 筆明細
            </div>
            <div>
              {canModifyItems && (
                <Space>
                  <Button type="primary" disabled={!customerCode} onClick={() => setShowPicker(true)}>
                    挑選未出貨訂單
                  </Button>
                </Space>
              )}
            </div>
          </div>
          <Table
            virtual
            columns={getItemColumns(isViewMode, handleEditOpen, handleDelete)}
            dataSource={items}
            rowKey="lineNumber"
            pagination={false}
            scroll={{ x: 1500, y: 400 }}
            size="small"
            bordered
          />
        </div>
      )}
      <UndeliveredOrderItemPicker
        open={showPicker}
        customerCode={customerCode}
        originalOrderItems={originalOrderItems}
        onClose={() => setShowPicker(false)}
        onConfirm={handlePickerConfirm}
      />
    </div>
  );
}
