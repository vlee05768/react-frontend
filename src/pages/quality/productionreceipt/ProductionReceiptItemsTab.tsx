import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface ProductionReceiptItem {
  lineNumber: number;
  serialNumber?: string;
  inventoryType?: string;
  referenceNumber?: string;
  inventoryCode?: string;
  inventoryName?: string;
  quantity?: number;
  reversalQuantity?: number;
  targetStorageCode?: string;
  notes?: string;
}

interface Props {
  items: ProductionReceiptItem[];
}

export default function ProductionReceiptItemsTab({ items }: Props) {
  const inventoryTypeConfig: Record<string, { label: string; color: string }> = {
    Material: { label: '原料', color: 'default' },
    Product: { label: '產品', color: 'success' },
    SemiFinished: { label: '半成品', color: 'warning' },
  };

  const columns: ColumnsType<ProductionReceiptItem> = [
    {
      title: '序號',
      dataIndex: 'lineNumber',
      width: 80,
      align: 'center',
      render: (val: number) => val || '-',
    },
    {
      title: '存貨類型',
      dataIndex: 'inventoryType',
      width: 90,
      align: 'center',
      render: (val: string) => {
        const config = inventoryTypeConfig[val];
        return config ? <Tag color={config.color} className="m-0">{config.label}</Tag> : (val || '-');
      },
    },
    {
      title: '製令單號',
      dataIndex: 'referenceNumber',
      width: 130,
      render: (val: string) => <span className="font-mono text-xs">{val || '-'}</span>,
    },
    {
      title: '料號',
      dataIndex: 'inventoryCode',
      width: 140,
      render: (val: string) => <span className="font-mono text-xs">{val || '-'}</span>,
    },
    {
      title: '品名',
      dataIndex: 'inventoryName',
      ellipsis: true,
      minWidth: 160,
      render: (val: string) => val || '-',
    },
    {
      title: '入庫數量',
      dataIndex: 'quantity',
      width: 100,
      align: 'right',
      render: (val: number) => <span className="font-medium">{val?.toLocaleString('zh-TW') ?? 0}</span>,
    },
    {
      title: 'QC完成',
      dataIndex: 'reversalQuantity',
      width: 100,
      align: 'right',
      render: (val: number, record: ProductionReceiptItem) => {
        const qc = val ?? 0;
        const total = record.quantity ?? 0;
        const isComplete = total > 0 && qc >= total;
        return (
          <span className={`font-medium ${isComplete ? 'text-green-600' : ''}`}>
            {qc.toLocaleString('zh-TW')}
          </span>
        );
      },
    },
    {
      title: '儲位',
      dataIndex: 'targetStorageCode',
      width: 110,
      align: 'center',
      render: (val: string) => val ? <Tag color="blue" className="m-0">{val}</Tag> : '-',
    },
    {
      title: '備註',
      dataIndex: 'notes',
      ellipsis: true,
      minWidth: 140,
      render: (val: string) => val || '-',
    },
  ];

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
          目前共有 <span style={{ fontWeight: 500 }}>{items.length}</span> 筆明細
        </div>
      </div>
      
      <Table
        columns={columns}
        dataSource={items}
        rowKey={(record) => record.lineNumber?.toString() || Math.random().toString()}
        pagination={false}
        size="small"
        scroll={{ x: 1000 }}
        bordered
      />
    </div>
  );
}
