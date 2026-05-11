import { useState, useMemo } from 'react';
import { Table, Button, Space, Popconfirm, message, Typography, Drawer, Empty, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  postApiV1GeneralTypes, 
  putApiV1GeneralTypesById, 
  deleteApiV1GeneralTypesById,
  getApiV1GeneralTypesGetTypes
} from '@/api/generated/sdk.gen';
import { itemFormConfig, itemTableColumns } from './GeneralTypeConfig';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { buildTableColumns } from '@/utils/tableUtils';
import { DRAWER_WIDTH_DETAIL } from '@/constants';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';


interface CategoryItemListProps {
  selectedCode: string | null;
}

export default function CategoryItemList({ selectedCode }: CategoryItemListProps) {
  const queryClient = useQueryClient();
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Query
  const { data, isFetching } = useQuery({
    queryKey: ['generalTypes', selectedCode],
    queryFn: () => getApiV1GeneralTypesGetTypes({ 
      query: { 
        types: [selectedCode as string]
      } 
    }),
    enabled: !!selectedCode, // Only fetch if a category is selected
  });

  const apiResponse = (data?.data as any) || {};
  const dictData = apiResponse.data || {};
  const listDataRaw = Array.isArray(dictData) ? dictData : (dictData[selectedCode as string] || []);
  const listData = Array.isArray(listDataRaw) ? listDataRaw : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1GeneralTypes({ body: { ...values, type: selectedCode } }),
    onSuccess: () => {
      message.success('新增項目成功');
      setIsDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['generalTypes', selectedCode] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string, values: any }) => putApiV1GeneralTypesById({ path: { id: id as any }, body: { ...values, type: selectedCode } }),
    onSuccess: () => {
      message.success('更新項目成功');
      setIsDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['generalTypes', selectedCode] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiV1GeneralTypesById({ path: { id: id as any } }),
    onSuccess: () => {
      message.success('刪除項目成功');
      queryClient.invalidateQueries({ queryKey: ['generalTypes', selectedCode] });
    }
  });

  const handleAdd = () => {
    setEditingItem(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsDrawerOpen(true);
  };

  const handleDelete = (item: any) => {
    deleteMutation.mutate(item.id);
  };

  const handleSubmit = (values: any) => {
    // 預設將 undefined 轉 null，避免後端報錯，或保持原樣
    const finalValues = { ...values };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, values: finalValues });
    } else {
      createMutation.mutate(finalValues);
    }
  };

  const columns = useMemo(() => {
    const baseCols = buildTableColumns(itemTableColumns());
    return [
      ...baseCols,
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 120,
        render: (_: any, record: any) => (
          <Space size="middle">
            <Tooltip title="編輯">
              <Button type="text" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={() => handleEdit(record)} />
            </Tooltip>
            <Tooltip title="刪除">
              <Popconfirm
                title="確定要刪除？"
                onConfirm={() => handleDelete(record)}
              >
                <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} />
              </Popconfirm>
            </Tooltip>
          </Space>
        ),
      }
    ];
  }, [itemTableColumns]);

  if (!selectedCode) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="請從左側選擇一個類別" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {selectedCode} 項目清單
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={handleAdd}>
          新增項目
        </Button>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <Table
          loading={isFetching}
          dataSource={listData}
          columns={columns as any}
          rowKey="id"
          size="middle"
          scroll={{ x: 'max-content' }}
          pagination={false}
        />
      </div>

      <Drawer
        title={
          <DrawerTitle
            moduleName={`項目 (${selectedCode})`}
            isCreate={!editingItem}
            isEdit={!!editingItem}
            record={editingItem}
            displayField={(record) => `${record.code || ''} - ${record.name || ''}`.replace(/^ - | - $/g, '')}
          />
        }
        size={DRAWER_WIDTH_DETAIL}
        open={isDrawerOpen}
        mask={{ closable: false }}
        keyboard={false}
        onClose={() => setIsDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            <Button 
              type="primary" 
              htmlType="submit"
              form="itemForm"
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
          defaultValues={editingItem ? editingItem : { type: selectedCode }}
          fields={itemFormConfig()}
          onSubmit={handleSubmit}
          isUpdateMode={!!editingItem}
          isViewMode={false}
          hideDefaultFooter={true}
          formId="itemForm"
        />
      </Drawer>
    </div>
  );
}