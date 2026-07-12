// @ts-nocheck
import PageCard from '@/components/common/PageCard';
import { Tag } from 'antd';
import { ActionButton } from "@/components/common/ActionButton";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { Spin, Table, Button, Space, Drawer, App, Divider, Modal } from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined
, ClearOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1InventoryAdjustment, 
  getApiV1InventoryAdjustmentByMovementNumber,
  postApiV1InventoryAdjustment,
  putApiV1InventoryAdjustmentByMovementNumber,
  deleteApiV1InventoryAdjustmentByMovementNumber,
  postApiV1InventoryAdjustmentByMovementNumberConfirm,
  postApiV1InventoryAdjustmentByMovementNumberCancelConfirm
} from '@/api/generated/sdk.gen';
import { getApiErrorMessage } from '@/utils/apiError';
import { create } from 'zustand';
import { useAuthStore } from '@/stores/useAuthStore';
import { DynamicForm } from '@/components/Form/DynamicForm';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { mainSearchFormConfig, mainFormConfig, mainTableColumns, getStatusTag } from './InventoryAdjustmentConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { TableActions } from '@/utils/tableActions';
import { ANIMATION_DELAY_MS, DEFAULT_PAGE_SIZE, DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';
import dayjs from 'dayjs';

// Detail Tabs
import InventoryAdjustmentItemsTab from './Tabs/InventoryAdjustmentItemsTab';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';


// Local store for query params
export const useInventoryAdjustmentQueryStore = create((set) => ({
  params: {
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    DocumentNumber: undefined,
    DateRange: undefined,
    Others: undefined,
  },
  setParams: (newParams: any) => set((state: any) => ({ params: { ...state.params, ...newParams } })),
  resetParams: () => set({ params: { pageNumber: 1, pageSize: DEFAULT_PAGE_SIZE, DocumentNumber: undefined, DateRange: undefined, Others: undefined } }),
}));

export default function InventoryAdjustmentList() {
  const { message: messageApi, modal } = App.useApp();
  const params = useInventoryAdjustmentQueryStore((state: any) => state.params);
  const setParams = useInventoryAdjustmentQueryStore((state: any) => state.setParams);

  const listQuery = useErpListQuery({
    params,
    setParams,
  });

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('master_info');
  const hasAutoSwitchedRef = useRef(false);

  const { user } = useAuthStore();
  const searchForm = listQuery.searchForm;
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const [isHeaderEditing, setIsHeaderEditing] = useState(false);
  const isViewMode = !isDrawerEditing && !isCreateDrawerOpen;
  

  useEffect(() => {
    if (isCreateDrawerOpen || isDrawerEditing) {
      setTimeout(() => {
        const firstInput = document.querySelector('.ant-drawer-body form input:not([disabled]), .ant-drawer-body form textarea:not([disabled]), .ant-drawer-body form span.ant-select-selection-search-input:not([disabled])') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, ANIMATION_DELAY_MS);
    }
  }, [isCreateDrawerOpen, isDrawerEditing]);
  
  const queryClient = useQueryClient();
  const { viewId } = useParams<{ viewId: string }>(); 
  const navigate = useNavigate();

  // Detail query
  const { data: viewRes, isFetching: isFetchingView } = useQuery({
    queryKey: ['inventoryAdjustmentDetail', viewId],
    queryFn: () => getApiV1InventoryAdjustmentByMovementNumber({ path: { movementNumber: viewId as string } }),
    enabled: !!viewId,
  });
  const viewData = (viewRes?.data?.data || viewRes?.data) as any;

  useEffect(() => {
    hasAutoSwitchedRef.current = false;
  }, [viewData?.documentNumber]);

  useEffect(() => {
    if (isViewMode && viewData) {
      if (!hasAutoSwitchedRef.current) {
        if (Array.isArray(viewData.items) && viewData.items.length === 0) {
          setActiveTab('items');
        }
        hasAutoSwitchedRef.current = true;
      }
    }
  }, [isViewMode, viewData]);

  // List query
  const { data, isFetching } = useQuery({
    queryKey: ['inventoryAdjustmentList', params],
    queryFn: () => getApiV1InventoryAdjustment({ query: params as any }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;

  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1InventoryAdjustment({ body: values }),
    onSuccess: (res: any) => {
      messageApi.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentList'] });
      const newId = res?.data?.data?.documentNumber || res?.data?.documentNumber;
      if (newId) {
        setIsCreateDrawerOpen(false);
        setIsDrawerEditing(false);
        setActiveTab('items');
        navigate(`/warehouse/inventory-adjustments/${newId}`, { replace: true });
      }
    },
    onError: (err: any) => {
      modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(err)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => putApiV1InventoryAdjustmentByMovementNumber({ path: { movementNumber: viewId! }, body: values }),
    onSuccess: () => {
      messageApi.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentList'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentDetail', viewId] });
      setIsDrawerEditing(false);
    },
    onError: (err: any) => {
      modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(err)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiV1InventoryAdjustmentByMovementNumber({ path: { movementNumber: id } }),
    onSuccess: () => {
      messageApi.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentList'] });
    },
    onError: (err: any) => {
      modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(err)}` });
    }
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => postApiV1InventoryAdjustmentByMovementNumberConfirm({ path: { movementNumber: id } }),
    onSuccess: (_, id) => {
      messageApi.success('確認成功');
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentList'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentDetail', id] });
    },
    onError: (err: any) => {
      modal.error({ centered: true, title: '錯誤提示', content: `確認失敗: ${getApiErrorMessage(err)}` });
    }
  });

  const cancelConfirmMutation = useMutation({
    mutationFn: (id: string) => postApiV1InventoryAdjustmentByMovementNumberCancelConfirm({ path: { movementNumber: id } }),
    onSuccess: (_, id) => {
      messageApi.success('取消確認成功');
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentList'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryAdjustmentDetail', id] });
    },
    onError: (err: any) => {
      modal.error({ centered: true, title: '錯誤提示', content: `取消確認失敗: ${getApiErrorMessage(err)}` });
    }
  });

  const openCreateDrawer = () => {
    setActiveTab('master_info');
    setIsCreateDrawerOpen(true);
  };

  const closeCreateDrawer = () => {
    setIsCreateDrawerOpen(false);
  };

  const openViewDrawer = (record: any) => {
    setActiveTab('master_info');
    navigate(`/warehouse/inventory-adjustments/${record.documentNumber}`);
  };

  const closeViewDrawer = () => {
    navigate('/warehouse/inventory-adjustments');
    setIsDrawerEditing(false);
    setIsHeaderEditing(false);
  };

  const openEditDrawer = () => {
    setIsDrawerEditing(true);
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120, // 雙按鈕設為 120
    render: (_: any, record: any) => (
      <TableActions
        onView={() => openViewDrawer(record)}
        onDelete={record.status === 'Unconfirmed' ? () => deleteMutation.mutateAsync(record.documentNumber) : undefined}
        recordName={`庫存調整單 ${record.documentNumber}`}
        deleteConfirmType="modal"
      />
    ),
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

  const handleSearch = (values: any) => {
    setParams({ ...values, pageNumber: 1 });
    setIsSearchModalOpen(false);
  };


  const handleCreateSubmit = (values: any) => {
    const payload = {
      ...values,
      documentDate: values.documentDate ? dayjs(values.documentDate).format('YYYY-MM-DD') : undefined
    };
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (values: any) => {
    const payload = {
      ...values,
      documentDate: values.documentDate ? dayjs(values.documentDate).format('YYYY-MM-DD') : undefined
    };
    updateMutation.mutate(payload);
  };


  const getHeaderActions = () => {
    if (isDrawerEditing || isCreateDrawerOpen) return null;
    if (!viewData) return null;

    return (
      <Space>
        {viewData?.status === 'Unconfirmed' && (
          <ActionButton 
            key="confirm"
            intent="success" 
            icon={<CheckCircleOutlined />} 
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '確認單據',
                content: '確定要確認此單據？',
                centered: true,
                width: 400,
                onOk: () => confirmMutation.mutateAsync(viewData?.documentNumber)
              });
            }}
            loading={confirmMutation.isPending}
            disabled={isHeaderEditing}
          >
            確認
          </ActionButton>
        )}
        {viewData?.status === 'Confirmed' && (
          <ActionButton 
            key="cancel-confirm"
            intent="warning" icon={<SyncOutlined />} 
            loading={cancelConfirmMutation.isPending} 
            disabled={isHeaderEditing}
            onClick={(e) => {
              e.preventDefault();
              modal.confirm({
                title: '取消確認',
                content: '確定要取消確認此單據？',
                centered: true,
                width: 400,
                okButtonProps: { danger: true },
                onOk: () => cancelConfirmMutation.mutateAsync(viewData?.documentNumber)
              });
            }}
          >
            取消確認
          </ActionButton>
        )}
      </Space>
    );
  };

  const getActionBarActions = () => {
    if (isDrawerEditing || isCreateDrawerOpen) {
      return (
        <Space>
          <Button 
            key="save"
            type="primary" 
            htmlType="submit"
            form={isCreateDrawerOpen ? "inventoryAdjustmentCreateForm" : "inventoryAdjustmentEditForm"}
            icon={<SaveOutlined />} 
            loading={isCreateDrawerOpen ? createMutation.isPending : updateMutation.isPending}
          >
            儲存
          </Button>
          <Button key="cancel" onClick={(e) => {
            e.preventDefault();
            if (isDrawerEditing) {
              setIsDrawerEditing(false);
            } else {
              closeCreateDrawer();
            }
          }}>取消</Button>
        </Space>
      );
    }

    if (!viewData) return null;

    return (
      <Space>
        {viewData?.status === 'Unconfirmed' && (
          <Button 
            key="edit"
            type="primary" 
            icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
            onClick={(e) => { e.preventDefault(); openEditDrawer(); }} 
            disabled={isHeaderEditing}
          >
            編輯主檔
          </Button>
        )}
      </Space>
    );
  };

  let steps: any[] = [];
  if (viewData) {
    steps = [
      {
        title: '準備中',
        status: viewData.status !== 'Unconfirmed' ? 'finish' : 'process',
        date: viewData.createdAt,
        user: viewData.createdBy,
      },
      {
        title: '單據確認',
        status: viewData.status === 'Unconfirmed' ? 'wait' : 'finish',
        date: viewData.confirmDate,
        user: viewData.confirmUserName,
      }
    ];
  }

  const drawerStyles = {
    body: { padding: 0, overflow: 'hidden' as const }
  };

  return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard title="庫存調整單管理" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button type="default" icon={<SearchOutlined />} onClick={listQuery.openSearchModal}>
              查詢
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
              新增單據
            </Button>
          </Space>
        }>
        <ActiveQueryAndSortTags
          searchConfig={mainSearchFormConfig()}
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
            dataSource={listData}
            loading={isFetching}
            total={totalRecords}
            current={currentPage}
            pageSize={currentPageSize}
            selectedRowId={viewId}
            selectedRowKey="documentNumber"
            rowKey="documentNumber"
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
          config={mainSearchFormConfig()} 
          form={searchForm} 
          onSearch={listQuery.handleSearch} 
        />
      </Modal>

      <Drawer
        title={
          <DrawerTitle
            moduleName="庫存調整單"
            isCreate={isCreateDrawerOpen}
            isEdit={isDrawerEditing}
            record={viewData}
            displayField={(r) => r?.documentDate ? dayjs(r.documentDate).format("YYYY-MM-DD") : ""}
            statusTag={(!isCreateDrawerOpen && viewData) ? getStatusTag(viewData.status) : undefined}
          />
        }
        size={DRAWER_WIDTH_MAIN as any}
        open={!!viewId || isCreateDrawerOpen}
        onClose={isCreateDrawerOpen ? closeCreateDrawer : closeViewDrawer}
        styles={drawerStyles}
        destroyOnHidden
        mask={{ closable: isViewMode }}
        keyboard={isViewMode}
        extra={getHeaderActions()}
      >
        <Spin spinning={isFetchingView && !isCreateDrawerOpen}>
          <ActionBar 
              createdBy={viewData?.createdBy || undefined}
              createdAt={viewData?.createdAt || undefined}
              updatedBy={viewData?.updatedBy || undefined}
              updatedAt={viewData?.updatedAt || undefined}
              actions={getActionBarActions()}
            />
          <div style={{ padding: "8px 24px" }}>
            {(!isCreateDrawerOpen && viewData) && <DocumentLifecycleBanner steps={steps} />}
            <MasterDetailTabs
              heightOffset={(!isCreateDrawerOpen && viewData) ? 320 : 160}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCreateMode={isCreateDrawerOpen}
            isEditMode={isDrawerEditing}
            viewId={viewId}
            entityType="InventoryAdjustment"
            disableTabSwitching={isHeaderEditing}
            masterContent={
              <DynamicForm
                key={isCreateDrawerOpen ? 'create' : (viewId || 'empty')}
                formId={isCreateDrawerOpen ? "inventoryAdjustmentCreateForm" : "inventoryAdjustmentEditForm"}
                fields={mainFormConfig(isDrawerEditing)}
                defaultValues={isCreateDrawerOpen ? {
                  documentDate: dayjs(),
                  responsibleEmployeeCode: user?.employeeCode || undefined
                } : {
                  ...viewData,
                  documentDate: viewData?.documentDate ? dayjs(viewData.documentDate) : undefined
                }}
                onSubmit={isCreateDrawerOpen ? handleCreateSubmit : handleEditSubmit}
                hideDefaultFooter
                isViewMode={!isDrawerEditing && !isCreateDrawerOpen}
                isUpdateMode={isDrawerEditing}
              />
            }
            detailTabs={[
              {
                key: 'items',
                label: '調整明細',
                children: viewData ? (
                  <InventoryAdjustmentItemsTab 
                    documentNumber={viewData.documentNumber} 
                    isMasterViewMode={isViewMode} 
                    masterStatus={viewData.status}
                    onEditingChange={setIsHeaderEditing}
                  />
                ) : <Spin />,
                disabled: isCreateDrawerOpen // Cannot add details before creating master
              }
            ]}
          />
          </div>
        </Spin>
      </Drawer>
    </div>
  );
}
