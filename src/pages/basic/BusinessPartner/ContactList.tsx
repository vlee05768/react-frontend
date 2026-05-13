import { getApiErrorMessage } from "@/utils/apiError";
import { useState, useMemo } from 'react';
import { Table, Button, Space,  Drawer, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApiV1BusinessPartnersByBusinessPartnerCodeContacts,
  postApiV1BusinessPartnersByBusinessPartnerCodeContacts,
  putApiV1BusinessPartnersByBusinessPartnerCodeContactsByContactId,
  deleteApiV1BusinessPartnersByBusinessPartnerCodeContactsByContactId,
} from '@/api/generated/sdk.gen';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { contactTableColumns, contactFormConfig } from './ContactConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { App } from 'antd';
import { DRAWER_WIDTH_DETAIL, MAX_PAGE_SIZE } from '@/constants';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';


export default function ContactList({ businessPartnerCode, isViewMode: isMasterViewMode }: { businessPartnerCode: string; isViewMode: boolean }) {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingData, setViewingData] = useState<any>(null);

  // View only mode when viewing data
  

  const { data, isFetching } = useQuery({
    queryKey: ['partnerContactList', businessPartnerCode],
    queryFn: () => getApiV1BusinessPartnersByBusinessPartnerCodeContacts({ 
      path: { businessPartnerCode },
      query: { pageSize: MAX_PAGE_SIZE }
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
      modalApi.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
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
      modalApi.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
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
      modalApi.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const openCreateDrawer = () => {
    setViewingData(null);
    setEditingId(null);
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

  const handleCancel = () => {
    if (editingId) {
      const record = listData.find((d: any) => d.id === editingId);
      if (record) {
        setViewingData(record);
        setEditingId(null);
        return;
      }
    }
    setIsDrawerOpen(false);
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
    render: (_: any, record: any) => (
      <Space>
        <Button 
          type="text" 
          icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
          style={{ color: '#1890ff' }} 
          onClick={() => openViewDrawer(record)}
        />
        {isMasterViewMode && (
          <Popconfirm
            title="刪除確認"
            description="確定要刪除此筆聯絡人嗎？此操作無法還原。"
            onConfirm={() => deleteMutation.mutate(record.id)}
            onOpenChange={(open) => {
              const r = record as any;
              const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
              setDeletingRecordId(open ? String(recordId) : null);
            }}
            okButtonProps={{ danger: true }}
            okText="刪除"
            cancelText="取消"
            placement="topLeft"
          >
            <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} />
          </Popconfirm>
        )}
      </Space>
    ),
  };

  const columns = buildTableColumns(contactTableColumns(), actionColumn);

  return (
    <div className="detail-container flex flex-col h-full" >
      {/* 頂部操作列與客製化訊息區 */}
      <div className="flex justify-between items-center mb-4 p-[8px 12px]" style={{backgroundColor: 'var(--ant-color-fill-alter, #f5f5f5)', borderRadius: '6px'
      }}>
        {/* 左側：訊息 */}
        <div style={{ color: 'var(--ant-color-text-secondary, #8c8c8c)' }}>
          目前共有 <span className="font-semibold" style={{color: 'var(--ant-color-primary)' }}>{listData.length}</span> 筆聯絡人資料
        </div>
        
        {/* 右側：操作按鈕 */}
        <div>
          {isMasterViewMode && (
            <Button type="primary" icon={<PlusOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={openCreateDrawer}>
              新增聯絡人
            </Button>
          )}
        </div>
      </div>

      {/* 資料表格區 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Table
            rowClassName={(record) => {
              const r = record as any; const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
              return recordId && String(recordId) === String(deletingRecordId) ? 'deleting-row-highlight' : '';
            }}
          virtual
          scroll={{ x: 1200, y: 400 }}
          dataSource={listData}
          columns={columns}
          rowKey="id"
          loading={isFetching}
          pagination={false}
          size="small"
        />
      </div>

      <Drawer
        title={
          <DrawerTitle
            moduleName={`聯絡人 (${businessPartnerCode})`}
            isCreate={!editingId && !viewingData}
            isEdit={!!editingId}
            record={viewingData || (editingId ? listData.find((d: any) => d.id === editingId) : null)}
            displayField={(record: any) => `${record?.jobTitle || ''} - ${record?.name || ''}`.replace(/^ - | - $/g, '')}
          />
        }
        size={DRAWER_WIDTH_DETAIL}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        mask={{ closable: !!viewingData }}
        keyboard={!!viewingData}
        destroyOnHidden
        extra={
          <Space>
            {(!!viewingData && isMasterViewMode) && (
              <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={() => {
                setEditingId(viewingData.id);
                setViewingData(null);
              }}>
                編輯
              </Button>
            )}
            {(!viewingData) && (
              <>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  form="contactForm"
                  icon={<SaveOutlined />}
                  loading={createMutation.isPending || updateMutation.isPending}
                >
                  儲存
                </Button>
                <Button onClick={handleCancel}>取消</Button>
              </>
            )}
          </Space>
        }
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
      </Drawer>
    </div>
  );
}
