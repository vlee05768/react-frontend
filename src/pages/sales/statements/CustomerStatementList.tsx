// @ts-nocheck
import PageCard from '@/components/common/PageCard';
import { useMemo } from 'react';
import { Descriptions, Space, Button, Modal } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { getApiV1SalesDeliveryStatisticsGroupByCustomer, getApiV1SalesDeliveryCustomerStatementReport } from '@/api/generated/sdk.gen';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { MODAL_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT } from '@/constants/ui';
import type { SalesDeliveryGroupByCustomerDto } from '@/api/generated/types.gen';
import useCustomerStatementQueryStore from './useCustomerStatementQueryStore';
import { searchConfig, getColumns } from './CustomerStatementConfig';
import { useFileDownload } from '@/hooks/useFileDownload';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';

export default function CustomerStatementList() {
  const { params, setParams } = useCustomerStatementQueryStore();

  const listQuery = useErpListQuery({
    params,
    setParams,
    pageKey: 'pageNumber',
  });

  const { downloadFile, isDownloading } = useFileDownload();

  const { data, isFetching } = useQuery({
    queryKey: ['customer-statements', params],
    queryFn: () => getApiV1SalesDeliveryStatisticsGroupByCustomer({
      query: {
        DateRange: params.dateRange as string[],
        CustomerCode: params.customerCode || undefined
      }
    }),
    enabled: !!params.dateRange && params.dateRange.length === 2,
  });

  const pagedResult = data?.data;
  const tableData = (pagedResult?.data || pagedResult || []) as SalesDeliveryGroupByCustomerDto[];
  const totalRecords = (pagedResult as any)?.totalRecords || tableData.length;

  const summaryInfo = useMemo(() => {
    if (tableData.length === 0) {
      return {
        customerCode: '',
        customerName: '',
        dateRange: '',
        totalCount: 0,
        totalCustomerCount: 0,
        totalAmount: 0,
        totalTax: 0,
        grandTotal: 0,
      };
    }

    const totalAmount = tableData.reduce((sum, row) => sum + (row.totalSubTotal || 0), 0);
    const totalTax = tableData.reduce((sum, row) => sum + (row.totalTaxAmount || 0), 0);
    const grandTotal = tableData.reduce((sum, row) => sum + (row.totalAmount || 0), 0);
    const totalDocumentCount = tableData.reduce((sum, row) => sum + (row.documentCount || 0), 0);

    const dateRangeText = params.dateRange && params.dateRange.length === 2
      ? `${dayjs(params.dateRange[0]).format('YYYY-MM-DD')} ~ ${dayjs(params.dateRange[1]).format('YYYY-MM-DD')}`
      : '';

    const firstRow = tableData[0];
    const customerCode = params.customerCode ? firstRow.businessPartnerCode || '' : '全部客戶';
    const customerName = params.customerCode ? firstRow.businessPartnerName || '' : '';

    return {
      customerCode,
      customerName,
      dateRange: dateRangeText,
      totalCount: totalDocumentCount,
      totalCustomerCount: tableData.length,
      totalAmount,
      totalTax,
      grandTotal,
    };
  }, [tableData, params]);

  const handlePrint = (row: SalesDeliveryGroupByCustomerDto) => {
    if (!params.dateRange || params.dateRange.length !== 2) return;
    
    downloadFile({
      apiFunction: () => getApiV1SalesDeliveryCustomerStatementReport({
        query: {
          DateRange: [dayjs(params.dateRange![0]).format('YYYY-MM-DD'), dayjs(params.dateRange![1]).format('YYYY-MM-DD')],
          CustomerCode: row.businessPartnerCode!
        },
        // @ts-ignore
        responseType: 'blob'
      }),
      successMessage: '對帳單已於新分頁開啟',
      openInNewTab: true
    });
  };

  const columns = useMemo(() => getColumns(handlePrint, isDownloading), [isDownloading, params.dateRange]);

  // 自訂開啟搜尋 Modal 並轉回 dayjs 型態，以避免 RangePicker 接收 string array 報錯或無法顯示
  const handleOpenSearchModal = () => {
    listQuery.searchForm.reset({
      customerCode: params.customerCode || null,
      dateRange: params.dateRange ? [dayjs(params.dateRange[0]), dayjs(params.dateRange[1])] : null
    });
    listQuery.setIsSearchModalOpen(true);
  };

  return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard title="對帳單報表" extra={
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleOpenSearchModal}>
              查詢條件
            </Button>
          </Space>
        }>
        
        <ActiveQueryAndSortTags
          searchConfig={searchConfig}
          tableColumns={columns}
          params={params}
          onQueryTagClose={listQuery.handleClearQueryField}
          onSortTagClose={listQuery.handleClearSortField}
          onClearSort={listQuery.handleClearAllSort}
        />
        
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
          <Descriptions bordered size="small" column={4} style={{ flexShrink: 0 }}>
            <Descriptions.Item label="客戶">
              {summaryInfo.customerCode} {summaryInfo.customerName ? ` - ${summaryInfo.customerName}` : ''}
            </Descriptions.Item>
            <Descriptions.Item label="查詢期間">{summaryInfo.dateRange}</Descriptions.Item>
            <Descriptions.Item label="客戶數量">{summaryInfo.totalCustomerCount}</Descriptions.Item>
            <Descriptions.Item label="單據數量">{summaryInfo.totalCount}</Descriptions.Item>
            <Descriptions.Item label="期間銷貨金額合計">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {summaryInfo.totalAmount.toLocaleString()}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="稅額合計">
              <span style={{ color: '#2080f0', fontWeight: 'bold' }}>
                {summaryInfo.totalTax.toLocaleString()}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="總計金額">
              <span style={{ color: '#d03050', fontWeight: 'bold' }}>
                {summaryInfo.grandTotal.toLocaleString()}
              </span>
            </Descriptions.Item>
          </Descriptions>

          <StandardErpTable
            columns={columns}
            dataSource={tableData}
            rowKey="businessPartnerCode"
            selectedRowKey="businessPartnerCode"
            loading={isFetching}
            pagination={{
              current: params.pageNumber,
              pageSize: params.pageSize,
              total: totalRecords,
              onChange: (p, s) => setParams({ pageNumber: p, pageSize: s })
            }}
          />
        </div>
      </PageCard>

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
          config={searchConfig}
          form={listQuery.searchForm}
          onSearch={(values) => {
            const formattedValues = { ...values };
            if (values.dateRange && Array.isArray(values.dateRange)) {
              formattedValues.dateRange = values.dateRange.map((d: any) => d ? d.format('YYYY-MM-DD') : undefined).filter(Boolean);
            }
            listQuery.handleSearch(formattedValues);
          }}
        />
      </Modal>
    </div>
  );
}
