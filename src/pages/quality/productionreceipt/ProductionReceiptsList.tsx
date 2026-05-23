// @ts-nocheck
import PageCard from '@/components/common/PageCard';
import { Button, Modal } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { TableActions } from '@/utils/tableActions';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants/ui';
import { getApiV1ProductionReceipt } from '@/api/generated';
import { useProductionReceiptQueryStore } from './useProductionReceiptQueryStore';
import { productionReceiptSearchConfig, mainTableColumns } from './ProductionReceiptConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { Space, Divider } from 'antd';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';

export default function ProductionReceiptsList() {
  const { id: viewId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { params, setParams } = useProductionReceiptQueryStore();

  const listQuery = useErpListQuery({
    params,
    setParams,
  });

  const { data: response, isLoading, isFetching } = useQuery({
    queryKey: ['productionReceipts', params],
    queryFn: () => getApiV1ProductionReceipt({
      query: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        DocumentNumber: params.documentNumber || undefined,
        DateRange: params.dateRange ? [
          dayjs(params.dateRange[0]).format('YYYY-MM-DD'),
          dayjs(params.dateRange[1]).format('YYYY-MM-DD')
        ] : undefined,
        SortRules: params.SortRules || undefined,
      } as any,
    }),
  });

  const list = (response?.data?.data as any)?.data || (response?.data?.data as any) || [];
  let displayList = list;
  if (params.status) {
    displayList = list.filter((item: any) => item.status === params.status);
  }

  const total = (response?.data?.data as any)?.totalRecords || (response?.data as any)?.totalRecords || 0;

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
    render: (_: any, record: any) => {
      return (
        <TableActions
          onView={() => navigate(`/production-quality/production-receipts/${record.documentNumber}`)}
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
    <div className="p-4 pb-0 flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <PageCard title="生產入庫單管理" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button type="default" icon={<SearchOutlined />} onClick={listQuery.openSearchModal}>
              查詢
            </Button>
          </Space>
        }>
        
        <ActiveQueryAndSortTags
          searchConfig={productionReceiptSearchConfig()}
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
            dataSource={displayList}
            rowKey="documentNumber"
            loading={isLoading || isFetching}
            selectedRowId={viewId}
            selectedRowKey="documentNumber"
            pagination={{
              current: params.pageNumber,
              pageSize: params.pageSize,
              total: total,
            }}
          />
        </div>
      </PageCard>

      <Modal
        title={
          <div className="font-semibold pb-3 mb-2" style={{fontSize: '18px', borderBottom: '1px solid #f0f0f0'}}>
            查詢條件設定
          </div>
        }
        open={listQuery.isSearchModalOpen}
        onCancel={() => listQuery.setIsSearchModalOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2" style={{borderTop: '1px solid #f0f0f0'}}>
            <Button icon={<ClearOutlined />} onClick={listQuery.handleClear}>
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
          config={productionReceiptSearchConfig()}
          form={listQuery.searchForm}
          onSearch={listQuery.handleSearch}
        />
      </Modal>
    </div>
  );
}
