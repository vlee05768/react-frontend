import PageCard from '@/components/common/PageCard';
import { useForm } from 'react-hook-form';
import React, { useMemo } from "react";
import { App, Space, Button, Table, Modal, Tag } from 'antd';
import { PlusOutlined, ClearOutlined, SearchOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { 
  getApiV1WorkOrder, 
  deleteApiV1WorkOrderByWorkOrderNumber,
  getApiV1WorkOrderByWorkOrderNumberReport
} from "@/api/generated/sdk.gen";
import type { WorkOrderDto } from "@/api/generated/types.gen";
import DynamicSearchTags from "@/components/Form/DynamicSearchTags";
import DynamicSearchForm from "@/components/Form/DynamicSearchForm";
import { buildTableColumns, formatSorterToRules, getColumnLabel } from "@/utils/tableUtils";
import { TableActions } from "@/utils/tableActions";
import { searchConfig, tableColumns } from "./WorkOrderConfig";
import { useWorkOrderQueryStore } from "./useWorkOrderQueryStore";
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';
import { useFileDownload } from '@/hooks/useFileDownload';
import { WorkOrderDrawer } from "./WorkOrderDrawer";
import { MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from "@/constants";
import { getApiErrorMessage } from "@/utils/apiError";

export const WorkOrdersList: React.FC = () => {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { viewId } = useParams();

  
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  
  const {
    searchParams,
    pagination,
    setSearchParams,
    setPagination,
  } = useWorkOrderQueryStore();

  const { page, pageNumber, pageSize, ...queryFields } = { ...searchParams, ...pagination };
  useUrlQuerySync({
    query: queryFields,
    page: page || pageNumber || 1,
    pageSize: pageSize || 20,
    setPagination: (p, s) => setPagination(p, s),
    setQuery: (q) => { setSearchParams(q); setPagination(1, pagination.pageSize); }
  });
  const searchForm = useForm({ values: searchParams });

  const { downloadFile, isDownloading } = useFileDownload();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["workorders", searchParams, pagination],
    queryFn: () =>
      getApiV1WorkOrder({
        query: {
          ...searchParams,
          pageNumber: pagination.page,
          pageSize: pagination.pageSize,
        }
      }),
  });

  const resData = data?.data as any;
  const listDataRaw = resData?.data?.data || resData?.data || resData;
  const listData: WorkOrderDto[] = Array.isArray(listDataRaw) ? listDataRaw : [];
  const total = resData?.data?.totalRecords || resData?.totalRecords || listData.length;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiV1WorkOrderByWorkOrderNumber({ path: { workOrderNumber: id } }),
    onSuccess: () => {
      message.success("刪除成功");
      queryClient.invalidateQueries({ queryKey: ["workorders"] });
    },
    onError: (error) => {
      modal.error({ title: "刪除失敗", content: getApiErrorMessage(error), centered: true });
    },
  });

  const handleDelete = (id: string) => {
    modal.confirm({
      title: "確認刪除",
      content: `確定要刪除製令 ${id} 嗎？`,
      centered: true,
      width: 400,
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(id),
    });
  };

  // Old mutation removed, using useFileDownload instead

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
    width: 120, // 檢視 + 列印 或 檢視 + 刪除 都是雙按鈕，寬度設為 120 即可
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
        onDelete={record.status === "Draft" ? () => handleDelete(record.workOrderNumber as string) : undefined}
        recordName={`製令單 ${record.workOrderNumber}`}
        deleteConfirmType="modal"
        isPrinting={isDownloading}
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

  const columns = useMemo(() => buildTableColumns(tableColumns, actionColumn, searchParams.SortRules), [searchParams.SortRules]);

  return (
    <div className="p-4 pb-0 flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <PageCard title="製令管理" extra={
          <Space>
            <Button onClick={() => setIsSearchOpen(true)}>查詢</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              新增
            </Button>
          </Space>
        }>
        <div className="mb-4 flex items-center py-3 px-4" style={{flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', borderRadius: '6px', flexShrink: 0, gap: '16px' }}>
          <div className="flex items-center" style={{ flexWrap: 'wrap' }}>
            <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>目前的查詢條件:</span>
            <DynamicSearchTags
              config={searchConfig}
              params={searchParams}
              onClose={(key) => setSearchParams({ ...searchParams, [key]: undefined })}
            />
          </div>
          {searchParams.SortRules && (
            <div className="flex items-center" style={{ flexWrap: 'wrap', paddingLeft: '16px', borderLeft: '1px solid #d9d9d9' }}>
              <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>排序順序:</span>
              <Space size={[4, 8]} wrap>
                {searchParams.SortRules.split(',').map((rule: string) => {
                  const [field, order] = rule.split(':');
                  const label = getColumnLabel(field, tableColumns);
                  const orderText = order === 'asc' ? '升序 ↗' : '降序 ↘';
                  return (
                    <Tag
                      key={field}
                      color="blue"
                      closable
                      onClose={() => {
                        const remainingRules = searchParams.SortRules.split(',')
                          .filter((r: string) => !r.startsWith(`${field}:`))
                          .join(',');
                        setSearchParams({
                          ...searchParams,
                          SortRules: remainingRules || undefined,
                        });
                        setPagination(1, pagination.pageSize);
                      }}
                    >
                      {label} ({orderText})
                    </Tag>
                  );
                })}
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                  onClick={() => {
                    setSearchParams({
                      ...searchParams,
                      SortRules: undefined,
                    });
                    setPagination(1, pagination.pageSize);
                  }}
                >
                  清除排序
                </Button>
              </Space>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          
          <Table
            onChange={handleTableChange}
            bordered
            size="small"
            rowKey="workOrderNumber"
            dataSource={listData}
            columns={columns}
            loading={isLoading || isFetching}
            rowClassName={(record) => record.workOrderNumber === viewId ? "selected-table-row" : ""}
            scroll={{ x: 'max-content', y: 300 }}
            style={{ flex: 1 }}
            pagination={{
              current: pagination.page,
              pageSize: pagination.pageSize,
              total: total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 筆資料`,
              onChange: (page, pageSize) => setPagination(page, pageSize),
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
        open={isSearchOpen}
        mask={{ closable: true }}
        keyboard={true}
        onCancel={() => setIsSearchOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2" style={{borderTop: '1px solid #f0f0f0'}}>
            <Button icon={<ClearOutlined />} onClick={() => {
              const emptyVals = Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = undefined; return acc; }, {});
              searchForm.reset(emptyVals);
              { setSearchParams(emptyVals); setPagination(1, pagination.pageSize); }
            }}>
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
          config={searchConfig}
          form={searchForm}
          onSearch={(values) => {
            setSearchParams(values);
            setIsSearchOpen(false);
          }}
        />
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
