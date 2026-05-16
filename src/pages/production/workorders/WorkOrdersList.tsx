import { useForm } from 'react-hook-form';
import React, { useMemo } from "react";
import { App, Card, Space, Button, Table, Modal } from "antd";
import { PlusOutlined, DeleteOutlined, EyeOutlined, PrinterOutlined, ClearOutlined, SearchOutlined } from "@ant-design/icons";
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
import { buildTableColumns } from "@/utils/tableUtils";
import { searchConfig, tableColumns } from "./WorkOrderConfig";
import { useWorkOrderQueryStore } from "./useWorkOrderQueryStore";
// import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';
import { useFileDownload } from '@/hooks/useFileDownload';
import { WorkOrderDrawer } from "./WorkOrderDrawer";
import { MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from "@/constants";
import { TABLE_ACTION_ICON_SIZE } from "@/constants/ui";
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
    width: 140,
    render: (_: any, record: WorkOrderDto) => (
      <Space size="small">
        <Button
          type="text"
          icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />}
          onClick={() => openDrawer(record.workOrderNumber || undefined)}
          title="檢視/編輯"
        />
        
        {record.status !== "Draft" && (
          <Button
            type="text"
            icon={<PrinterOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />}
            onClick={() => {
              downloadFile({
                apiFunction: () => getApiV1WorkOrderByWorkOrderNumberReport({ 
                  path: { workOrderNumber: record.workOrderNumber as string },
                  // @ts-ignore
                  responseType: 'blob' 
                }),
                successMessage: '製令單已於新分頁開啟',
                openInNewTab: true
              });
            }}
            loading={isDownloading}
          />
        )}

        {record.status === "Draft" && (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />}
            onClick={() => handleDelete(record.workOrderNumber as string)}
            title="刪除"
          />
        )}
      </Space>
    ),
  };

  const columns = useMemo(() => buildTableColumns(tableColumns, actionColumn), []);

  return (
    <div className="p-[16px 16px 0px 16px] flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <Card
        variant="borderless"
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
          body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 16px 4px 16px' }
        }}
        className="flex flex-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 0 }}
        title={
          <Space>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <span className="font-semibold" style={{fontSize: '18px'}}>製令管理</span>
          </Space>
        }
        extra={
          <Space>
            <Button onClick={() => setIsSearchOpen(true)}>查詢</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()}>
              新增
            </Button>
          </Space>
        }
      >
        <div className="mb-4 flex items-center p-[12px 16px]" style={{flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', borderRadius: '6px', flexShrink: 0 }}>
          <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>目前的查詢條件:</span>
          <DynamicSearchTags
            config={searchConfig}
            params={searchParams}
            onClose={(key) => setSearchParams({ ...searchParams, [key]: undefined })}
          />
        </div>

        <div className="flex flex-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <style>{`
            .ant-table-wrapper { height: 100%; display: flex; flex-direction: column; }
            .ant-spin-nested-loading { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-spin { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-spin-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .ant-table-body { flex: 1; overflow-y: auto !important; max-height: none !important; }
            .ant-table-pagination { margin-top: auto !important; margin-bottom: 0 !important; }
            .ant-table-thead > tr > th { text-align: center !important; }
          `}</style>
          <Table
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
      </Card>

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
            <Button icon={<ClearOutlined />} onClick={() => searchForm.reset(Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = null; return acc; }, {}))}>
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
