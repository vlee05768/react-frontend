import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, Table, Button, Space, Tooltip, App, Divider, Modal } from 'antd';
import { EyeOutlined, PlusOutlined, SearchOutlined, ClearOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getApiV1Orders, deleteApiV1OrdersByOrderNumber } from '@/api/generated/sdk.gen';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
;
import { TABLE_ACTION_ICON_SIZE, DEFAULT_PAGE_SIZE, MODAL_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT } from '@/constants/ui';
import { useAuthStore } from '@/stores/useAuthStore';
import type { OrderDto } from '@/api/generated/types.gen';
import useOrderQueryStore from './useOrderQueryStore';
import { searchConfig, getColumns } from './OrderConfig';



import { getApiErrorMessage } from '@/utils/apiError';

import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';

export default function OrdersList() {
  const navigate = useNavigate();
  const { id: viewId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { hasPermission } = useAuthStore();
  const { params, setParams } = useOrderQueryStore();

  const { page, pageSize, ...queryFields } = params;
  useUrlQuerySync({
    query: queryFields,
    page: page || 1,
    pageSize: pageSize || DEFAULT_PAGE_SIZE,
    setPagination: (p, s) => setParams({ page: p, pageSize: s }),
    setQuery: (q) => setParams({ ...q, page: 1 })
  });

  const searchForm = useForm({ values: params });
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
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
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
      fixed: 'right' as const,
      render: (_, record: OrderDto) => {
        const canView = hasPermission('Sales.Orders.View');
        const canUpdate = hasPermission('Sales.Orders.Update');
        const canDelete = hasPermission('Sales.Orders.Delete');
        const isDraft = record.status === 'Draft';

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
                    onOk: () => { deleteMutation.mutate(record.orderNumber!); },
                  })}
                />
              </Tooltip>
            )}
          </Space>
        );
      },    });
    return baseColumns;
  }, [hasPermission, navigate, modal, deleteMutation]);

  return (
    <div className="p-[16px_16px_0px_16px] flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 4px 16px' }
        }}
        title={
          <div className="flex items-center gap-3">
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <div className="m-0 font-semibold" style={{fontSize: '20px'}}>
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
                icon={<PlusOutlined />} 
                onClick={() => navigate('/sales/orders/create')}
              >
                新增資料
              </Button>
            )}
          </Space>
        }
      >
        <div className="mb-4 flex items-center p-[12px_16px]" style={{flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', borderRadius: '6px', flexShrink: 0 }}>
          <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>目前的查詢條件:</span>
          <DynamicSearchTags
            config={searchConfig}
            params={params}
            onClose={(key) => setParams({ [key]: undefined, page: 1 })}
          />
        </div>
        <div className="flex flex-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        scroll={{ x: 'max-content', y: 300 }}
        size="middle"
        pagination={{
          current: params.page || 1,
          pageSize: params.pageSize || DEFAULT_PAGE_SIZE,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 筆資料`,
        }}
      />
    </div>
      </Card>

      <Modal
        title={
          <div className="font-semibold pb-3 mb-2" style={{fontSize: '18px', borderBottom: '1px solid #f0f0f0'}}>
            查詢條件設定
          </div>
        }
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2" style={{borderTop: '1px solid #f0f0f0'}}>
            <Button icon={<ClearOutlined />} onClick={() => searchForm.reset()}>
              清除條件
            </Button>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" form="search-form">
              執行查詢
            </Button>
          </div>
        }
        width={MODAL_WIDTH_SEARCH}
        style={{ top: '10vh' }}
        styles={{
          body: {
            maxHeight: MODAL_BODY_MAX_HEIGHT,
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
