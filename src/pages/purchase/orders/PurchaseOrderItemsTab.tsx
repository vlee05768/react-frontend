import { useState } from 'react';
import { Table, Button, Space, App, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  postApiV1PurchaseOrderByCodeItems,
  putApiV1PurchaseOrderByCodeItemsByLineNumber,
  deleteApiV1PurchaseOrderByCodeItemsByLineNumber,
  getApiV1MaterialByCode
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import type { PurchaseOrderDto, PurchaseOrderItemDto } from '@/api/generated/types.gen';
import { getItemColumns, getItemFormConfig } from './PurchaseOrderConfig';
import { getApiErrorMessage } from '@/utils/apiError';

const { Text } = Typography;

interface Props {
  purchaseOrderData: PurchaseOrderDto;
  isMasterViewMode: boolean;
  onEditingChange: (isEditing: boolean) => void;
}

export default function PurchaseOrderItemsTab({ purchaseOrderData, isMasterViewMode, onEditingChange }: Props) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseOrderItemDto | null>(null);

  const listData: PurchaseOrderItemDto[] = Array.isArray(purchaseOrderData.items) 
    ? purchaseOrderData.items 
    : [];

  const notifyEdit = (editing: boolean) => {
    onEditingChange(editing);
  };

  const handleCreateOpen = () => {
    setIsCreating(true);
    notifyEdit(true);
  };

  const handleEditOpen = async (record: PurchaseOrderItemDto) => {
    if (record.purchaseOrderType === 'Material' && record.goodsCode) {
      try {
        const res = await getApiV1MaterialByCode({ path: { code: record.goodsCode } });
        const material = (res.data as any)?.data;
        if (material) {
          setEditingItem({
            ...record,
            materialForm: material.materialForm
          } as any);
        } else {
          setEditingItem(record);
        }
      } catch (err) {
        console.error("Failed to fetch material details:", err);
        setEditingItem(record);
      }
    } else {
      setEditingItem(record);
    }
    notifyEdit(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingItem(null);
    notifyEdit(false);
  };

  const createMutation = useMutation({
    mutationFn: (values: any) => 
      postApiV1PurchaseOrderByCodeItems({ 
        path: { code: purchaseOrderData.code! }, 
        body: values 
      }),
    onSuccess: () => {
      message.success('新增明細成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', purchaseOrderData.code] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      handleCancel();
    },
    onError: (error) => {
      modal.error({ 
        centered: true, 
        title: '錯誤提示', 
        content: `新增明細失敗: ${getApiErrorMessage(error)}` 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ lineNumber, values }: { lineNumber: string; values: any }) => 
      putApiV1PurchaseOrderByCodeItemsByLineNumber({ 
        path: { code: purchaseOrderData.code!, lineNumber }, 
        body: values 
      }),
    onSuccess: () => {
      message.success('更新明細成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', purchaseOrderData.code] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      handleCancel();
    },
    onError: (error) => {
      modal.error({ 
        centered: true, 
        title: '錯誤提示', 
        content: `更新明細失敗: ${getApiErrorMessage(error)}` 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (lineNumber: string) => 
      deleteApiV1PurchaseOrderByCodeItemsByLineNumber({ 
        path: { code: purchaseOrderData.code!, lineNumber } 
      }),
    onSuccess: () => {
      message.success('刪除明細成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', purchaseOrderData.code] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      modal.error({ 
        centered: true, 
        title: '錯誤提示', 
        content: `刪除明細失敗: ${getApiErrorMessage(error)}` 
      });
    }
  });

  const handleDelete = (record: PurchaseOrderItemDto) => {
    modal.confirm({
      title: '刪除明細',
      content: `確定要刪除明細 ${record.lineNumber} 嗎？`,
      centered: true,
      width: 400,
      okButtonProps: { danger: true },
      onOk: () => { 
        deleteMutation.mutate(record.lineNumber!); 
      },
    });
  };

  const handleSubmit = async (values: any) => {
    const { materialForm, ...apiValues } = values;
    const formattedValues = {
      ...apiValues,
      requestedDeliveryDate: apiValues.requestedDeliveryDate 
        ? dayjs(apiValues.requestedDeliveryDate).format('YYYY-MM-DD') 
        : undefined,
      promisedDeliveryDate: apiValues.promisedDeliveryDate 
        ? dayjs(apiValues.promisedDeliveryDate).format('YYYY-MM-DD') 
        : undefined,
    };

    try {
      if (isCreating) {
        await createMutation.mutateAsync(formattedValues);
      } else if (editingItem) {
        await updateMutation.mutateAsync({ 
          lineNumber: editingItem.lineNumber!, 
          values: formattedValues 
        });
      }
    } catch (e) {
      // 錯誤已在 mutation onError 處理
    }
  };

  const defaultValues = editingItem 
    ? {
        ...editingItem,
        requestedDeliveryDate: editingItem.requestedDeliveryDate 
          ? dayjs(editingItem.requestedDeliveryDate) 
          : undefined,
        promisedDeliveryDate: editingItem.promisedDeliveryDate 
          ? dayjs(editingItem.promisedDeliveryDate) 
          : undefined,
      } 
    : {
        purchaseOrderType: purchaseOrderData.purchaseOrderType || 'Material',
        materialForm: 'R',
        unit: '卷',
        quantity: 0,
        unitPrice: 0,
        subTotal: 0,
        width: null,
        length: null,
        customerCode: null,
        productCode: null,
        requestedDeliveryDate: purchaseOrderData.expectedArrivalDate 
          ? dayjs(purchaseOrderData.expectedArrivalDate) 
          : dayjs(),
      };

  const showForm = isCreating || !!editingItem;

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <Text strong className="text-base text-neutral-800 dark:text-neutral-200">
              {isCreating ? '新增採購項目' : `編輯採購項目: 行 ${editingItem?.lineNumber}`}
            </Text>
            <Space>
              <Button 
                type="primary" 
                loading={createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  const submitBtn = document.getElementById("purchaseOrderItemForm-submit-btn");
                  if (submitBtn) {
                    (submitBtn as HTMLButtonElement).click();
                  } else {
                    (document.getElementById("purchaseOrderItemForm") as HTMLFormElement)?.requestSubmit();
                  }
                }}
              >
                儲存
              </Button>
              <Button onClick={handleCancel}>
                取消
              </Button>
            </Space>
          </div>
          <DynamicForm
            formId="purchaseOrderItemForm"
            fields={getItemFormConfig()}
            defaultValues={defaultValues}
            isViewMode={false}
            isUpdateMode={!!editingItem}
            hideDefaultFooter={true}
            onSubmit={handleSubmit}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            className="flex justify-between items-center mb-4 py-2 px-3" 
            style={{ 
              backgroundColor: 'var(--ant-color-fill-alter)', 
              borderRadius: '6px' 
            }}
          >
            <div style={{ color: 'var(--ant-color-text-secondary)' }}>
              目前共有 <span>{listData.length}</span> 筆明細
            </div>
            <div>
              {isMasterViewMode && (purchaseOrderData.status || '').toUpperCase() === 'DRAFT' && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleCreateOpen}
                >
                  新增明細項目
                </Button>
              )}
            </div>
          </div>
          <Table<PurchaseOrderItemDto>
            rowKey="lineNumber"
            columns={getItemColumns(!isMasterViewMode || (purchaseOrderData.status || '').toUpperCase() !== 'DRAFT', handleEditOpen, handleDelete)}
            dataSource={listData}
            pagination={false}
            loading={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </div>
      )}
    </div>
  );
}
