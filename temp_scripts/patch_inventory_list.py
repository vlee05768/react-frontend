import re

file_path = "src/pages/warehouse/InventoryAdjustment/InventoryAdjustmentList.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Popconfirm import
if "Popconfirm" not in content:
    content = content.replace("Space, Card, Tooltip, Drawer, App, Divider, Modal", "Space, Card, Tooltip, Drawer, App, Divider, Modal, Popconfirm")

# 2. Refactor columns array to use actionColumn
old_columns = """  const columns = [
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'left' as const,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="檢視">
            <Button size="small" type="text" icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={() => openViewDrawer(record)} />
          </Tooltip>
          {record.status === 'Unconfirmed' && (
            <Button 
              size="small" 
              type="text" 
              danger 
              icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
              onClick={() => {
                modal.confirm({
                  title: '確定要刪除？',
                  content: '刪除後將無法還原此單據。',
                  centered: true,
                  width: 400,
                  okButtonProps: { danger: true },
                  onOk: () => deleteMutation.mutateAsync(record.documentNumber)
                });
              }}
            />
          )}
        </Space>
      ),
    },
    ...buildTableColumns(mainTableColumns()),
  ];"""

new_columns = """  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'left' as const,
    width: 120,
    render: (_: any, record: any) => (
      <Space>
        <Tooltip title="檢視">
          <Button 
            type="text" 
            icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
            style={{ color: '#1890ff' }} 
            onClick={() => openViewDrawer(record)}
          />
        </Tooltip>
        {record.status === 'Unconfirmed' && (
          <Tooltip title="刪除">
            <Popconfirm
              title="確定要刪除此筆資料嗎？"
              onConfirm={() => deleteMutation.mutateAsync(record.documentNumber)}
              okText="確定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} />
            </Popconfirm>
          </Tooltip>
        )}
      </Space>
    ),
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn);"""

content = content.replace(old_columns, new_columns)

# 3. Refactor <Table> component styling
old_table = """          <Table
            rowKey={(r: any) => r.documentNumber || r.id}
            columns={columns}
            dataSource={listData}
            loading={isFetching}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: currentPage,
              pageSize: currentPageSize,
              total: totalRecords,
              showSizeChanger: true,
              onChange: (page, pageSize) => setParams({ pageNumber: page, pageSize }),
            }}
            size="small"
          />"""

new_table = """          <style>{`
            .selected-table-row > td {
              background-color: #e6f4ff !important;
            }
          `}</style>
          <Table
            bordered
            rowClassName={(record: any) => record.documentNumber === viewId ? 'selected-table-row' : ''}
            style={{ flex: 1 }}
            rowKey={(r: any) => r.documentNumber || r.id}
            columns={columns}
            dataSource={listData}
            loading={isFetching}
            scroll={{ x: 'max-content', y: 300 }}
            pagination={{
              current: currentPage,
              pageSize: currentPageSize,
              total: totalRecords,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 筆資料`,
              onChange: (page, pageSize) => setParams({ pageNumber: page, pageSize }),
            }}
          />"""

content = content.replace(old_table, new_table)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

