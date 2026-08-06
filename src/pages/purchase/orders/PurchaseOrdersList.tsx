// @ts-nocheck
import PageCard from '@/components/common/PageCard';
import { useMemo } from 'react';
import { Button, Space, App, Divider, Modal } from 'antd';
import { PlusOutlined, SearchOutlined, ClearOutlined, PrinterOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { getApiV1PurchaseOrder, deleteApiV1PurchaseOrderByCode } from '@/api/generated/sdk.gen';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { TableActions } from '@/utils/tableActions';
import { DocumentWatchButton } from '@/components/common/DocumentWatchButton';
import { DEFAULT_PAGE_SIZE, MODAL_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT } from '@/constants/ui';
import { useAuthStore } from '@/stores/useAuthStore';
import type { PurchaseOrderDto } from '@/api/generated/types.gen';
import usePurchaseOrderQueryStore from './usePurchaseOrderQueryStore';
import { searchConfig, getColumns } from './PurchaseOrderConfig';

import { getApiErrorMessage } from '@/utils/apiError';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { useFileDownload } from '@/hooks/useFileDownload';
import { getApiV1PurchaseOrderByCodePdf } from '@/api/generated/sdk.gen';

export default function PurchaseOrdersList() {
  const navigate = useNavigate();
  const { id: viewId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { hasPermission } = useAuthStore();
  const { params, setParams } = usePurchaseOrderQueryStore();

  const { downloadFile } = useFileDownload();

  const handlePrintPo = (code: string) => {
    downloadFile({
      apiFunction: () => getApiV1PurchaseOrderByCodePdf({
        path: { code },
        responseType: "blob"
      }),
      successMessage: "採購單報表 PDF 導出成功！",
      filename: `PO-${code}.pdf`,
      openInNewTab: true
    });
  };

  const listQuery = useErpListQuery({
    params,
    setParams,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => getApiV1PurchaseOrder({ query: params as any }),
  });

  const resData = data?.data as any;
  const listDataRaw = resData?.data?.data || resData?.data || resData;
  const listData: PurchaseOrderDto[] = Array.isArray(listDataRaw) ? listDataRaw : [];
  const total = resData?.data?.totalRecords || resData?.totalRecords || listData.length;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiV1PurchaseOrderByCode({ path: { code: id } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
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

  const columns = useMemo(() => {
    const baseColumns = getColumns();
    const actionColumn = {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: PurchaseOrderDto) => {
        const canView = hasPermission('Purchase.Orders.View');
        const canUpdate = hasPermission('Purchase.Orders.Update');
        const canDelete = hasPermission('Purchase.Orders.Delete');
        const isDraft = (record.status || '').toUpperCase() === 'DRAFT';

        return (
          <TableActions
            onView={(canView || canUpdate) ? () => navigate(`/purchase/orders/${record.code}`) : undefined}
            onDelete={(canDelete && isDraft) ? () => deleteMutation.mutate(record.code!) : undefined}
            recordName={`採購單 ${record.code}`}
            deleteConfirmType="modal"
            extra={
              <Space size={4}>
                <DocumentWatchButton
                  documentType="PurchaseOrder"
                  documentKey={record.code}
                  compact={true}
                />
                {!isDraft && (
                  <Button
                    size="small"
                    type="text"
                    icon={<PrinterOutlined style={{ color: '#722ed1' }} />}
                    onClick={() => handlePrintPo(record.code!)}
                    title="列印採購報表"
                  />
                )}
              </Space>
            }
          />
        );
      },
    };
    return buildTableColumns(baseColumns, actionColumn, params.SortRules);
  }, [hasPermission, navigate, modal, deleteMutation, params.SortRules, handlePrintPo]);

  return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard title="採購單管理" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={listQuery.openSearchModal}
            >
              查詢
            </Button>
            {hasPermission('Purchase.Orders.Create') && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => navigate('/purchase/orders/create')}
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
            onChange={handleTableChange}
            columns={columns}
            dataSource={listData}
            rowKey="code"
            loading={isLoading}
            selectedRowId={viewId}
            selectedRowKey="code"
            pagination={{
              current: params.pageNumber || 1,
              pageSize: params.pageSize || DEFAULT_PAGE_SIZE,
              total,
            }}
          />
        </div>
      </PageCard>

      <Modal
        title={
          <div className="font-semibold pb-3 mb-2 text-[18px] border-b border-[var(--ant-color-border-secondary)]">
            採購單查詢條件設定
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
          onSearch={listQuery.handleSearch} 
        />
      </Modal>
    </div>
  );
}
