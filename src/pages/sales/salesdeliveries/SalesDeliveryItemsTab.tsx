
import { useState } from 'react';
import { Table, Button, App, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { SalesDeliveryItemDto, CreateSalesDeliveryItemDto } from '@/api/generated/types.gen';
import { 
  deleteApiV1SalesDeliveryByMovementNumberItemsByLineNumber,
  postApiV1SalesDeliveryByMovementNumberItems
} from '@/api/generated/sdk.gen';
import { useMutation } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/utils/apiError';
import UndeliveredOrderItemPicker from './components/UndeliveredOrderItemPicker';

interface Props {
  documentNumber: string;
  customerCode: string;
  items: SalesDeliveryItemDto[];
  isEditing: boolean;
  isConfirmed: boolean;
  onRefresh: () => void;
}

export default function SalesDeliveryItemsTab({ documentNumber, customerCode, items, isEditing, isConfirmed, onRefresh }: Props) {
  const { modal, message } = App.useApp();
  const [showPicker, setShowPicker] = useState(false);

  const canModifyItems = !isEditing && !isConfirmed;

  const deleteMutation = useMutation({
    mutationFn: (lineNumber: string) => deleteApiV1SalesDeliveryByMovementNumberItemsByLineNumber({ path: { movementNumber: documentNumber, lineNumber } }),
    onSuccess: () => {
      message.success('刪除明細成功');
      onRefresh();
    },
    onError: (error) => {
      modal.error({ title: '刪除失敗', content: getApiErrorMessage(error) });
    }
  });

  const addItemsMutation = useMutation({
    mutationFn: async (newItems: CreateSalesDeliveryItemDto[]) => {
      // Create sequentially or Promise.all. We use sequential to avoid potential DB deadlock or sequence issues.
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
      modal.error({ title: '新增失敗', content: getApiErrorMessage(error) });
    }
  });

  const handlePickerConfirm = (selectedItems: CreateSalesDeliveryItemDto[]) => {
    addItemsMutation.mutate(selectedItems);
  };

  const columns: any[] = [
    { title: '項次', dataIndex: 'lineNumber', width: 80 },
    { title: '來源單號', dataIndex: 'referenceNumber', width: 120 },
    { title: '料號', dataIndex: 'inventoryCode', width: 150 },
    { title: '品名', dataIndex: 'inventoryName', width: 150 },
    { title: '數量', dataIndex: 'quantity', width: 100, align: 'right' as const, render: (val: any) => val != null ? Number(val).toLocaleString() : '-' },
    { title: '單價', dataIndex: 'unitPrice', width: 100, align: 'right' as const, render: (val: any) => val != null ? Number(val).toLocaleString() : '-' },
    { title: '金額', dataIndex: 'amount', width: 100, align: 'right' as const, render: (val: any) => val != null ? Number(val).toLocaleString() : '-' },
    { title: '出庫儲位', dataIndex: 'sourceStorageCode', width: 120 },
    { title: '備註', dataIndex: 'notes', ellipsis: true, width: 200 },
  ];

  if (canModifyItems) {
    columns.unshift({
      title: '操作',
      dataIndex: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => modal.confirm({
            title: '確認刪除',
            content: '確定要刪除此明細嗎？',
            onOk: () => deleteMutation.mutate(record.lineNumber!)
          })}
        />
      )
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 p-[8px_12px]" style={{backgroundColor: 'var(--ant-color-fill-alter)', borderRadius: '6px'}}>
        <div style={{ color: 'var(--ant-color-text-secondary)' }}>
          目前共有 <span>{items.length}</span> 筆明細
        </div>
        <div>
          {canModifyItems && (
            <Space>
              <Button type="default" icon={<PlusOutlined />} onClick={() => {
                if (!customerCode) {
                  message.warning('請先選擇客戶');
                  return;
                }
                setShowPicker(true);
              }}>
                挑選未出貨訂單
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('暫未實作')}>
                新增明細
              </Button>
            </Space>
          )}
        </div>
      </div>
      <Table
        virtual
        columns={columns}
        dataSource={items}
        rowKey="lineNumber"
        pagination={false}
        scroll={{ x: 1200, y: 400 }}
        size="small"
        bordered
      />
      <UndeliveredOrderItemPicker
        open={showPicker}
        customerCode={customerCode}
        originalOrderItems={items.map(i => i.referenceNumber).filter(Boolean) as string[]}
        onClose={() => setShowPicker(false)}
        onConfirm={handlePickerConfirm}
      />
    </div>
  );
}
