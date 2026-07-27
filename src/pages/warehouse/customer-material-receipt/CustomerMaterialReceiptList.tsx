import { useEffect } from 'react';
import PageCard from '@/components/common/PageCard';
import { Button, message, Space, Divider, Modal } from 'antd';
import { PlusOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { TableActions } from '@/utils/tableActions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate, Outlet, useLocation, useParams } from 'react-router-dom';

import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { getApiV1CustomerMaterialReceipt, deleteApiV1CustomerMaterialReceiptByCode } from '@/api/generated';
import { useCustomerMaterialReceiptQueryStore } from './useCustomerMaterialReceiptQueryStore';
import { customerMaterialReceiptSearchConfig, mainTableColumns } from './CustomerMaterialReceiptConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';
import { MODAL_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT } from '@/constants/ui';

export default function CustomerMaterialReceiptList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, setParams } = useCustomerMaterialReceiptQueryStore();
  const location = useLocation();
  const { documentNumber: viewId } = useParams();

  // Reset query parameters on fresh module visits to prevent stale states
  useEffect(() => {
    // Only reset if there are no search params or we are visiting the root list view
    if (location.pathname === '/warehouse/customer-material-receipt') {
      setParams({
        pageNumber: 1,
        pageSize: 20,
        documentNumber: undefined,
        businessPartnerCode: undefined,
        dateRange: null,
        status: undefined,
      });
    }
  }, [location.pathname, setParams]);

  const listQuery = useErpListQuery({
    params,
    setParams,
  });

  const openCreateDrawer = () => navigate('/warehouse/customer-material-receipt/create');

  // Fetch Data - React Query
  const { data: response, isLoading, isFetching } = useQuery({
    queryKey: ['customer-material-receipts', params],
    queryFn: () => getApiV1CustomerMaterialReceipt({
      query: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        DocumentNumber: params.documentNumber || undefined,
        BusinessPartnerCode: params.businessPartnerCode || undefined,
        DateRange: params.dateRange ? [
          dayjs(params.dateRange[0]).format('YYYY-MM-DD'),
          dayjs(params.dateRange[1]).format('YYYY-MM-DD')
        ] : undefined,
        SortRules: params.SortRules || undefined,
        Status: params.status || undefined,
      } as any,
    }),
  });

  const list = (response?.data as any)?.data?.data || (response?.data as any)?.data || [];
  const total = (response?.data as any)?.data?.totalRecords || (response?.data as any)?.totalRecords || 0;

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (code: string) => deleteApiV1CustomerMaterialReceiptByCode({ path: { code } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['customer-material-receipts'] });
    },
    onError: (err: any) => message.error(err.response?.data?.message || '刪除失敗'),
  });

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
    render: (_: any, record: any) => {
      const isUnconfirmed = record.status === 'Unconfirmed' || !record.confirmDate;
      return (
        <TableActions
          onView={() => navigate(`/warehouse/customer-material-receipt/${record.documentNumber}`)}
          onDelete={isUnconfirmed ? () => deleteMutation.mutate(record.documentNumber) : undefined}
          recordName={record.documentNumber}
          deleteConfirmType="modal"
        />
      );
    },
  };

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    const pageNumber = pagination.current || 1;
    const pageSize = pagination.pageSize || 20;
    const sortRules = formatSorterToRules(sorter);

    setParams({
      pageNumber,
      pageSize,
      SortRules: sortRules || undefined,
    });
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn, params.SortRules);

  return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard
        title="客供料入庫單"
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={listQuery.openSearchModal}
            >
              查詢
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateDrawer}
            >
              新增單據
            </Button>
          </Space>
        }
      >
        <ActiveQueryAndSortTags
          searchConfig={customerMaterialReceiptSearchConfig()}
          tableColumns={mainTableColumns()}
          params={params}
          onQueryTagClose={listQuery.handleClearQueryField}
          onSortTagClose={listQuery.handleClearSortField}
          onClearSort={listQuery.handleClearAllSort}
        />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <StandardErpTable
            onChange={handleTableChange}
            columns={columns}
            dataSource={list}
            rowKey="documentNumber"
            loading={isLoading || isFetching}
            selectedRowId={viewId}
            selectedRowKey="documentNumber"
            pagination={{
              current: params.pageNumber || 1,
              pageSize: params.pageSize || 20,
              total,
            }}
          />
        </div>
      </PageCard>

      {/* Query Search Modal */}
      <Modal
        title={
          <div className="font-semibold pb-3 mb-2 text-[18px] border-b border-[var(--ant-color-border-secondary)]">
            查詢條件設定
          </div>
        }
        open={listQuery.isSearchModalOpen}
        onCancel={() => listQuery.setIsSearchModalOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2 border-t border-[var(--ant-color-border-secondary)]">
            <Button icon={<ClearOutlined />} onClick={listQuery.handleClear}>
              清除條件
            </Button>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" form="search-form">
              執行查詢
            </Button>
          </div>
        }
        width={MODAL_WIDTH_SEARCH}
        className="top-[10vh]"
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
          config={customerMaterialReceiptSearchConfig()}
          form={listQuery.searchForm}
          onSearch={listQuery.handleSearch}
        />
      </Modal>

      {/* Render Sub Router Overlays (Drawer) */}
      <Outlet />
    </div>
  );
}
