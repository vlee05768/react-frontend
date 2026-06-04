// @ts-nocheck
import PageCard from '@/components/common/PageCard';
import { useMemo } from 'react';
import { Button, Space, App, Modal, Divider } from 'antd';
import { PlusOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { 
  getApiV1SalesDelivery, 
  deleteApiV1SalesDeliveryByMovementNumber,
  getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport
} from '@/api/generated/sdk.gen';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { TableActions } from '@/utils/tableActions';
import { DocumentWatchButton } from '@/components/common/DocumentWatchButton';
import { MODAL_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT } from '@/constants/ui';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SalesDeliveryDto } from '@/api/generated/types.gen';
import useSalesDeliveryQueryStore from './useSalesDeliveryQueryStore';
import { searchConfig, getColumns } from './SalesDeliveryConfig';
import { getApiErrorMessage } from '@/utils/apiError';
import { useFileDownload } from '@/hooks/useFileDownload';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';

export default function SalesDeliveriesList() {
  const navigate = useNavigate();
  const { id: viewId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { hasPermission } = useAuthStore();
  const { params, setParams } = useSalesDeliveryQueryStore();

  const listQuery = useErpListQuery({
    params,
    setParams,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['salesdeliveries', params],
    queryFn: () => getApiV1SalesDelivery({ query: params as any }),
  });

  const resData = data?.data as any;
  const listDataRaw = resData?.data?.data || resData?.data || resData;
  const listData: SalesDeliveryDto[] = Array.isArray(listDataRaw) ? listDataRaw : [];
  const total = resData?.data?.totalRecords || resData?.totalRecords || listData.length;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiV1SalesDeliveryByMovementNumber({ path: { movementNumber: id } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['salesdeliveries'] });
    },
    onError: (error) => {
      modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const handleTableChange = (pagination: any, _: any, sorter: any) => {
    const rules = formatSorterToRules(sorter);
    setParams({ 
      pageNumber: pagination.current, 
      pageSize: pagination.pageSize,
      SortRules: rules || undefined
    });
  };

  const { downloadFile, isDownloading } = useFileDownload();

  const columns = useMemo(() => {
    const baseColumns = getColumns();
    const actionColumn = {
      title: '操作',
      key: 'action',
      width: 160, // 檢視/列印/刪除/關注 多重按鈕，設為 160
      fixed: 'right' as const,
      render: (_: any, record: SalesDeliveryDto) => {
        const canView = hasPermission('Sales.Deliveries.View');
        const canUpdate = hasPermission('Sales.Deliveries.Update');
        const canDelete = hasPermission('Sales.Deliveries.Delete');
        const canConfirm = hasPermission('Sales.Deliveries.Update'); // Assuming same perm

        return (
          <TableActions
            onView={(canView || canUpdate) ? () => navigate(`/sales/sales-deliveries/${record.documentNumber}`) : undefined}
            onPrint={(record.confirmDate && canConfirm) ? () => {
              downloadFile({
                apiFunction: () => getApiV1SalesDeliveryByMovementNumberSalesDeliveryReport({ 
                  path: { movementNumber: record.documentNumber! },
                  // @ts-ignore
                  responseType: 'blob'
                }),
                successMessage: '銷貨單報表已於新分頁開啟',
                openInNewTab: true
              });
            } : undefined}
            onDelete={(!record.confirmDate && canDelete) ? () => deleteMutation.mutate(record.documentNumber!) : undefined}
            recordName={`銷貨單 ${record.documentNumber}`}
            deleteConfirmType="modal"
            isPrinting={isDownloading}
            extra={
              <DocumentWatchButton
                documentType="SalesDelivery"
                documentKey={record.documentNumber}
                compact={true}
              />
            }
          />
        );
      }
    };
    return buildTableColumns(baseColumns, actionColumn, params.SortRules);
  }, [hasPermission, navigate, modal, deleteMutation, isDownloading, params.SortRules]);

  return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard title="銷貨單管理" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={listQuery.openSearchModal}
            >
              查詢
            </Button>
            {hasPermission('Sales.Deliveries.Create') && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => navigate('/sales/sales-deliveries/create')}
              >
                新增資料
              </Button>
            )}
          </Space>
        }>
        
        <ActiveQueryAndSortTags
          searchConfig={searchConfig}
          tableColumns={getColumns()}
          params={params}
          onQueryTagClose={listQuery.handleClearQueryField}
          onSortTagClose={listQuery.handleClearSortField}
          onClearSort={listQuery.handleClearAllSort}
        />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <StandardErpTable
            columns={columns}
            dataSource={listData}
            rowKey="documentNumber"
            selectedRowId={viewId}
            selectedRowKey="documentNumber"
            loading={isLoading}
            pagination={{ 
              current: params.pageNumber || 1, 
              pageSize: params.pageSize, 
              total,
            }}
            onChange={handleTableChange}
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
