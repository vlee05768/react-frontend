import re

file_path = "src/pages/quality/productionreceipt/ProductionReceiptsList.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
if "mainTableColumns" not in content:
    content = content.replace(
        "import { productionReceiptSearchConfig, getStatusTagProps } from './ProductionReceiptConfig';",
        "import { productionReceiptSearchConfig, getStatusTagProps, mainTableColumns } from './ProductionReceiptConfig';\nimport { buildTableColumns } from '@/utils/tableUtils';\nimport { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';\nimport { Tooltip, Popconfirm, Space } from 'antd';"
    )

# Fix row highlighting param
content = content.replace("export default function ProductionReceiptsList() {", "import { useParams } from 'react-router-dom';\n\nexport default function ProductionReceiptsList() {\n  const { id: viewId } = useParams<{ id: string }>();")

# Replace inline columns with actionColumn
old_columns_start = "const columns = ["
old_columns_end = "];"

start_idx = content.find(old_columns_start)
end_idx = content.find(old_columns_end, start_idx) + len(old_columns_end)

old_columns = content[start_idx:end_idx]

new_columns = """const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'left' as const,
    width: 150,
    render: (_: any, record: any) => {
      const isUnconfirmed = record.status === 'Unconfirmed';
      const isConfirmed = record.status === 'Confirmed';
      return (
        <Space>
          <Tooltip title="檢視">
            <Button 
              type="text" 
              icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
              style={{ color: '#1890ff' }} 
              onClick={() => navigate(`/production-quality/production-receipts/${record.documentNumber}`)} 
            />
          </Tooltip>
          {isUnconfirmed && (
            <Tooltip title="確認">
              <Popconfirm
                title="確定要確認此單據嗎？"
                onConfirm={() => confirmMutation.mutate(record.documentNumber)}
                okText="確定"
                cancelText="取消"
              >
                <Button size="small" type="primary" className="text-[12px] h-6">確認</Button>
              </Popconfirm>
            </Tooltip>
          )}
          {isConfirmed && (
            <Tooltip title="取消確認">
              <Popconfirm
                title="確定要取消確認嗎？"
                onConfirm={() => cancelConfirmMutation.mutate(record.documentNumber)}
                okText="確定"
                cancelText="取消"
              >
                <Button size="small" danger className="text-[12px] h-6">取消</Button>
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      );
    },
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn);"""

content = content.replace(old_columns, new_columns)

# Fix Table Component
old_table_pattern = r"<Table[\s\S]*?/>"
old_table = re.search(old_table_pattern, content).group(0)

new_table = """<style>{`
            .selected-table-row > td {
              background-color: #e6f4ff !important;
            }
          `}</style>
          <Table
            bordered
            rowClassName={(record: any) => record.documentNumber === viewId ? 'selected-table-row' : ''}
            style={{ flex: 1 }}
            columns={columns}
            dataSource={displayList}
            rowKey="documentNumber"
            loading={isLoading}
            scroll={{ x: 'max-content', y: 300 }}
            pagination={{
              current: params.pageNumber,
              pageSize: params.pageSize,
              total: total,
              showSizeChanger: true,
              showTotal: (t) => `共 ${t} 筆資料`,
              onChange: (page, pageSize) => setParams({ pageNumber: page, pageSize }),
            }}
          />"""

content = content.replace(old_table, new_table)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

