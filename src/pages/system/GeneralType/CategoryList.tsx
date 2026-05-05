import { useState } from 'react';
import { Button, Input, Space, Popconfirm, message, Typography, Drawer } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  postApiV1GeneralTypes, 
  putApiV1GeneralTypesById, 
  deleteApiV1GeneralTypesById,
  getApiV1GeneralTypesGetTypes
} from '@/api/generated/sdk.gen';
import { categoryFormConfig } from './GeneralTypeConfig';
import { DynamicForm } from '@/components/Form/DynamicForm';

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
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增類別
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isFetching ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ant-color-text-description)' }}>載入中...</div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ant-color-text-description)' }}>尚無類別資料</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredData.map((item: any) => {
              const isSelected = selectedCode === item.code;
              return (
                <div
                  key={item.id || item.code}
                  onClick={() => onSelect(item.code)}
                  style={{ 
                    cursor: 'pointer', 
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? 'var(--ant-color-primary-bg)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--ant-color-primary)' : '3px solid transparent',
                    borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontWeight: isSelected ? 600 : 400, color: 'var(--ant-color-text)', marginBottom: 4 }}>
                      {item.code}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ant-color-text-description)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.desc}
                    </div>
                  </div>
                  <Space size="small" onClick={(e) => e.stopPropagation()}>
                    <Button type="text" icon={<EditOutlined />} size="small" onClick={(e) => handleEdit(e, item)} />
                    <Popconfirm
                      title="確定要刪除此類別？"
                      description="若刪除此類別，其底下所有項目請手動清除。"
                      onConfirm={(e) => handleDelete(e as any, item)}
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  </Space>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Drawer
        title={editingItem ? '編輯類別' : '新增類別'}
        size="default"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        destroyOnClose
      >
        <DynamicForm
          defaultValues={editingItem ? editingItem : { type: 'ERPSystem' }}
          fields={categoryFormConfig()}
          onSubmit={handleSubmit}
          isUpdateMode={!!editingItem}
          isViewMode={false}
          formId="categoryForm"
        />
      </Drawer>
    </div>
  );
}
