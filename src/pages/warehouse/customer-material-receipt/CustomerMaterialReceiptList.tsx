import { useEffect } from 'react';
import PageCard from '@/components/common/PageCard';
import { Button, message, Space, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { TableActions } from '@/utils/tableActions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { getApiV1CustomerMaterialReceipt, deleteApiV1CustomerMaterialReceiptByCode } from '@/api/generated';
import { useCustomerMaterialReceiptQueryStore } from './useCustomerMaterialReceiptQueryStore';
import { customerMaterialReceiptSearchConfig, mainTableColumns } from './CustomerMaterialReceiptConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';

export default function CustomerMaterialReceiptList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { params, setParams } = useCustomerMaterialReceiptQueryStore();
  const location = useLocation();

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
    <PageCard title="客供料入庫單">
      <Space direction="vertical" style={{ width: '100%' }} size="medium">
        {/* Advanced Search Form */}
        <DynamicSearchForm
          config={customerMaterialReceiptSearchConfig()}
          form={listQuery.searchForm}
          onSearch={listQuery.handleSearch}
        />

        <Divider style={{ margin: '8px 0' }} />

        {/* Gray Box Actions and Statistics */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '10px 16px',
            backgroundColor: 'var(--ant-color-fill-alter)',
            borderRadius: '8px',
            border: '1px solid var(--ant-color-border-secondary)'
          }}
        >
          <div style={{ color: 'var(--ant-color-text-secondary)' }}>
            單據共計 <span style={{ fontWeight: 600, color: 'var(--ant-color-primary)' }}>{total}</span> 筆
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={openCreateDrawer}
          >
            建立客供料入庫單
          </Button>
        </div>

        {/* Active Query Filter Tags */}
        <ActiveQueryAndSortTags
          searchConfig={customerMaterialReceiptSearchConfig()}
          tableColumns={mainTableColumns()}
          params={params}
          onQueryTagClose={listQuery.handleClearQueryField}
          onSortTagClose={listQuery.handleClearSortField}
          onClearSort={listQuery.handleClearAllSort}
        />

        {/* Standard Data Grid */}
        <StandardErpTable
          dataSource={list}
          columns={columns}
          rowKey="documentNumber"
          loading={isLoading || isFetching}
          pagination={{
            current: params.pageNumber || 1,
            pageSize: params.pageSize || 20,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 筆記錄`,
          }}
          onChange={handleTableChange}
        />
      </Space>

      {/* Render Sub Router Overlays (Drawer) */}
      <Outlet />
    </PageCard>
  );
}
