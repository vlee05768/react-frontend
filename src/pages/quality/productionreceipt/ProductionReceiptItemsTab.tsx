import { useState } from 'react';
import { Table, Button, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { buildTableColumns } from '@/utils/tableUtils';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { itemTableColumns, itemFormConfig } from './ProductionReceiptConfig';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';

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
  const [editingItem, setEditingItem] = useState<any>(null);

  const columns = [
    {
      title: '操作',
      key: 'actions',
      width: 60,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Tooltip title="檢視明細">
          <Button 
            size="small" 
            type="text" 
            icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
            onClick={() => setEditingItem(record)} 
          />
        </Tooltip>
      ),
    },
    ...buildTableColumns(itemTableColumns())
  ];

  if (editingItem) {
    return (
      <div className="view-mode-form">
        <div className="flex justify-between mb-4">
          <h3 className="m-0">檢視明細</h3>
          <Button onClick={() => setEditingItem(null)}>返回清單</Button>
        </div>
        <DynamicForm
          formId="productionReceiptItemForm"
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

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4 p-[8px 12px]" style={{backgroundColor: 'var(--ant-color-fill-alter)', borderRadius: '6px'
      }}>
        <div style={{ color: 'var(--ant-color-text-secondary)' }}>
          目前共有 <span className="font-medium">{items.length}</span> 筆明細
        </div>
      </div>
      
      <Table
        columns={columns as any}
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
