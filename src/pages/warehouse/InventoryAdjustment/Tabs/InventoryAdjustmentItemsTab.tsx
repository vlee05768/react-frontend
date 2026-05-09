import React, { useState } from 'react';
import { Table, Button, Space, App, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
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

interface Props {
  documentNumber: string;
  isMasterViewMode: boolean;
  masterStatus?: string;
  onEditingChange?: (isEditing: boolean) => void;
}

export default function InventoryAdjustmentItemsTab({ documentNumber, isMasterViewMode, masterStatus, onEditingChange }: Props) {
  const { message: messageApi } = App.useApp();
  const queryClient = useQueryClient();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Queries
  const { data, isFetching } = useQuery({
    queryKey: ['inventoryAdjustmentItems', documentNumber],
    queryFn: () => getApiV1InventoryAdjustmentByMovementNumberItems({ path: { movementNumber: documentNumber } }),
    enabled: !!documentNumber,
  });

  const listData: any[] = (data?.data as any)?.data || data?.data || [];
  
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
      messageApi.error(getApiErrorMessage(err, '新增明細失敗'));
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
      messageApi.error(getApiErrorMessage(err, '更新明細失敗'));
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
      messageApi.error(getApiErrorMessage(err, '刪除明細失敗'));
    }
  });

  const canEdit = isMasterViewMode && masterStatus === 'Unconfirmed';

  const columns = [
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="檢視 / 編輯">
            <Button 
              size="small" 
              type="text" 
              icon={canEdit ? <EditOutlined /> : <EyeOutlined />} 
              onClick={() => setEditingItem(record)} 
            />
          </Tooltip>
          {canEdit && (
            <Popconfirm title="確定要刪除？" onConfirm={() => deleteMutation.mutate(record.lineNumber)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
    ...buildTableColumns(itemTableColumns())
  ];

  const handleSubmit = (values: any) => {
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
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
          defaultValues={editingItem || { inventoryType: 'P', quantity: 1, unitPrice: 0 }}
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
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreating(true)}>
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
