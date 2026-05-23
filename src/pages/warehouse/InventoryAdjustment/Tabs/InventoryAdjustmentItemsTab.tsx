import React, { useState } from 'react';
import { Table, Button, Space, App } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { TableActions } from '@/utils/tableActions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1InventoryAdjustmentByMovementNumberItems,
  postApiV1InventoryAdjustmentByMovementNumberItems,
  putApiV1InventoryAdjustmentByMovementNumberItemsByLineNumber,
  deleteApiV1InventoryAdjustmentByMovementNumberItemsByLineNumber
} from '@/api/generated/sdk.gen';
import { getApiErrorMessage } from '@/utils/apiError';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { buildTableColumns } from '@/utils/tableUtils';
import { itemTableColumns, itemFormConfig } from '../InventoryAdjustmentConfig';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';


interface Props {
  documentNumber: string;
  isMasterViewMode: boolean;
  masterStatus?: string;
  onEditingChange?: (isEditing: boolean) => void;
}

export default function InventoryAdjustmentItemsTab({ documentNumber, isMasterViewMode, masterStatus, onEditingChange }: Props) {
  const { message: messageApi, modal } = App.useApp();
  const queryClient = useQueryClient();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Queries
  const { data, isFetching } = useQuery({
    queryKey: ['inventoryAdjustmentItems', documentNumber],
    queryFn: () => getApiV1InventoryAdjustmentByMovementNumberItems({ path: { movementNumber: documentNumber }, query: { pageSize: -1 } }),
    enabled: !!documentNumber,
  });

  const listData: any[] = Array.isArray((data?.data as any)?.data?.data) 
    ? (data?.data as any).data.data 
    : Array.isArray((data?.data as any)?.data) 
      ? (data?.data as any).data 
      : Array.isArray(data?.data)
        ? data.data
        : [];
  
  // Notice to parent about our edit state
  React.useEffect(() => {
    if (onEditingChange) {
      onEditingChange(isCreating || !!editingItem);
    }
  }, [isCreating, editingItem, onEditingChange]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1InventoryAdjustmentByMovementNumberItems({
      path: { movementNumber: documentNumber },
      body: values
    }),
    onSuccess: () => {
      messageApi.success('新增明細成功');
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentItems', documentNumber] });
      setIsCreating(false);
    },
    onError: (err: any) => {
      modal.error({ centered: true, title: '錯誤提示', content: `新增明細失敗: ${getApiErrorMessage(err)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { lineNumber: string, values: any }) => putApiV1InventoryAdjustmentByMovementNumberItemsByLineNumber({
      path: { movementNumber: documentNumber, lineNumber: variables.lineNumber },
      body: variables.values
    }),
    onSuccess: () => {
      messageApi.success('更新明細成功');
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentItems', documentNumber] });
      setEditingItem(null);
    },
    onError: (err: any) => {
      modal.error({ centered: true, title: '錯誤提示', content: `更新明細失敗: ${getApiErrorMessage(err)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (lineNumber: string) => deleteApiV1InventoryAdjustmentByMovementNumberItemsByLineNumber({
      path: { movementNumber: documentNumber, lineNumber }
    }),
    onSuccess: () => {
      messageApi.success('刪除明細成功');
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentItems', documentNumber] });
    },
    onError: (err: any) => {
      modal.error({ centered: true, title: '錯誤提示', content: `刪除明細失敗: ${getApiErrorMessage(err)}` });
    }
  });

  const canEdit = isMasterViewMode && masterStatus === 'Unconfirmed';

  const columns = [
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <TableActions
          onView={!canEdit ? () => setEditingItem(record) : undefined}
          onEdit={canEdit ? () => setEditingItem(record) : undefined}
          onDelete={canEdit ? () => deleteMutation.mutate(record.lineNumber) : undefined}
          recordName={`第 ${record.lineNumber} 行明細`}
          deleteConfirmType="popconfirm"
        />
      ),
    },
    ...buildTableColumns(itemTableColumns())
  ];

  const handleSubmit = (values: any) => {
    // 檢查料號是否重複 (同張調整單, 一個料號只能出現在一個明細)
    const isDuplicate = listData.some(
      (item) => 
        item.inventoryCode === values.inventoryCode && 
        item.lineNumber !== editingItem?.lineNumber
    );

    if (isDuplicate) {
      messageApi.error(`此產品/原料代碼 (${values.inventoryCode}) 已存在於明細中，同張調整單不可重複新增相同的料號`);
      return;
    }

    if (isCreating) {
      createMutation.mutate(values);
    } else if (editingItem) {
      updateMutation.mutate({ lineNumber: editingItem.lineNumber, values });
    }
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingItem(null);
  };

  // If in create or edit mode, show form
  if (isCreating || editingItem) {
    const readonly = !canEdit;
    return (
      <div className={readonly ? "view-mode-form" : ""}>
        <div className="flex justify-between mb-4">
          <h3 className="m-0">
            {isCreating ? '新增明細' : (readonly ? '檢視明細' : '編輯明細')}
          </h3>
          <Space>
            <Button onClick={cancelEdit}>返回清單</Button>
            {!readonly && (
              <Button 
                type="primary" 
                htmlType="submit" 
                form="inventoryAdjustmentItemForm"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                儲存
              </Button>
            )}
          </Space>
        </div>
        <DynamicForm
          formId="inventoryAdjustmentItemForm"
          fields={itemFormConfig(!isCreating)}
          defaultValues={editingItem || { inventoryType: 'P', quantity: 1, unitPrice: 0, targetStorageCode: 'TW-GEN-INV' }}
          onSubmit={handleSubmit}
          hideDefaultFooter
          isViewMode={readonly}
          isUpdateMode={!isCreating && !!editingItem}
        />
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex justify-between items-center mb-4 py-2 px-3" style={{backgroundColor: 'var(--ant-color-fill-alter)', borderRadius: '6px'
      }}>
        <div style={{ color: 'var(--ant-color-text-secondary)' }}>
          目前共有 <span>{listData.length}</span> 筆明細
        </div>
        <div>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={() => setIsCreating(true)}>
              新增明細
            </Button>
          )}
        </div>
      </div>

      <Table
        rowKey={(r: any) => r.lineNumber || Math.random().toString()}
        columns={columns}
        dataSource={listData}
        loading={isFetching}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
