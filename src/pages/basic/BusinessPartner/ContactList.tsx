import { useState, useMemo } from 'react';
import { Table, Button, Space, Popconfirm, Drawer } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApiV1BusinessPartnersByBusinessPartnerCodeContacts,
  postApiV1BusinessPartnersByBusinessPartnerCodeContacts,
  putApiV1BusinessPartnersByBusinessPartnerCodeContactsByContactId,
  deleteApiV1BusinessPartnersByBusinessPartnerCodeContactsByContactId,
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { contactTableColumns, contactFormConfig } from './ContactConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { App } from 'antd';

export default function ContactList({ businessPartnerCode, isViewMode: isMasterViewMode }: { businessPartnerCode: string; isViewMode: boolean }) {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const queryClient = useQueryClient();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingData, setViewingData] = useState<any>(null);

  // View only mode when viewing data
  

  const { data, isFetching } = useQuery({
    queryKey: ['partnerContactList', businessPartnerCode],
    queryFn: () => getApiV1BusinessPartnersByBusinessPartnerCodeContacts({ 
      path: { businessPartnerCode },
      query: { pageSize: 100 }
    }),
    enabled: !!businessPartnerCode,
  });

  const listData = useMemo(() => {
    return (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  }, [data]);

  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1BusinessPartnersByBusinessPartnerCodeContacts({ 
      path: { businessPartnerCode }, 
      body: values 
    }),
    onSuccess: () => {
      messageApi.success('新增成功');
      setIsDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['partnerContactList', businessPartnerCode] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number, values: any }) => 
      putApiV1BusinessPartnersByBusinessPartnerCodeContactsByContactId({ 
        path: { businessPartnerCode, contactId: id }, 
        body: values 
      }),
    onSuccess: () => {
      messageApi.success('更新成功');
      setIsDrawerOpen(false);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['partnerContactList', businessPartnerCode] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteApiV1BusinessPartnersByBusinessPartnerCodeContactsByContactId({ 
      path: { businessPartnerCode, contactId: id } 
    }),
    onSuccess: () => {
      messageApi.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['partnerContactList', businessPartnerCode] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const openCreateDrawer = () => {
    setViewingData(null);
    setEditingId(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (record: any) => {
    setViewingData(null);
    setEditingId(record.id);
    setIsDrawerOpen(true);
  };

  const openViewDrawer = (record: any) => {
    setViewingData(record);
    setEditingId(null);
    setIsDrawerOpen(true);
  };

  const handleCrudSubmit = (values: any) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'left' as const,
    width: 120,
    render: (_: any, record: any) => (
      <Space>
        <Button 
          type="text" 
          icon={<EyeOutlined />} 
          style={{ color: '#1890ff' }} 
          onClick={() => openViewDrawer(record)}
        />
        {!isMasterViewMode && (
          <>
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              style={{ color: '#faad14' }} 
              onClick={() => openEditDrawer(record)}
            />
            <Popconfirm
              title="確定要刪除此筆聯絡人嗎？"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="確定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </>
        )}
      </Space>
    ),
  };

  const columns = buildTableColumns(contactTableColumns(), actionColumn);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        {!isMasterViewMode && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
            新增聯絡人
          </Button>
        )}
      </div>

      <Table
        dataSource={listData}
        columns={columns}
        rowKey="id"
        loading={isFetching}
        pagination={false}
        size="small"
      />

      <Drawer
        title={viewingData ? '檢視聯絡人' : (editingId ? '編輯聯絡人' : '新增聯絡人')}
        width={500}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        destroyOnClose
      >
        <DynamicForm
          key={editingId ? `edit-${editingId}` : (viewingData ? `view-${viewingData.id}` : 'create')}
          defaultValues={editingId ? listData.find((d: any) => d.id === editingId) : viewingData}
          fields={contactFormConfig()}
          onSubmit={handleCrudSubmit}
          isUpdateMode={!!editingId}
          isViewMode={!!viewingData}
          formId="contactForm"
          hideDefaultFooter={true}
        />
        {(!viewingData) && (
          <div style={{ textAlign: 'right', padding: '16px 0', borderTop: '1px solid #f0f0f0', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setIsDrawerOpen(false)}>取消</Button>
              <Button 
                type="primary" 
                htmlType="submit"
                form="contactForm"
              >
                儲存
              </Button>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
}
