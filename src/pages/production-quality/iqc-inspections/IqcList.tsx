// @ts-nocheck
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import PageCard from '@/components/common/PageCard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Button, Modal, Space, Divider } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { getApiV1IqcInspection } from '@/api/generated';
import { useFileDownload } from '@/hooks/useFileDownload';
import { client } from '@/api/generated/client.gen';
import { useIqcQueryStore } from './useIqcQueryStore';
import { iqcSearchConfig, mainTableColumns } from './IqcConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import StandardErpTable from '@/components/Table/StandardErpTable';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import IqcDrawer from './IqcDrawer';
import { TableActions } from '@/utils/tableActions';
import { MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants/ui';

export default function IqcList() {
  const queryClient = useQueryClient();
  const { params, setParams } = useIqcQueryStore();
  const location = useLocation();

  const [activeIqcId, setActiveIqcId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { downloadFile } = useFileDownload();

  const handlePrintLabels = (iqcRecordId: string) => {
    downloadFile({
      apiFunction: () => client.get({
        url: `/api/v1/IqcInspection/${iqcRecordId}/labels-pdf`,
        responseType: 'blob'
      }),
      successMessage: 'LPN 卷卡合格標籤 PDF 導出成功！',
      filename: `LABELS-${iqcRecordId}.pdf`,
      openInNewTab: true
    });
  };

  // 1. 初始化分頁與查詢參數
  useEffect(() => {
    setParams({
      pageNumber: 1,
      pageSize: 20,
      iqcRecordId: '',
      lotNo: '',
      inspectionStatus: '',
      materialCode: '',
      checkDateRange: null,
      inspectorId: '',
    });
  }, [location.pathname, setParams]);

  const listQuery = useErpListQuery({
    params,
    setParams,
  });

  // 2. 獲取 API 資料
  const { data: response, isLoading, isFetching } = useQuery({
    queryKey: ['iqc-inspections', params],
    queryFn: () => getApiV1IqcInspection({
      query: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        IqcRecordId: params.iqcRecordId || undefined,
        LotNo: params.lotNo || undefined,
        InspectionStatus: params.inspectionStatus || undefined,
        MaterialCode: params.materialCode || undefined,
        CheckDateStart: params.checkDateRange && params.checkDateRange[0]
          ? dayjs(params.checkDateRange[0]).startOf('day').toISOString()
          : undefined,
        CheckDateEnd: params.checkDateRange && params.checkDateRange[1]
          ? dayjs(params.checkDateRange[1]).endOf('day').toISOString()
          : undefined,
        InspectorId: params.inspectorId || undefined,
        SortRules: params.SortRules || undefined,
      } as any,
    }),
  });

  const list = response?.data?.data?.data || [];
  const total = response?.data?.data?.totalRecords || 0;

  // 3. 表格操作
  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
    align: 'center' as const, // 💡 UX/UI 優化：強制置中對齊，讓表頭「操作」與內容圖標完美垂直居中對齊
    render: (_: any, record: any) => {
      const isPending = record.inspectionStatus === 'Pending' || record.inspectionStatus === 'FullInspecting';
      const isCompleted = record.inspectionStatus === 'AllPass' || record.inspectionStatus === 'ConcessionApproved' || record.inspectionStatus === 'Partial';
      return (
        <TableActions
          onView={() => {
            setActiveIqcId(record.iqcRecordId);
            setIsDrawerOpen(true);
          }}
          recordName={record.iqcRecordId}
          onPrint={isCompleted ? () => handlePrintLabels(record.iqcRecordId) : undefined}
          customActions={isPending ? [
            {
              key: 'inspect',
              label: '檢驗錄入',
              type: 'primary',
              onClick: () => {
                setActiveIqcId(record.iqcRecordId);
                setIsDrawerOpen(true);
              }
            }
          ] : []}
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
        title="IQC 進料品質檢驗" 
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button type="default" icon={<SearchOutlined />} onClick={listQuery.openSearchModal}>
              查詢
            </Button>
          </Space>
        }
      >
        {/* 作用中的搜尋與排序標籤 */}
        <ActiveQueryAndSortTags
          searchConfig={iqcSearchConfig()}
          tableColumns={mainTableColumns()}
          params={params}
          onQueryTagClose={listQuery.handleClearQueryField}
          onSortTagClose={listQuery.handleClearSortField}
          onClearSort={listQuery.handleClearAllSort}
        />

        {/* 數據表格 */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <StandardErpTable
            loading={isLoading || isFetching}
            columns={columns}
            dataSource={list}
            rowKey="iqcRecordId"
            pagination={{
              current: params.pageNumber,
              pageSize: params.pageSize,
              total: total,
              showSizeChanger: true,
            }}
            onChange={handleTableChange}
          />
        </div>
      </PageCard>

      {/* 查詢條件設定彈出視窗 */}
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
          config={iqcSearchConfig()}
          form={listQuery.searchForm}
          onSearch={listQuery.handleSearch}
        />
      </Modal>

      {/* 品檢核心錄入視窗 */}
      <IqcDrawer
        iqcRecordId={activeIqcId}
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setActiveIqcId(null);
          queryClient.invalidateQueries({ queryKey: ['iqc-inspections'] });
        }}
        onSuccess={() => {
          setIsDrawerOpen(false);
          setActiveIqcId(null);
          queryClient.invalidateQueries({ queryKey: ['iqc-inspections'] });
        }}
      />
    </div>
  );
}
