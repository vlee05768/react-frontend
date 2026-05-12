import { useState, useMemo } from 'react';
import { Modal, Table, Button, Form, Input, InputNumber } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getApiV1QcReceiptUnprocessedProductionReceipts } from '@/api/generated';
import { MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_LARGE } from '@/constants/ui';

interface QcProductionReceiptSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: any[]) => void;
  excludedReferenceNumbers: string[];
}

export default function QcProductionReceiptSelector({ open, onClose, onConfirm, excludedReferenceNumbers }: QcProductionReceiptSelectorProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [editableData, setEditableData] = useState<Record<string, any>>({});
  
  const [form] = Form.useForm();
  const keyword = Form.useWatch('keyword', form);

  const { data, isLoading } = useQuery({
    queryKey: ['unprocessedProductionReceipts'],
    queryFn: () => getApiV1QcReceiptUnprocessedProductionReceipts(),
    enabled: open,
  });

  const list = useMemo(() => {
    let rawList = data?.data?.data || data?.data || [];
    if (!Array.isArray(rawList)) rawList = [];
    
    // Filter excluded
    let filtered = rawList.filter((item: any) => !excludedReferenceNumbers.includes(item.lineNumber));
    
    // Filter by keyword
    if (keyword) {
      const lower = keyword.toLowerCase();
      filtered = filtered.filter((item: any) => 
        item.inventoryCode?.toLowerCase().includes(lower) || 
        item.inventoryName?.toLowerCase().includes(lower) ||
        item.lineNumber?.toLowerCase().includes(lower)
      );
    }

    // Map to include default values
    return filtered.map((item: any) => ({
      ...item,
      batchQuantity: item.quantity,
      goodQuantity: item.quantity,
      scrapQuantity: 0
    }));
  }, [data, excludedReferenceNumbers, keyword]);

  const handleRowChange = (lineNumber: string, field: string, value: any) => {
    setEditableData((prev) => {
      const rowData = prev[lineNumber] || list.find((item: any) => item.lineNumber === lineNumber);
      const newData = { ...rowData, [field]: value };
      
      // Auto logic
      if (field === 'batchQuantity' || field === 'scrapQuantity') {
        const batch = newData.batchQuantity || 0;
        const scrap = newData.scrapQuantity || 0;
        newData.goodQuantity = Math.max(0, batch - scrap);
      }
      return { ...prev, [lineNumber]: newData };
    });
  };

  const handleConfirm = () => {
    const selectedItems = selectedRowKeys.map(key => {
      return editableData[key] || list.find((item: any) => item.lineNumber === key);
    });
    
    onConfirm(selectedItems);
    setSelectedRowKeys([]);
    setEditableData({});
  };

  const handleClose = () => {
    setSelectedRowKeys([]);
    setEditableData({});
    onClose();
  };

  const columns = [
    { title: '產品入庫單號', dataIndex: 'lineNumber', width: 150 },
    { title: '料號', dataIndex: 'inventoryCode', width: 130 },
    { title: '品名', dataIndex: 'inventoryName', width: 150 },
    { title: '待檢驗數量', dataIndex: 'quantity', width: 100, align: 'right' as const },
    { 
      title: '本次檢驗量', 
      dataIndex: 'batchQuantity', 
      width: 120,
      render: (_: any, record: any) => {
        const val = editableData[record.lineNumber]?.batchQuantity ?? record.batchQuantity;
        return (
          <InputNumber 
            min={1} 
            max={record.quantity} 
            value={val} 
            onChange={(v) => handleRowChange(record.lineNumber, 'batchQuantity', v)}
            className="w-full"
          />
        );
      }
    },
    { 
      title: '報廢量', 
      dataIndex: 'scrapQuantity', 
      width: 120,
      render: (_: any, record: any) => {
        const val = editableData[record.lineNumber]?.scrapQuantity ?? record.scrapQuantity;
        return (
          <InputNumber 
            min={0} 
            value={val} 
            onChange={(v) => handleRowChange(record.lineNumber, 'scrapQuantity', v)}
            className="w-full"
          />
        );
      }
    },
    { 
      title: '良品量', 
      dataIndex: 'goodQuantity', 
      width: 100,
      align: 'right' as const,
      render: (_: any, record: any) => {
        return editableData[record.lineNumber]?.goodQuantity ?? record.goodQuantity;
      }
    },
  ];

  return (
    <Modal
      title="挑選待QC產品"
      open={open}
      onCancel={handleClose}
      width={MODAL_WIDTH_LARGE}
      styles={{ body: { maxHeight: MODAL_BODY_MAX_HEIGHT, overflowY: 'auto' } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>取消</Button>
          <Button type="primary" disabled={selectedRowKeys.length === 0} onClick={handleConfirm}>
            確認選擇
          </Button>
        </div>
      }
    >
      <Form form={form} layout="inline" className="mb-4">
        <Form.Item name="keyword" label="關鍵字搜尋">
          <Input placeholder="料號/品名/單號" allowClear className="w-64" />
        </Form.Item>
      </Form>

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
        columns={columns}
        dataSource={list}
        rowKey="lineNumber"
        loading={isLoading}
        pagination={false}
        scroll={{ y: 400 }}
      />
    </Modal>
  );
}
