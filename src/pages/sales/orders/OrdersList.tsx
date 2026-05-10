import { useMemo } from 'react';
import { Card, Table, Button, Space, Typography, Tooltip, App, Form } from 'antd';
import { EyeOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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

const { Text } = Typography;

export default function OrdersList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { hasPermission } = useAuthStore();
  const { params, setParams } = useOrderQueryStore();
  const [searchForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => getApiV1Orders({ query: params as any }),
  });

  const listData: OrderDto[] = (data?.data as any)?.data || data?.data || [];
  const total = (data?.data as any)?.totalRecords || listData.length;

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
      align: 'center',
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
    <Card
      title={<Text strong className="text-lg border-l-4 border-blue-500 pl-2">訂單管理</Text>}
      variant="borderless"
      extra={
        <Space>
          <DynamicSearchForm form={searchForm}
            config={searchConfig}
            onSearch={(values: any) => setParams({ ...params, ...values, page: 1 })}
          />
          {hasPermission('Sales.Orders.Create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/sales/orders/create')}
            >
              新增
            </Button>
          )}
        </Space>
      }
    >
      <div className="mb-4 bg-gray-50 p-3 rounded-md">
        <DynamicSearchTags
          config={searchConfig}
          params={params}
          onClose={(key) => setParams({ [key]: undefined, page: 1 })}
        />
      </div>

      <Table
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
        }}
      />
    </Card>
  );
}
