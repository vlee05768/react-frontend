import { useState } from 'react';
import { Button, Input, Space, Popconfirm, message, Typography, Drawer, Table, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  postApiV1GeneralTypes, 
  putApiV1GeneralTypesById, 
  deleteApiV1GeneralTypesById,
  getApiV1GeneralTypesGetTypes
} from '@/api/generated/sdk.gen';
import { categoryFormConfig, categoryTableColumns } from './GeneralTypeConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';

interface CategoryListProps {
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
}

export default function CategoryList({ selectedCode, onSelect }: CategoryListProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Query
  const { data, isFetching } = useQuery({
    queryKey: ['generalTypes', 'ERPSystem'],
    queryFn: () => getApiV1GeneralTypesGetTypes({ query: { types: ['ERPSystem'] } }),
  });

  const apiResponse = (data?.data as any) || {};
  const dictData = apiResponse.data || {};
  const arrayData = Array.isArray(dictData) ? dictData : (dictData['ERPSystem'] || []);

  // Filter local search
  const filteredData = arrayData.filter((item: any) => 
    item.code?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.desc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1GeneralTypes({ body: { ...values, type: 'ERPSystem' } }),
    onSuccess: () => {
      message.success('新增類別成功');
      setIsDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['generalTypes', 'ERPSystem'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string, values: any }) => putApiV1GeneralTypesById({ path: { id: id as any }, body: { ...values, type: 'ERPSystem' } }),
    onSuccess: () => {
      message.success('更新類別成功');
      setIsDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['generalTypes', 'ERPSystem'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiV1GeneralTypesById({ path: { id: id as any } }),
    onSuccess: (_, deletedId) => {
      message.success('刪除類別成功');
      // If deleted is currently selected, clear selection
      const deletedItem = arrayData.find((d: any) => d.id === deletedId);
      if (deletedItem && deletedItem.code === selectedCode) {
        onSelect(null);
      }
      queryClient.invalidateQueries({ queryKey: ['generalTypes', 'ERPSystem'] });
    }
  });

  const handleAdd = () => {
    setEditingItem(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsDrawerOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    deleteMutation.mutate(item.id);
  };

  const handleSubmit = (values: any) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const baseCols = buildTableColumns(categoryTableColumns());
  const columns = [
    ...baseCols.map(col => {
      if (col.key === 'code') {
        return {
          ...col,
          render: (text: string, record: any) => (
            <span style={{ fontWeight: selectedCode === record.code ? 600 : 400 }}>
              {text}
            </span>
          )
        };
      }
      return col;
    }),
    {
      title: '操作',
      key: 'action',
      width: '20%',
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="編輯">
            <Button type="text" icon={<EditOutlined />} size="small" onClick={(e) => handleEdit(e, record)} />
          </Tooltip>
          <Tooltip title="刪除">
            <Popconfirm
              title="確定要刪除此類別？"
              description="這將會影響關聯資料"
              onConfirm={(e) => handleDelete(e as any, record)}
              onCancel={(e) => e?.stopPropagation()}
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)' }}>
        <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>類別清單</Typography.Title>
        <Space style={{ width: '100%' }}>
          <Input 
            placeholder="搜尋類別" 
            prefix={<SearchOutlined />} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增類別
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Table
          size="small"
          loading={isFetching}
          dataSource={filteredData}
          columns={columns}
          rowKey={(record) => record.id || record.code}
          pagination={false}
          scroll={{ y: 'calc(100vh - 230px)' }} // Roughly account for header heights
          onRow={(record) => ({
            onClick: () => onSelect(record.code),
            style: {
              cursor: 'pointer',
              backgroundColor: selectedCode === record.code ? 'var(--ant-color-primary-bg)' : undefined,
              transition: 'background-color 0.2s',
            }
          })}
          rowClassName={(record) => selectedCode === record.code ? 'category-list-row-selected' : ''}
        />
      </div>

      <Drawer
        title={
          <DrawerTitle
            moduleName="類別"
            isCreate={!editingItem}
            isEdit={!!editingItem}
            record={editingItem}
            displayField={(record) => `${record.code || ''} - ${record.name || ''}`.replace(/^ - | - $/g, '')}
          />
        }
        size="default"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            <Button 
              type="primary" 
              htmlType="submit"
              form="categoryForm"
              icon={<SaveOutlined />} 
              loading={createMutation.isPending || updateMutation.isPending}
            >
              儲存
            </Button>
            <Button onClick={() => setIsDrawerOpen(false)}>取消</Button>
          </Space>
        }
      >
        <DynamicForm
          defaultValues={editingItem ? editingItem : { type: 'ERPSystem' }}
          fields={categoryFormConfig()}
          onSubmit={handleSubmit}
          isUpdateMode={!!editingItem}
          isViewMode={false}
          hideDefaultFooter={true}
          formId="categoryForm"
        />
      </Drawer>
      <style>{`
        .category-list-row-selected > td {
          background-color: var(--ant-color-primary-bg) !important;
        }
        /* Hide hover effect override on selected row to keep it clearly selected */
        .ant-table-wrapper .ant-table-tbody > tr.category-list-row-selected:hover > td {
          background-color: var(--ant-color-primary-bg) !important;
        }
      `}</style>
    </div>
  );
}
