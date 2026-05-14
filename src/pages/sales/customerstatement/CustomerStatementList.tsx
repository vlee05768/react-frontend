import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, Table, Descriptions, Space, Button, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { getApiV1SalesDeliveryStatisticsGroupByCustomer, getApiV1SalesDeliveryCustomerStatementReport } from '@/api/generated/sdk.gen';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { DEFAULT_PAGE_SIZE, MODAL_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT } from '@/constants/ui';
import type { SalesDeliveryGroupByCustomerDto } from '@/api/generated/types.gen';
import useCustomerStatementQueryStore from './useCustomerStatementQueryStore';
import { searchConfig, getColumns } from './CustomerStatementConfig';
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';
import { useFileDownload } from '@/hooks/useFileDownload';

export default function CustomerStatementList() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const { params, setParams } = useCustomerStatementQueryStore();
  
  const { pageNumber, pageSize, ...queryFields } = params;
  useUrlQuerySync({
    query: queryFields,
    page: pageNumber || 1,
    pageSize: pageSize || DEFAULT_PAGE_SIZE,
    setPagination: (p, s) => setParams({ pageNumber: p, pageSize: s }),
    setQuery: (q) => {
      const formattedQ = { ...q };
      if (formattedQ.dateRange && typeof formattedQ.dateRange === 'string') {
        const parts = (formattedQ.dateRange as string).split(',');
        if (parts.length === 2) {
          formattedQ.dateRange = [parts[0], parts[1]];
        }
      }
      setParams({ ...formattedQ, pageNumber: 1 });
    }
  });

  const { downloadFile, isDownloading } = useFileDownload();

  const searchForm = useForm({
    defaultValues: {
      ...params,
      dateRange: params.dateRange ? [dayjs(params.dateRange[0]), dayjs(params.dateRange[1])] : undefined
    }
  });

  useEffect(() => {
    if (isSearchModalOpen) {
      searchForm.reset({
        ...params,
        dateRange: params.dateRange ? [dayjs(params.dateRange[0]), dayjs(params.dateRange[1])] : undefined
      });
    }
  }, [isSearchModalOpen, params, searchForm]);

  const { data, isFetching } = useQuery({
    queryKey: ['customer-statements', params],
    queryFn: () => getApiV1SalesDeliveryStatisticsGroupByCustomer({
      query: {
        DateRange: params.dateRange as string[],
        CustomerCode: params.customerCode || undefined,
        pageNumber: params.pageNumber,
        pageSize: params.pageSize
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

  const handleClear = () => {
    searchForm.reset({
      customerCode: undefined,
      dateRange: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')]
    });
  };

  const handleSearch = (values: any) => {
    const formattedValues = { ...values };
    if (values.dateRange && Array.isArray(values.dateRange)) {
      formattedValues.dateRange = values.dateRange.map((d: any) => d ? (typeof d === 'string' ? d : d.format('YYYY-MM-DD')) : undefined).filter(Boolean);
    }
    setParams({ ...formattedValues, pageNumber: 1 });
    setIsSearchModalOpen(false);
  };

  const handlePrint = (row: SalesDeliveryGroupByCustomerDto) => {
    if (!params.dateRange || params.dateRange.length !== 2) return;
    
    downloadFile({
      apiFunction: () => getApiV1SalesDeliveryCustomerStatementReport({
        query: {
          DateRange: [dayjs(params.dateRange![0]).format('YYYY-MM-DD'), dayjs(params.dateRange![1]).format('YYYY-MM-DD')],
          CustomerCode: row.businessPartnerCode!,
          pageNumber: 1,
          pageSize: 100
        },
        // @ts-ignore
        responseType: 'blob'
      }),
      successMessage: '對帳單已於新分頁開啟',
      openInNewTab: true
    });
  };

  const columns = useMemo(() => getColumns(handlePrint, isDownloading), [isDownloading, params.dateRange]);

  return (
    <div className="p-[16px_16px_0px_16px] flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <Card
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 } }}
        title="對帳單報表"
        extra={
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => setIsSearchModalOpen(true)}>
              查詢條件
            </Button>
          </Space>
        }
      >
        <div className="mb-4 flex items-center p-[12px_16px]" style={{flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', borderRadius: '6px', flexShrink: 0 }}>
          <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>目前的查詢條件:</span>
          <DynamicSearchTags
            config={searchConfig}
            params={queryFields}
            onClose={(key) => setParams({ [key]: undefined, pageNumber: 1 })}
          />
        </div>
        
        <div className="px-6 py-4 flex flex-col gap-4 overflow-hidden flex-1">
          <Descriptions bordered size="small" column={4}>
            <Descriptions.Item label="客戶">
              {summaryInfo.customerCode} {summaryInfo.customerName ? ` - ${summaryInfo.customerName}` : ''}
            </Descriptions.Item>
            <Descriptions.Item label="查詢期間">{summaryInfo.dateRange}</Descriptions.Item>
            <Descriptions.Item label="客戶數量">{summaryInfo.totalCustomerCount}</Descriptions.Item>
            <Descriptions.Item label="單據數量">{summaryInfo.totalCount}</Descriptions.Item>
            <Descriptions.Item label="期間銷貨金額合計">
              <span style={{ color: '#18a058', fontWeight: 'bold' }}>
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

          <Table
            columns={columns}
            dataSource={tableData}
            rowKey={(row) => row.businessPartnerCode || ''}
            loading={isFetching}
            scroll={{ x: 'max-content', y: 300 }}
            size="middle"
            pagination={{
              current: params.pageNumber,
              pageSize: params.pageSize,
              total: totalRecords,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `共 ${total} 項`,
              onChange: (p, s) => setParams({ pageNumber: p, pageSize: s })
            }}
          />
        </div>
      </Card>

      <Modal
        title="查詢條件"
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        width={MODAL_WIDTH_SEARCH}
        footer={[
          <Button key="clear" onClick={handleClear}>
            清除
          </Button>,
          <Button key="submit" type="primary" onClick={() => searchForm.handleSubmit(handleSearch)()}>
            搜尋
          </Button>
        ]}
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
          onSearch={handleSearch}
        />
      </Modal>
    </div>
  );
}
