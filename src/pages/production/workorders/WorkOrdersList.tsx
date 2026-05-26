// @ts-nocheck
import PageCard from '@/components/common/PageCard';
import React, { useState } from "react";
import { App, Space, Button, Modal, Divider } from 'antd';
import { PlusOutlined, ClearOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { 
  getApiV1WorkOrder, 
  deleteApiV1WorkOrderByWorkOrderNumber,
  getApiV1WorkOrderByWorkOrderNumberReport
} from "@/api/generated/sdk.gen";
import type { WorkOrderDto } from "@/api/generated/types.gen";
import DynamicSearchForm from "@/components/Form/DynamicSearchForm";
import { buildTableColumns, formatSorterToRules } from "@/utils/tableUtils";
import { TableActions } from "@/utils/tableActions";
import { DocumentWatchButton } from "@/components/common/DocumentWatchButton";
import { searchConfig, tableColumns } from "./WorkOrderConfig";
import { useWorkOrderQueryStore } from "./useWorkOrderQueryStore";
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';
import { useFileDownload } from '@/hooks/useFileDownload';
import { WorkOrderDrawer } from "./WorkOrderDrawer";
import { MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from "@/constants";
import { getApiErrorMessage } from "@/utils/apiError";

export const WorkOrdersList: React.FC = () => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { viewId } = useParams();

  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const { searchParams, pagination, setSearchParams, setPagination } = useWorkOrderQueryStore();
  const listQuery = useErpListQuery({
    params: { ...searchParams, pageNumber: pagination.page, pageSize: pagination.pageSize },
    setParams: (newParams) => {
      const { pageNumber, pageSize, ...query } = newParams;
      // 讀取 Zustand Store 當前最新的實際狀態以合併，避免分頁變更或連續更新時將已存在的查詢條件覆蓋/清除
      const currentSearchParams = useWorkOrderQueryStore.getState().searchParams;
      setSearchParams({ ...currentSearchParams, ...query });
      setPagination(pageNumber || 1, pageSize || 20);
    }
  });

  const { downloadFile, isDownloading } = useFileDownload();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["workorders", searchParams, pagination],
    queryFn: () =>
      getApiV1WorkOrder({
        query: {
          WorkOrderNumber: searchParams.workOrderNumber || undefined,
          OrderNumber: searchParams.orderNumber || undefined,
          ProductCodeOrName: searchParams.productCodeOrName || undefined,
          MachineCode: searchParams.machineCode || undefined,
          WorkOrderDate: searchParams.workOrderDate || undefined,
          ProductionDate: searchParams.productionDate || undefined,
          Status: searchParams.status || undefined,
          Others: searchParams.others || undefined,
          pageNumber: pagination.page,
          pageSize: pagination.pageSize,
          SortRules: searchParams.SortRules || undefined,
        } as any
      }),
  });

  const resData = data?.data as any;
  const listDataRaw = resData?.data?.data || resData?.data || resData;
  const listData: WorkOrderDto[] = Array.isArray(listDataRaw) ? listDataRaw : [];
  const total = resData?.data?.totalRecords || resData?.totalRecords || listData.length;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      setDeletingRecordId(id);
      return deleteApiV1WorkOrderByWorkOrderNumber({ path: { workOrderNumber: id } });
    },
    onSuccess: () => {
      message.success("刪除成功");
      queryClient.invalidateQueries({ queryKey: ["workorders"] });
    },
    onError: (error) => {
      modal.error({ title: "刪除失敗", content: getApiErrorMessage(error), centered: true });
    },
    onSettled: () => {
      setDeletingRecordId(null);
    }
  });

  const openDrawer = (id?: string) => {
    if (id) navigate(`/production/workorders/${id}`);
    else navigate(`/production/workorders/new`);
  };

  const closeDrawer = () => {
    navigate(`/production/workorders`);
  };

  const actionColumn = {
    title: "操作",
    key: "action",
    fixed: 'right' as const,
    width: 160, // 檢視/列印/刪除/關注 多重按鈕，設為 160
    render: (_: any, record: WorkOrderDto) => (
      <TableActions
        onView={() => openDrawer(record.workOrderNumber || undefined)}
        onPrint={record.status !== "Draft" ? () => {
          downloadFile({
            apiFunction: () => getApiV1WorkOrderByWorkOrderNumberReport({ 
              path: { workOrderNumber: record.workOrderNumber as string },
              // @ts-ignore
              responseType: 'blob' 
            }),
            successMessage: '製令單已於新分頁開啟',
            openInNewTab: true
          });
        } : undefined}
        onDelete={record.status === "Draft" ? () => deleteMutation.mutate(record.workOrderNumber as string) : undefined}
        recordName={`製令單 ${record.workOrderNumber}`}
        deleteConfirmType="modal"
        isPrinting={isDownloading}
        extra={
          <DocumentWatchButton
            documentType="WorkOrder"
            documentKey={record.workOrderNumber}
            compact={true}
          />
        }
      />
    ),
  };

  const handleTableChange = (paginationInfo: any, _filters: any, sorter: any) => {
    const sortRules = formatSorterToRules(sorter);
    setSearchParams({
      ...searchParams,
      SortRules: sortRules || undefined,
    });
    setPagination(paginationInfo.current || 1, paginationInfo.pageSize || 20);
  };

  const columns = buildTableColumns(tableColumns, actionColumn, searchParams.SortRules);

  const params = { ...searchParams, pageNumber: pagination.page, pageSize: pagination.pageSize };

  return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard title="製令管理" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={listQuery.openSearchModal}
              className="font-medium"
            >
              查詢
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => openDrawer()}
              className="font-medium"
            >
              新增資料
            </Button>
          </Space>
        }>
        <ActiveQueryAndSortTags
          searchConfig={searchConfig}
          tableColumns={tableColumns}
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
            rowKey="workOrderNumber"
            loading={isLoading || isFetching}
            selectedRowId={viewId}
            selectedRowKey="workOrderNumber"
            deletingRowId={deletingRecordId}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: total,
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
        mask={{ closable: true }}
        keyboard={true}
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
        <DynamicSearchForm config={searchConfig} form={listQuery.searchForm} onSearch={listQuery.handleSearch} />
      </Modal>

      {(viewId !== undefined || window.location.pathname.endsWith("/new")) && (
        <WorkOrderDrawer
          id={viewId !== "new" ? viewId : undefined}
          isCreateMode={viewId === "new"}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
};
