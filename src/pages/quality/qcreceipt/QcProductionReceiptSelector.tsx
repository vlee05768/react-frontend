import { useState, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Modal, Table, Button, Form, Input, InputNumber, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getApiV1QcReceiptUnprocessedProductionReceipts } from '@/api/generated';
import { MODAL_PICK_BODY_MAX_HEIGHT, MODAL_WIDTH_PICK } from '@/constants/ui';

interface QcProductionReceiptSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: any[]) => void;
  excludedReferenceNumbers: string[];
}

export default function QcProductionReceiptSelector({ open, onClose, onConfirm, excludedReferenceNumbers }: QcProductionReceiptSelectorProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [editableData, setEditableData] = useState<Record<string, any>>({});
  
  const goodInputRefs = useRef<Map<string, any>>(new Map());

  const { control, watch } = useForm();
  const keyword = watch('keyword');

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
    return filtered.map((item: any) => {
      const unQcQty = (item.quantity || 0) - (item.reversalQuantity || 0);
      return {
        ...item,
        unQcQuantity: unQcQty,
        batchQuantity: unQcQty, // 1. 本次QC量預設 = 未QC量
        goodQuantity: unQcQty,  // 預設良品全滿, 所以報廢為0
        scrapQuantity: 0
      };
    });
  }, [data, excludedReferenceNumbers, keyword]);

  const handleRowChange = (lineNumber: string, field: string, value: any) => {
    setEditableData((prev) => {
      const rowData = prev[lineNumber] || list.find((item: any) => item.lineNumber === lineNumber);
      const newData = { ...rowData, [field]: value };
      
      // Auto logic: 2. 本次QC量 - 良品量 = 報廢量
      if (field === 'batchQuantity' || field === 'goodQuantity') {
        const batch = newData.batchQuantity || 0;
        let good = newData.goodQuantity || 0;
        
        // Prevent goodQuantity from exceeding batchQuantity
        if (good > batch) {
          good = batch;
          newData.goodQuantity = good;
        }

        newData.scrapQuantity = Math.max(0, batch - good);
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
    { title: '對應單據項次', dataIndex: 'lineNumber', width: 180 },
    { title: '料號', dataIndex: 'inventoryCode', width: 130 },
    { title: '品名', dataIndex: 'inventoryName', width: 150, ellipsis: true },
    { title: '所在儲位', dataIndex: 'targetStorageCode', width: 100, align: 'center' as const, render: (v: string) => v ? <Tag color="blue" className="m-0">{v}</Tag> : '-' },
    { 
      title: '原始入庫量', 
      dataIndex: 'quantity', 
      width: 100, 
      align: 'right' as const,
      render: (val: number) => val != null ? Number(val).toLocaleString('zh-TW') : '0'
    },
    { 
      title: '未QC量', 
      dataIndex: 'unQcQuantity', 
      width: 100, 
      align: 'right' as const,
      render: (val: number) => val != null ? Number(val).toLocaleString('zh-TW') : '0'
    },
    { 
      title: '本次QC量', 
      dataIndex: 'batchQuantity', 
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const val = editableData[record.lineNumber]?.batchQuantity ?? record.batchQuantity;
        const unQc = record.unQcQuantity || 0;
        const isSelected = selectedRowKeys.includes(record.lineNumber);
        return (
          <InputNumber 
            min={1} // 最小為1
            max={unQc} // 最大等於未QC量
            value={val} 
            onChange={(v) => handleRowChange(record.lineNumber, 'batchQuantity', v)}
            onFocus={(e) => e.target.select()}
            className="qc-qty-warning w-full"
            disabled={!isSelected} // 有勾選的才能輸入
          />
        );
      }
    },
    { 
      title: '良品量', 
      dataIndex: 'goodQuantity', 
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const val = editableData[record.lineNumber]?.goodQuantity ?? record.goodQuantity;
        const batch = editableData[record.lineNumber]?.batchQuantity ?? record.batchQuantity;
        const isSelected = selectedRowKeys.includes(record.lineNumber);
        return (
          <InputNumber 
            ref={(el) => {
              if (el) goodInputRefs.current.set(record.lineNumber, el);
              else goodInputRefs.current.delete(record.lineNumber);
            }}
            min={0} 
            max={batch}
            value={val} 
            onChange={(v) => handleRowChange(record.lineNumber, 'goodQuantity', v)}
            onFocus={(e) => e.target.select()}
            className="qc-qty-success w-full"
            disabled={!isSelected} // 有勾選的才能輸入
          />
        );
      }
    },
    { title: '良品倉', dataIndex: 'goodTargetStorageCode', width: 120, align: 'center' as const, render: () => 'TW-GEN-INV' },
    { 
      title: '報廢量', 
      dataIndex: 'scrapQuantity', 
      width: 100,
      align: 'right' as const,
      render: (_: any, record: any) => {
        const val = editableData[record.lineNumber]?.scrapQuantity ?? record.scrapQuantity ?? 0;
        return <span style={{ color: 'var(--ant-color-error)' }}>{Number(val).toLocaleString('zh-TW')}</span>;
      }
    },
    { title: '報廢倉', dataIndex: 'scrapTargetStorageCode', width: 130, align: 'center' as const, render: () => 'TW-GEN-SCRAP' },
  ];

  return (
    <Modal
      title="挑選待QC產品"
      open={open}
      onCancel={handleClose}
      width={MODAL_WIDTH_PICK}
      styles={{ body: { maxHeight: MODAL_PICK_BODY_MAX_HEIGHT, overflowY: 'auto' } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>取消</Button>
          <Button type="primary" disabled={selectedRowKeys.length === 0} onClick={handleConfirm}>
            確認選擇 ({selectedRowKeys.length})
          </Button>
        </div>
      }
    >
      <Form layout="inline" className="mb-4">
        <Form.Item label="關鍵字搜尋">
          <Controller name="keyword" control={control} render={({field}) => (
            <Input 
              {...field}
              placeholder="料號/品名/單號" 
              allowClear 
              className="w-64" 
              onFocus={(e) => e.target.select()}
            />
          )} />
        </Form.Item>
      </Form>

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
          onSelect: (record, selected) => {
            if (selected) {
              setTimeout(() => {
                const input = goodInputRefs.current.get(record.lineNumber);
                if (input) {
                  // Focus 並選取全部文字
                  input.focus({ cursor: 'all' });
                  // Fallback for full selection in case older AntD versions
                  if (typeof input.select === 'function') {
                    input.select();
                  } else if (input.nativeElement && typeof input.nativeElement.select === 'function') {
                    input.nativeElement.select();
                  }
                }
              }, 50); // Delay ensures the input renders as enabled before focusing
            }
          }
        }}
        columns={columns}
        dataSource={list}
        rowKey="lineNumber"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 'max-content', y: `calc(${MODAL_PICK_BODY_MAX_HEIGHT} - 150px)` }} // 1. 欄位總長太長要有水平捲軸
        size="small"
      />
    </Modal>
  );
}
