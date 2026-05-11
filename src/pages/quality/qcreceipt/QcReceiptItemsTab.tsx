import { useState, useEffect } from 'react';
import { Button, Modal, Table, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiV1QcReceiptByMovementNumberItems, deleteApiV1QcReceiptByMovementNumberItemsByReferenceNumber, postApiV1QcReceiptByMovementNumberItems } from '@/api/generated';
import { getApiErrorMessage } from '@/utils/apiError';
import QcProductionReceiptSelector from './QcProductionReceiptSelector';

interface QcReceiptItemsTabProps {
  documentNumber: string;
  isLocked: boolean;
  receiptData?: any;
}

export default function QcReceiptItemsTab({ documentNumber, isLocked, receiptData }: QcReceiptItemsTabProps) {
  const queryClient = useQueryClient();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['qcReceiptItems', documentNumber],
    queryFn: () => getApiV1QcReceiptByMovementNumberItems({ path: { movementNumber: documentNumber } }),
    enabled: !!documentNumber && documentNumber !== 'create',
  });

  const list = data?.data?.data?.data || data?.data?.data || [];

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
      width: 60,
      align: 'center' as const,
      fixed: 'left' as const,
      render: (_: any, record: any) => {
        if (isLocked) return null;
        return (
          <Popconfirm title="確定要刪除嗎？" onConfirm={() => deleteMutation.mutate(record.referenceNumber)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        );
      }
    },
    { title: '產品入庫單號', dataIndex: 'referenceNumber', width: 150 },
    { title: '料號', dataIndex: 'inventoryCode', width: 130 },
    { title: '品名', dataIndex: 'inventoryName', width: 140 },
    { title: '來源儲位', dataIndex: 'sourceStorageCode', width: 120 },
    { title: '本次QC量', dataIndex: 'drawnQuantity', width: 100, align: 'right' as const },
    { title: '良品倉', dataIndex: 'goodTargetStorageCode', width: 120 },
    { title: '良品量', dataIndex: 'goodQuantity', width: 100, align: 'right' as const },
    { title: '報廢倉', dataIndex: 'scrapTargetStorageCode', width: 120 },
    { title: '報廢量', dataIndex: 'scrapQuantity', width: 100, align: 'right' as const },
    { title: '備註', dataIndex: 'notes', width: 200, ellipsis: true },
  ];

  if (isLocked && columns[0].key === 'actions') {
    columns.shift();
  }

  const existingReferenceNumbers = list.map((item: any) => item.referenceNumber);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="font-semibold text-lg border-l-4 border-blue-500 pl-2">檢驗明細</div>
        {!isLocked && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsSelectorOpen(true)}>
            挑選未 QC 產品
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={list}
        rowKey="referenceNumber"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 1200 }}
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
