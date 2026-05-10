import { useMemo, useState } from 'react';
import { Card, Table, Button, Space, Tooltip, App, Form, Divider, Modal } from 'antd';
import { EyeOutlined, PlusOutlined, SearchOutlined, ClearOutlined, CheckCircleOutlined, CloseCircleOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getApiV1Orders, deleteApiV1OrdersByOrderNumber, postApiV1OrdersByOrderNumberConfirm, postApiV1OrdersByOrderNumberCancelConfirm, postApiV1OrdersByOrderNumberClose, postApiV1OrdersByOrderNumberCancelClose } from '@/api/generated/sdk.gen';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
;
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import { useAuthStore } from '@/stores/useAuthStore';
import type { OrderDto } from '@/api/generated/types.gen';
import useOrderQueryStore from './useOrderQueryStore';
import { searchConfig, getColumns } from './OrderConfig';



export default function OrdersList() {
  const navigate = useNavigate();
  const { id: viewId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { hasPermission } = useAuthStore();
  const { params, setParams } = useOrderQueryStore();
  const [searchForm] = Form.useForm();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => getApiV1Orders({ query: params as any }),
  });

  const resData = data?.data as any;
  const listDataRaw = resData?.data?.data || resData?.data || resData;
  const listData: OrderDto[] = Array.isArray(listDataRaw) ? listDataRaw : [];
  const total = resData?.data?.totalRecords || resData?.totalRecords || listData.length;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiV1OrdersByOrderNumber({ path: { orderNumber: id } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => postApiV1OrdersByOrderNumberConfirm({ path: { orderNumber: id } }),
    onSuccess: () => {
      message.success('確認成功');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const cancelConfirmMutation = useMutation({
    mutationFn: (id: string) => postApiV1OrdersByOrderNumberCancelConfirm({ path: { orderNumber: id } }),
    onSuccess: () => {
      message.success('取消確認成功');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => postApiV1OrdersByOrderNumberClose({ path: { orderNumber: id } }),
    onSuccess: () => {
      message.success('結案成功');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const cancelCloseMutation = useMutation({
    mutationFn: (id: string) => postApiV1OrdersByOrderNumberCancelClose({ path: { orderNumber: id } }),
    onSuccess: () => {
      message.success('取消結案成功');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const handleTableChange = (pagination: any) => {
    setParams({ page: pagination.current, pageSize: pagination.pageSize });
  };

  const columns = useMemo(() => {
    const baseColumns = getColumns();
    baseColumns.unshift({
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'left',
      render: (_, record: OrderDto) => {
        const canView = hasPermission('Sales.Orders.View');
        const canUpdate = hasPermission('Sales.Orders.Update');
        const canDelete = hasPermission('Sales.Orders.Delete');
        const isDraft = record.status === 'Draft';
        const isConfirmed = record.status === 'Confirmed';
        const isFinished = record.status === 'Finished';

        return (
          <Space size="middle">
            {(canView || canUpdate) && (
              <Tooltip title="檢視">
                <Button
                  type="text"
                  style={{ color: '#1890ff' }}
                  icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />}
                  onClick={() => navigate(`/sales/orders/${record.orderNumber}`)}
                />
              </Tooltip>
            )}

            {canUpdate && isDraft && (
              <Tooltip title="確認">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE, color: 'var(--ant-color-success)' }} />}
                  onClick={() => modal.confirm({
                    title: '確認訂單',
                    content: `確定要確認訂單 ${record.orderNumber} 嗎？`,
                    centered: true,
                    width: 400,
                    onOk: () => confirmMutation.mutateAsync(record.orderNumber!),
                  })}
                />
              </Tooltip>
            )}

            {canUpdate && isConfirmed && (
              <Tooltip title="取消確認">
                <Button
                  type="text"
                  icon={<CloseCircleOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE, color: 'var(--ant-color-warning)' }} />}
                  onClick={() => modal.confirm({
                    title: '取消確認',
                    content: `確定要取消確認訂單 ${record.orderNumber} 嗎？`,
                    centered: true,
                    width: 400,
                    onOk: () => cancelConfirmMutation.mutateAsync(record.orderNumber!),
                  })}
                />
              </Tooltip>
            )}

            {canUpdate && isConfirmed && (
              <Tooltip title="結案">
                <Button
                  type="text"
                  icon={<LockOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE, color: 'var(--ant-color-text-secondary)' }} />}
                  onClick={() => modal.confirm({
                    title: '訂單結案',
                    content: `確定要結案訂單 ${record.orderNumber} 嗎？`,
                    centered: true,
                    width: 400,
                    onOk: () => closeMutation.mutateAsync(record.orderNumber!),
                  })}
                />
              </Tooltip>
            )}

            {canUpdate && isFinished && (
              <Tooltip title="取消結案">
                <Button
                  type="text"
                  icon={<UnlockOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE, color: 'var(--ant-color-primary)' }} />}
                  onClick={() => modal.confirm({
                    title: '取消結案',
                    content: `確定要取消結案訂單 ${record.orderNumber} 嗎？`,
                    centered: true,
                    width: 400,
                    onOk: () => cancelCloseMutation.mutateAsync(record.orderNumber!),
                  })}
                />
              </Tooltip>
            )}

            {canDelete && isDraft && (
              <Tooltip title="刪除">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />}
                  onClick={() => modal.confirm({
                    title: '刪除訂單',
                    content: `確定要刪除訂單 ${record.orderNumber} 嗎？此操作無法還原。`,
                    centered: true,
                    width: 400,
                    okButtonProps: { danger: true },
                    onOk: () => deleteMutation.mutateAsync(record.orderNumber!),
                  })}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    });
    return baseColumns;
  }, [hasPermission, navigate, modal, confirmMutation, cancelConfirmMutation, closeMutation, cancelCloseMutation, deleteMutation]);

  return (
    <div style={{ padding: '16px 16px 0px 16px', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 4px 16px' }
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <div style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
              訂單管理
            </div>
          </div>
        }
      variant="borderless"
      extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={() => setIsSearchModalOpen(true)}
            >
              進階查詢
            </Button>
            {hasPermission('Sales.Orders.Create') && (
              <Button 
                type="primary" 
                icon={<PlusOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
                onClick={() => navigate('/sales/orders/create')}
              >
                新增資料
              </Button>
            )}
          </Space>
        }
    >
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', padding: '12px 16px', borderRadius: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>目前的查詢條件:</span>
          <DynamicSearchTags
            config={searchConfig}
            params={params}
            onClose={(key) => setParams({ [key]: undefined, page: 1 })}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <style>{`
            .ant-table-wrapper { height: 100%; display: flex; flex-direction: column; }
            .ant-spin-nested-loading { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-spin { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-spin-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table-body { flex: 1; overflow-y: auto !important; max-height: none !important; }
            .ant-table-pagination { margin-top: auto !important; margin-bottom: 0 !important; }
            .ant-table-thead > tr > th { text-align: center !important; }
          `}</style>

      <Table
        bordered
        rowClassName={(record) => String(record.orderNumber) === String(viewId) ? 'selected-table-row' : ''}
        style={{ flex: 1 }}
        columns={columns}
        dataSource={listData}
        rowKey="orderNumber"
        loading={isLoading}
        onChange={handleTableChange}
        scroll={{ x: 'max-content' }}
        size="middle"
        pagination={{
          current: params.page || 1,
          pageSize: params.pageSize || 10,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 筆資料`,
        }}
      />
    </div>
      </Card>

      <Modal
        title={
          <div style={{ fontSize: '18px', fontWeight: 600, paddingBottom: '12px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
            查詢條件設定
          </div>
        }
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button icon={<ClearOutlined />} onClick={() => searchForm.resetFields()}>
              清空重置
            </Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => searchForm.submit()}>
              執行查詢
            </Button>
          </div>
        }
        width={800}
        style={{ top: '10vh' }}
        styles={{
          body: {
            maxHeight: '60vh',
            overflowY: 'auto',
            padding: '24px 24px 0 24px'
          }
        }}
        closeIcon={true}
      >
        <DynamicSearchForm 
          config={searchConfig} 
          form={searchForm} 
          onSearch={(values: any) => {
            setParams({ ...params, ...values, page: 1 });
            setIsSearchModalOpen(false);
          }} 
        />
      </Modal>
    </div>
  );
}
