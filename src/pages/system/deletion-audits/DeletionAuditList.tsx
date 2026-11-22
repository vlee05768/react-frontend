import React, { useState, useMemo } from 'react';
import { Button, Modal } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PageCard } from '@/components/common/PageCard';
import StandardErpTable from '@/components/Table/StandardErpTable';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import { useAuthStore } from '@/stores/useAuthStore';
import { useDeletionAuditQueryStore } from '@/stores/systemStore';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { MODAL_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT } from '@/constants/ui';
import { getDeletionAudits } from '@/api/deletionAudits';
import type { DeletionAuditDto } from '@/api/deletionAudits';
import {
  deletionAuditTableColumns,
  buildActionColumn,
  deletionAuditSearchConfig,
} from './DeletionAuditConfig';
import { SnapshotModal } from './SnapshotModal';

export default function DeletionAuditList(): React.ReactElement {
  const { hasPermission } = useAuthStore();
  const canReadAudit = hasPermission('audit:read');

  const { params, setParams } = useDeletionAuditQueryStore();
  const searchConfig = useMemo(() => deletionAuditSearchConfig(), []);

  const listQuery = useErpListQuery({
    params,
    setParams,
    searchConfig,
  });

  const [selectedRecord, setSelectedRecord] = useState<DeletionAuditDto | null>(null);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  const handleOpenSnapshot = (record: DeletionAuditDto) => {
    setSelectedRecord(record);
    setIsSnapshotOpen(true);
  };

  const actionColumn = useMemo(
    () => buildActionColumn(handleOpenSnapshot),
    []
  );

  const rawColumns = useMemo(
    () => deletionAuditTableColumns(),
    []
  );

  const columns = useMemo(
    () =>
      buildTableColumns(
        rawColumns,
        actionColumn,
        params.SortRules,
        { showAudit: false }
      ),
    [rawColumns, actionColumn, params.SortRules]
  );

  const { data: response, isLoading, isFetching } = useQuery({
    queryKey: ['deletion-audits', params],
    queryFn: ({ signal }) => {
      let startDate = params.StartDate;
      let endDate = params.EndDate;
      if (params.dateRange && Array.isArray(params.dateRange) && params.dateRange.length === 2) {
        startDate = dayjs(params.dateRange[0]).startOf('day').toISOString();
        endDate = dayjs(params.dateRange[1]).endOf('day').toISOString();
      }

      return getDeletionAudits(
        {
          pageNumber: params.pageNumber || 1,
          pageSize: params.pageSize || 20,
          SortRules: params.SortRules,
          StartDate: startDate,
          EndDate: endDate,
          Actor: params.actor || params.Actor,
          EntityType: params.entityType || params.EntityType,
          EntityCode: params.entityCode || params.EntityCode,
          RelatedDocumentCode: params.relatedDocumentCode || params.RelatedDocumentCode,
          Outcome: params.outcome || params.Outcome,
          DeletionMode: params.deletionMode || params.DeletionMode,
        },
        signal
      );
    },
    enabled: canReadAudit,
  });

  const pagedResult = (response?.data as any)?.data ? (response?.data as any) : response;
  const dataList: DeletionAuditDto[] = useMemo(() => {
    if (Array.isArray(pagedResult?.data)) return pagedResult.data;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  }, [pagedResult, response]);

  const totalRecords: number = pagedResult?.totalRecords ?? (response as any)?.totalRecords ?? 0;

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    const sortRules = formatSorterToRules(sorter);
    setParams({
      pageNumber: pagination.current || 1,
      pageSize: pagination.pageSize || 20,
      SortRules: sortRules,
    });
  };

  if (!canReadAudit) {
    return (
      <PageCard title="刪除稽核查詢">
        <div className="h-full w-full flex items-center justify-center p-12">
          <div className="text-center" data-testid="no-permission-warning">
            <h1 className="text-5xl font-bold text-gray-700 dark:text-gray-300 mb-4">403</h1>
            <p className="text-gray-500 dark:text-gray-400 text-base mb-6">
              抱歉，您沒有權限訪問「刪除稽核查詢」頁面（需要 audit:read 權限）。
            </p>
          </div>
        </div>
      </PageCard>
    );
  }

  return (
    <>
      <PageCard
        title="刪除稽核查詢"
        extra={
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={listQuery.openSearchModal}
          >
            進階查詢
          </Button>
        }
      >
        <ActiveQueryAndSortTags
          searchConfig={searchConfig}
          tableColumns={columns}
          params={params}
          onQueryTagClose={listQuery.handleClearQueryField}
          onSortTagClose={listQuery.handleClearSortField}
          onClearSort={listQuery.handleClearAllSort}
        />

        <StandardErpTable<DeletionAuditDto>
          columns={columns}
          dataSource={dataList}
          loading={isLoading || isFetching}
          rowKey={(record) => record.id ?? record.eventId}
          pagination={{
            current: params.pageNumber || 1,
            pageSize: params.pageSize || 20,
            total: totalRecords,
          }}
          onChange={handleTableChange}
        />
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
            <Button
              type="primary"
              icon={<SearchOutlined />}
              htmlType="submit"
              form="search-form"
            >
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
            padding: '24px 24px 0 24px',
          },
        }}
        closeIcon={true}
      >
        <DynamicSearchForm
          config={searchConfig}
          form={listQuery.searchForm}
          onSearch={listQuery.handleSearch}
        />
      </Modal>

      <SnapshotModal
        open={isSnapshotOpen}
        record={selectedRecord}
        onClose={() => setIsSnapshotOpen(false)}
      />
    </>
  );
}
