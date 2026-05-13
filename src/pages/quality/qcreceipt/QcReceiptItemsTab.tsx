import { Popconfirm } from 'antd';
import { useState } from 'react';
import { Button, Table, message, Tooltip  } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiV1QcReceiptByMovementNumberItems, deleteApiV1QcReceiptByMovementNumberItemsByReferenceNumber, postApiV1QcReceiptByMovementNumberItems } from '@/api/generated';
import { getApiErrorMessage } from '@/utils/apiError';
import QcProductionReceiptSelector from './QcProductionReceiptSelector';
import { buildTableColumns } from '@/utils/tableUtils';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { itemTableColumns, itemFormConfig } from './QcReceiptConfig';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';

interface QcReceiptItemsTabProps {
  documentNumber: string;
  isLocked: boolean;
  receiptData?: any;
}

export default function QcReceiptItemsTab({ documentNumber, isLocked }: QcReceiptItemsTabProps) {
  // const { modal } = App.useApp();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['qcReceiptItems', documentNumber],
    queryFn: () => getApiV1QcReceiptByMovementNumberItems({ path: { movementNumber: documentNumber } }),
    enabled: !!documentNumber && documentNumber !== 'create',
  });

  const list = (data?.data?.data as any)?.data || (data?.data?.data as any) || [];

  const deleteMutation = useMutation({
    mutationFn: (referenceNumber: string) => 
      deleteApiV1QcReceiptByMovementNumberItemsByReferenceNumber({ path: { movementNumber: documentNumber, referenceNumber } }),
    onSuccess: () => {
      message.success('明細刪除成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceiptItems', documentNumber] });
    },
    onError: (err) => message.error(getApiErrorMessage(err, '明細刪除失敗')),
  });

  const addMutation = useMutation({
    mutationFn: (body: any) => 
      postApiV1QcReceiptByMovementNumberItems({ path: { movementNumber: documentNumber }, body }),
    onSuccess: () => {
      message.success('明細新增成功');
      queryClient.invalidateQueries({ queryKey: ['qcReceiptItems', documentNumber] });
    },
    onError: (err) => message.error(getApiErrorMessage(err, '明細新增失敗')),
  });

  const handleImport = async (selectedItems: any[]) => {
    try {
      for (const item of selectedItems) {
        const remainingQuantity = item.quantity - item.batchQuantity;
        const payload = {
          inventoryType: item.inventoryType,
          inventoryCode: item.inventoryCode,
          inventoryName: item.inventoryName,
          referenceNumber: item.lineNumber,
          drawnQuantity: item.batchQuantity,
          goodQuantity: item.goodQuantity,
          scrapQuantity: item.scrapQuantity,
          sourceStorageCode: item.targetStorageCode,
          goodTargetStorageCode: 'TW-GEN-INV',
          scrapTargetStorageCode: 'TW-GEN-SCRAP',
          notes: remainingQuantity !== 0 ? `待檢驗 (${remainingQuantity})` : '全部檢驗完成',
        };
        await addMutation.mutateAsync(payload);
      }
      setIsSelectorOpen(false);
    } catch (e) {
      // errors handled by mutation
    }
  };

  const columns = [
    {
      title: '操作',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      fixed: 'left' as const,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Tooltip title="檢視明細">
            <Button 
              size="small" 
              type="text" 
              icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
              onClick={() => setEditingItem(record)} 
            />
          </Tooltip>
          {!isLocked && (
            <Popconfirm
            title="刪除確認"
            description="確定要刪除此筆資料嗎？此操作無法還原。"
            onConfirm={() => deleteMutation.mutate(record.referenceNumber)}
            onOpenChange={(open) => {
              const r = record as any;
              const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
              if (typeof setDeletingRecordId !== 'undefined') setDeletingRecordId(open ? String(recordId) : null);
            }}
            okButtonProps={{ danger: true }}
            okText="刪除"
            cancelText="取消"
            placement="topLeft"
          >
            <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} />
          </Popconfirm>
          )}
        </div>
      )
    },
    ...buildTableColumns(itemTableColumns())
  ];

  if (editingItem) {
    return (
      <div className="view-mode-form">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>檢視明細</h3>
          <Button onClick={() => setEditingItem(null)}>返回清單</Button>
        </div>
        <DynamicForm
          formId="qcReceiptItemForm"
          fields={itemFormConfig() as any}
          defaultValues={editingItem}
          onSubmit={() => {}}
          hideDefaultFooter
          isViewMode={true}
          isUpdateMode={false}
        />
      </div>
    );
  }

  const existingReferenceNumbers = list.map((item: any) => item.referenceNumber);

  return (
    <div className="p-4">
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
          目前共有 <span style={{ fontWeight: 500 }}>{list.length}</span> 筆明細
        </div>
        <div>
          {!isLocked && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsSelectorOpen(true)}>
              挑選未 QC 產品
            </Button>
          )}
        </div>
      </div>

      <Table
            rowClassName={(record) => {
              const r = record as any; const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
              return recordId && String(recordId) === String(deletingRecordId) ? 'deleting-row-highlight' : '';
            }}
        columns={columns as any}
        dataSource={list}
        rowKey="referenceNumber"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 'max-content' }}
        bordered
        size="small"
      />

      <QcProductionReceiptSelector
        open={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onConfirm={handleImport}
        excludedReferenceNumbers={existingReferenceNumbers}
      />
    </div>
  );
}
