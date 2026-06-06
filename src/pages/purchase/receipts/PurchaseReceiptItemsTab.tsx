import { useState } from 'react';
import { Table, Button, Space, App, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  postApiV1PurchaseReceiptByCodeItems,
  putApiV1PurchaseReceiptByCodeItemsByLineNumber,
  deleteApiV1PurchaseReceiptByCodeItemsByLineNumber
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import type { PurchaseReceiptDto, PurchaseReceiptItemDto } from '@/api/generated/types.gen';
import { getItemColumns, getItemFormConfig } from './PurchaseReceiptConfig';
import PurchaseOrderItemSelector from './PurchaseOrderItemSelector';
import { getApiErrorMessage } from '@/utils/apiError';

const { Text } = Typography;

interface Props {
  purchaseReceiptData: PurchaseReceiptDto;
  isMasterViewMode: boolean;
  onEditingChange: (isEditing: boolean) => void;
}

export default function PurchaseReceiptItemsTab({ purchaseReceiptData, isMasterViewMode, onEditingChange }: Props) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseReceiptItemDto | null>(null);

  const listData: PurchaseReceiptItemDto[] = Array.isArray(purchaseReceiptData.items) 
    ? purchaseReceiptData.items 
    : [];

  const notifyEdit = (editing: boolean) => {
    onEditingChange(editing);
  };

  const handleEditOpen = (record: PurchaseReceiptItemDto) => {
    setEditingItem(record);
    notifyEdit(true);
  };

  const handleCancel = () => {
    setEditingItem(null);
    notifyEdit(false);
  };

  const createMutation = useMutation({
    mutationFn: (values: any) => 
      postApiV1PurchaseReceiptByCodeItems({ 
        path: { code: purchaseReceiptData.documentNumber! }, 
        body: values 
      }),
  });

  const handleAddItems = async (selectedItems: any[]) => {
    try {
      for (const item of selectedItems) {
        await createMutation.mutateAsync(item);
      }
      message.success('加入明細成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-receipt', purchaseReceiptData.documentNumber] });
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] });
      setIsSelectorOpen(false);
    } catch (err) {
      modal.error({ 
        centered: true, 
        title: '錯誤提示', 
        content: `加入明細失敗: ${getApiErrorMessage(err)}` 
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ lineNumber, values }: { lineNumber: string; values: any }) => 
      putApiV1PurchaseReceiptByCodeItemsByLineNumber({ 
        path: { code: purchaseReceiptData.documentNumber!, lineNumber }, 
        body: values 
      }),
    onSuccess: () => {
      message.success('更新明細成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-receipt', purchaseReceiptData.documentNumber] });
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] });
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
      deleteApiV1PurchaseReceiptByCodeItemsByLineNumber({ 
        path: { code: purchaseReceiptData.documentNumber!, lineNumber } 
      }),
    onSuccess: () => {
      message.success('刪除明細成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-receipt', purchaseReceiptData.documentNumber] });
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] });
    },
    onError: (error) => {
      modal.error({ 
        centered: true, 
        title: '錯誤提示', 
        content: `刪除明細失敗: ${getApiErrorMessage(error)}` 
      });
    }
  });

  const handleDelete = (record: PurchaseReceiptItemDto) => {
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
    if (!editingItem) return;
    try {
      await updateMutation.mutateAsync({ 
        lineNumber: editingItem.lineNumber!, 
        values 
      });
    } catch (e) {
      // 錯誤已在 mutation onError 處理
    }
  };

  const showForm = !!editingItem;
  const isDraft = (purchaseReceiptData.status || '').toUpperCase() === 'UNCONFIRMED' || !purchaseReceiptData.confirmDate;

  const excludedKeys = listData
    .map(x => x.partnerDocumentNumber && x.referenceNumber ? `${x.partnerDocumentNumber}_${x.referenceNumber}` : undefined)
    .filter((x): x is string => !!x);

  return (
    <div className="space-y-4">
      {showForm ? (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <Text strong className="text-base text-neutral-800 dark:text-neutral-200">
              編輯進貨明細: 行 {editingItem?.lineNumber}
            </Text>
            <Space>
              <Button 
                type="primary" 
                loading={updateMutation.isPending}
                onClick={() => {
                  const submitBtn = document.getElementById("purchaseReceiptItemForm-submit-btn");
                  if (submitBtn) {
                    (submitBtn as HTMLButtonElement).click();
                  } else {
                    (document.getElementById("purchaseReceiptItemForm") as HTMLFormElement)?.requestSubmit();
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
            formId="purchaseReceiptItemForm"
            fields={getItemFormConfig()}
            defaultValues={editingItem}
            isViewMode={false}
            isUpdateMode={true}
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
              目前共有 <span>{listData.length}</span> 筆進貨明細
            </div>
            <div>
              {isMasterViewMode && isDraft && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setIsSelectorOpen(true)}
                  disabled={!purchaseReceiptData.businessPartnerCode}
                >
                  挑選採購項目
                </Button>
              )}
            </div>
          </div>
          <Table<PurchaseReceiptItemDto>
            rowKey="lineNumber"
            columns={getItemColumns(!isMasterViewMode || !isDraft, handleEditOpen, handleDelete)}
            dataSource={listData}
            pagination={false}
            loading={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </div>
      )}

      {isSelectorOpen && (
        <PurchaseOrderItemSelector
          open={isSelectorOpen}
          onClose={() => setIsSelectorOpen(false)}
          onConfirm={handleAddItems}
          businessPartnerCode={purchaseReceiptData.businessPartnerCode || undefined}
          excludedKeys={excludedKeys}
        />
      )}
    </div>
  );
}
