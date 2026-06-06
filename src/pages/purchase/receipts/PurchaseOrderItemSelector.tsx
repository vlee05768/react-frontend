import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Modal, Table, Button, Input, Spin, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getApiV1PurchaseOrder } from '@/api/generated';
import { MODAL_PICK_BODY_MAX_HEIGHT, MODAL_WIDTH_PICK } from '@/constants/ui';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';

interface PurchaseOrderItemSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedItems: any[]) => void;
  businessPartnerCode?: string;
  excludedKeys: string[];
}

export default function PurchaseOrderItemSelector({ 
  open, 
  onClose, 
  onConfirm, 
  businessPartnerCode,
  excludedKeys 
}: PurchaseOrderItemSelectorProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const { watch, setValue } = useForm();
  const keyword = watch('keyword');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders-list-supplier', businessPartnerCode],
    queryFn: () => getApiV1PurchaseOrder({ 
      query: { 
        BusinessPartnerCode: businessPartnerCode, 
        Status: 'CONFIRMED' 
      } 
    }),
    enabled: open && !!businessPartnerCode,
  });

  const poItems = useMemo(() => {
    const orders = (data?.data?.data as any)?.data || [];
    if (!Array.isArray(orders)) return [];

    const rawItems: any[] = [];
    orders.forEach((order: any) => {
      const items = order.purchaseOrderItems || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          rawItems.push({
            ...item,
            purchaseOrderNumber: order.code,
          });
        });
      }
    });

    // Filter out already imported/excluded reference numbers by composite key
    let filtered = rawItems.filter((item: any) => {
      const compositeKey = `${item.purchaseOrderNumber}_${item.lineNumber}`;
      return !excludedKeys.includes(compositeKey);
    });

    if (keyword) {
      const lower = keyword.toLowerCase();
      filtered = filtered.filter((item: any) => 
        item.goodsCode?.toLowerCase().includes(lower) || 
        item.goodsName?.toLowerCase().includes(lower) ||
        item.lineNumber?.toLowerCase().includes(lower) ||
        item.purchaseOrderNumber?.toLowerCase().includes(lower)
      );
    }

    return filtered.map((item: any) => {
      const qty = item.quantity || 0;
      const rec = item.receivedQuantity || 0;
      const pending = Math.max(0, qty - rec);
      return {
        ...item,
        pendingQuantity: pending,
        key: `${item.purchaseOrderNumber}_${item.lineNumber}`, // Unique composite key for selection
      };
    });
  }, [data, excludedKeys, keyword]);

  const handleConfirm = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('請至少選擇一項採購項目明細');
      return;
    }

    const selectedItems = selectedRowKeys.map(key => {
      const row = poItems.find((item: any) => item.key === key);
      const pending = row.pendingQuantity || 0;
      
      // Smart Default: default to 1 roll of 1000mm width, length = pending sqm
      // So RollCount(1) * (Width(1000)/1000 * Length(pending)) = pending sqm. Perfect!
      return {
        referenceNumber: row.lineNumber,
        partnerDocumentNumber: row.purchaseOrderNumber, // PO Number on receipt item level
        materialCode: row.goodsCode,
        materialName: row.goodsName,
        unit: row.unit || '卷',
        unitPrice: row.unitPrice || 0,
        rollCount: 1,
        width: 1000,
        length: pending,
        quantity: pending,
        amount: Math.round(pending * (row.unitPrice || 0)),
        targetStorageCode: 'TW-QC-GEN', // Default waiting for IQC storage
        brand: '',
        modelNo: '',
        notes: '',
      };
    });

    onConfirm(selectedItems);
    setSelectedRowKeys([]);
  };

  const handleClose = () => {
    setSelectedRowKeys([]);
    onClose();
  };

  const columns = [
    { title: '採購單號', dataIndex: 'purchaseOrderNumber', width: 140 },
    { title: '採購項次', dataIndex: 'lineNumber', width: 100, align: 'center' as const },
    { title: '原料編碼', dataIndex: 'goodsCode', width: 140 },
    { title: '原料名稱', dataIndex: 'goodsName', width: 200, ellipsis: true },
    { 
      title: '採購量', 
      dataIndex: 'quantity', 
      width: 110, 
      align: 'right' as const,
      render: (v: number) => v != null ? Number(v).toLocaleString('zh-TW') : '0'
    },
    { 
      title: '已收料量', 
      dataIndex: 'receivedQuantity', 
      width: 110, 
      align: 'right' as const,
      render: (v: number) => v != null ? Number(v).toLocaleString('zh-TW') : '0'
    },
    { 
      title: '待收量', 
      dataIndex: 'pendingQuantity', 
      width: 110, 
      align: 'right' as const,
      render: (v: number) => (
        <span className="font-semibold text-[var(--ant-color-warning)]">
          {v != null ? Number(v).toLocaleString('zh-TW') : '0'}
        </span>
      )
    },
    { title: '單位', dataIndex: 'unit', width: 80, align: 'center' as const },
    { 
      title: '採購單價', 
      dataIndex: 'unitPrice', 
      width: 110, 
      align: 'right' as const,
      render: (v: number) => v != null ? Number(v.toFixed(4)).toLocaleString('zh-TW') : '0'
    },
  ];

  return (
    <Modal
      title={
        <div className="font-semibold pb-3 mb-2 text-[18px] border-b border-[var(--ant-color-border-secondary)]">
          挑選採購明細 (供應商: {businessPartnerCode})
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={MODAL_WIDTH_PICK}
      styles={{
        body: {
          maxHeight: MODAL_PICK_BODY_MAX_HEIGHT,
          overflowY: 'auto',
          padding: '16px 24px'
        }
      }}
      footer={
        <div className="pt-4 flex justify-end gap-2 border-t border-[var(--ant-color-border-secondary)]">
          <Button onClick={handleClose}>取消</Button>
          <Button 
            type="primary" 
            onClick={handleConfirm}
            disabled={selectedRowKeys.length === 0}
          >
            加入進貨明細 ({selectedRowKeys.length})
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="請輸入關鍵字搜尋（採購單號、品名、編碼、項次）" 
            value={keyword}
            onChange={(e) => setValue('keyword', e.target.value)}
            allowClear
            prefix={<SearchOutlined />}
            className="flex-1"
          />
          <Button icon={<ClearOutlined />} onClick={() => setValue('keyword', '')}>重置</Button>
        </div>

        <Spin spinning={isLoading}>
          <Table
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys,
              onChange: (keys: any) => setSelectedRowKeys(keys),
            }}
            columns={columns}
            dataSource={poItems}
            rowKey="key"
            pagination={false}
            size="small"
            bordered
            scroll={{ y: 350 }}
          />
        </Spin>
      </div>
    </Modal>
  );
}
