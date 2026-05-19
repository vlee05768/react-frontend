import { useState, useMemo } from 'react';
import { Table, Button, Space, message, Typography, Drawer, Empty, Tooltip , App } from 'antd';
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
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';


interface CategoryItemListProps {
  selectedCode: string | null;
}

export default function CategoryItemList({ selectedCode }: CategoryItemListProps) {
  const { modal } = App.useApp();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Pagination states
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  useUrlQuerySync({
    query: {},
    page: pagination.current,
    pageSize: pagination.pageSize,
    setPagination: (page, pageSize) => setPagination({ current: page, pageSize }),
    setQuery: () => {},
    enabled: true 
  });

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
              <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={() => {
              const r = record as any; const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
              const rt = record as any; const recordTitle = rt.name || rt.code || rt.employeeNo || rt.userName || rt.roleName || rt.documentNumber || rt.referenceNumber || recordId || '此資料';
              setDeletingRecordId(String(recordId));
              modal.confirm({
                title: `刪除確認 - ${recordTitle}`,
                content: '確定要刪除？此操作無法還原。',
                centered: true,
                width: 400,
                okButtonProps: { danger: true },
                onOk: () => {
                  setDeletingRecordId(null);
                  handleDelete(record)
                },
                onCancel: () => setDeletingRecordId(null)
              });
            }} />
            </Tooltip>
          </Space>
        ),
      }
    ];
  }, [itemTableColumns]);

  if (!selectedCode) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty description="請從左側選擇一個類別" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex justify-between items-center" style={{borderBottom: '1px solid #f0f0f0' }}>
        <Typography.Title level={5} className="m-0">
          {selectedCode} 項目清單
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={handleAdd}>
          新增項目
        </Button>
      </div>

      <div className="p-4" style={{flex: 1, overflowY: 'auto' }}>
        <Table
            rowClassName={(record) => {
              const r = record as any; const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
              return recordId && String(recordId) === String(deletingRecordId) ? 'deleting-row-highlight' : '';
            }}
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