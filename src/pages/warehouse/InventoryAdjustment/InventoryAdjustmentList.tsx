import { ActionButton } from "@/components/common/ActionButton";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ActionBar } from '@/components/common/ActionBar';
import { DocumentLifecycleBanner } from '@/components/common/DocumentLifecycleBanner';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import {
  Spin, Table, Button, Form, Space, Card, Tooltip, Drawer, App, Divider, Modal
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, EyeOutlined, CheckCircleOutlined, SyncOutlined
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
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { mainSearchFormConfig, mainFormConfig, mainTableColumns, getStatusTag } from './InventoryAdjustmentConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { ANIMATION_DELAY_MS, DEFAULT_PAGE_SIZE, DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';
import dayjs from 'dayjs';

// Detail Tabs
import InventoryAdjustmentItemsTab from './Tabs/InventoryAdjustmentItemsTab';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';


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
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('master_info');
  const hasAutoSwitchedRef = useRef(false);


  const { user } = useAuthStore();
  const [searchForm] = Form.useForm();
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
    fixed: 'left' as const,
    width: 120,
    render: (_: any, record: any) => (
      <Space>
        <Tooltip title="檢視">
          <Button 
            type="text" 
            icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
            style={{ color: '#1890ff' }} 
            onClick={() => openViewDrawer(record)}
          />
        </Tooltip>
        {record.status === 'Unconfirmed' && (
          <Tooltip title="刪除">
            <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={() => modal.confirm({ title: '刪除確認', content: '確定要刪除此筆資料嗎？此操作無法還原。', centered: true, width: 400, okButtonProps: { danger: true }, onOk: () => deleteMutation.mutateAsync(record.documentNumber) })} />
          </Tooltip>
        )}
      </Space>
    ),
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn);

  const handleSearch = (values: any) => {
    setParams({ ...values, pageNumber: 1 });
    setIsSearchModalOpen(false);
  };

  const handleSearchReset = () => {
    searchForm.resetFields();
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
            儲存主檔
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
    <div style={{ padding: '16px 16px 0px 16px', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Card
        variant="borderless"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 4px 16px' }
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <div style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
              庫存調整單
            </div>
          </div>
        }
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button type="default" icon={<SearchOutlined />} onClick={() => setIsSearchModalOpen(true)}>
              進階查詢
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
              新增單據
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', padding: '12px 16px', borderRadius: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>目前的查詢條件:</span>
          <DynamicSearchTags
            config={mainSearchFormConfig()}
            params={params}
            onClose={(key) => setParams({ [key]: undefined, pageNumber: 1 })}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
            rowClassName={(record: any) => record.documentNumber === viewId ? 'selected-table-row' : ''}
            style={{ flex: 1 }}
            rowKey={(r: any) => r.documentNumber || r.id}
            columns={columns}
            dataSource={listData}
            loading={isFetching}
            scroll={{ x: 'max-content', y: 300 }}
            pagination={{
              current: currentPage,
              pageSize: currentPageSize,
              total: totalRecords,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 筆資料`,
              onChange: (page, pageSize) => setParams({ pageNumber: page, pageSize }),
            }}
          />
        </div>
      </Card>

      <Modal
        title={
          <div style={{ fontSize: '18px', fontWeight: 600, paddingBottom: '12px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
            查詢條件設定
          </div>
        }
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button icon={<ClearOutlined />} onClick={handleSearchReset}>
              清空重置
            </Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => searchForm.submit()}>
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
          config={mainSearchFormConfig()} 
          form={searchForm} 
          onSearch={handleSearch} 
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
