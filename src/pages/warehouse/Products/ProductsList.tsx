// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import {
  Spin, Table, Button, Modal, Form, Space, Card, Tooltip, Popconfirm, Drawer, Divider, App
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ClearOutlined, SaveOutlined, EyeOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1Product, 
  getApiV1ProductByCode,
  postApiV1Product,
  putApiV1ProductByCode,
  deleteApiV1ProductByCode
} from '@/api/generated/sdk.gen';

import { getApiErrorMessage } from '@/utils/apiError';
import { create } from 'zustand';
import { DynamicForm } from '@/components/Form/DynamicForm';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { mainFormConfig, mainTableColumns, productSearchFormConfig } from './ProductConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { ANIMATION_DELAY_MS, DEFAULT_PAGE_SIZE, DRAWER_WIDTH_MAIN, DRAWER_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';

// Detail Tabs
import ProductMolds from './Tabs/ProductMolds';
import ProductBom from './Tabs/ProductBom';
import ProductAttachments from './Tabs/ProductAttachments';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';


// Local store for query params
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';
import { ActionBar } from '@/components/common/ActionBar';

export const useProductQueryStore = create((set) => ({
  params: {
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    CodeOrName: undefined,
    Types: undefined,
    Customer: undefined,
    CustomerProductId: undefined,
    Others: undefined,
  },
  setParams: (newParams: any) => set((state: any) => ({ params: { ...state.params, ...newParams } })),
  resetParams: () => set({ params: { pageNumber: 1, pageSize: DEFAULT_PAGE_SIZE, CodeOrName: undefined, Types: undefined, Customer: undefined, CustomerProductId: undefined, Others: undefined } }),
}));

export default function ProductsList() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const params = useProductQueryStore((state: any) => state.params);
  const setParams = useProductQueryStore((state: any) => state.setParams);
  const navigate = useNavigate();
  const { viewId } = useParams<{ viewId: string }>(); // viewId represents "code" here

  const { pageNumber, pageSize, ...queryFields } = params;
  useUrlQuerySync({
    query: queryFields,
    page: pageNumber || 1,
    pageSize: pageSize || DEFAULT_PAGE_SIZE,
    setPagination: (p, s) => setParams({ pageNumber: p, pageSize: s }),
    setQuery: (q) => setParams({ ...q, pageNumber: 1 })
  });
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('master_info');

  const searchForm = useForm();
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const [isBomEditing, setIsBomEditing] = useState(false);
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

  // Detail query
  const { data: viewRes, isFetching: isFetchingView } = useQuery({
    queryKey: ['productDetail', viewId],
    queryFn: () => getApiV1ProductByCode({ path: { code: viewId as string } }),
    enabled: !!viewId,
    refetchInterval: 30000, // Background polling
  });
  const viewData = viewRes?.data?.data || viewRes?.data;

  // List query
  const { data, isFetching } = useQuery({
    queryKey: ['productList', params],
    queryFn: () => getApiV1Product({ query: params as any }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;

  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1Product({ body: values }),
    onSuccess: () => {
      messageApi.success('新增成功');
      setIsCreateDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['productList'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, values }: { code: string, values: any }) => 
      putApiV1ProductByCode({ path: { code }, body: values }),
    onSuccess: () => {
      messageApi.success('更新成功');
      setIsDrawerEditing(false);
      queryClient.invalidateQueries({ queryKey: ['productList'] });
      queryClient.invalidateQueries({ queryKey: ['productDetail'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => deleteApiV1ProductByCode({ path: { code } }),
    onSuccess: () => {
      messageApi.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['productList'] });
      queryClient.invalidateQueries({ queryKey: ['productDetail'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const openViewDrawer = (record: any) => {
    setActiveTab('master_info');
    navigate(`/warehouse/products/${record.code}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/warehouse/products');
    }
  };

  const handleCancel = () => {
    if (isDrawerEditing) {
      setIsDrawerEditing(false);
    } else if (isCreateDrawerOpen) {
      closeViewDrawer();
    }
  };

  const openCreateDrawer = () => {
    setActiveTab('master_info');
    setIsCreateDrawerOpen(true);
  };

  const startEditMode = () => {
    setIsDrawerEditing(true);
    setActiveTab('master_info'); // Switch back to basic info when editing
  };

  const handleCrudSubmit = (values: any) => {
    if (isCreateDrawerOpen) {
      createMutation.mutate(values);
    } else if (viewId) {
      updateMutation.mutate({ code: viewId, values });
    }
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
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
        <Tooltip title="刪除">
          <Popconfirm
            title="刪除確認"
            description="確定要刪除此筆資料嗎？此操作無法還原。"
            onConfirm={() => deleteMutation.mutate(record.code)}
            onOpenChange={(open) => {
              const r = record as any;
              const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
              setDeletingRecordId(open ? String(recordId) : null);
            }}
            okButtonProps={{ danger: true }}
            okText="刪除"
            cancelText="取消"
            placement="topLeft"
          >
            <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} />
          </Popconfirm>
        </Tooltip>
      </Space>
    ),
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn);

  const handleSearch = (values: any) => {
    const nextParams = { ...values };
    if (!nextParams.CodeOrName) nextParams.CodeOrName = undefined;
    if (nextParams.Types && nextParams.Types.length === 0) nextParams.Types = undefined;
    if (!nextParams.Customer) nextParams.Customer = undefined;
    if (!nextParams.CustomerProductId) nextParams.CustomerProductId = undefined;
    if (!nextParams.Others) nextParams.Others = undefined;

    setParams({
      ...nextParams,
      pageNumber: 1,
    });
    setIsSearchModalOpen(false);
  };

  const handleSearchReset = () => {
    searchForm.reset(Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = undefined; return acc; }, {}));
  };

  const renderSearchTags = () => {
    return (
      <DynamicSearchTags 
        config={productSearchFormConfig()} 
        params={params} 
        onClose={(key) => {
          setParams({ [key]: undefined, pageNumber: 1 });
        }} 
      />
    );
  };

  const openSearchModal = () => {
    searchForm.reset(params);
    setIsSearchModalOpen(true);
  };

  return (
    <div className="p-[16px 16px 0px 16px] flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <Card
        variant="borderless"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        styles={{ 
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 4px 16px' }
        }}
        title={
          <div className="flex items-center gap-3">
            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />
            <div className="m-0 font-semibold" style={{fontSize: '20px'}}>
              產品管理
            </div>
          </div>
        }
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={openSearchModal}
            >
              進階查詢
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={openCreateDrawer}
            >
              新增產品
            </Button>
          </Space>
        }
      >
        <div className="mb-4 flex items-center p-[12px 16px]" style={{flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', borderRadius: '6px', flexShrink: 0 }}>
          <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)'}}>目前的查詢條件:</span>
          {renderSearchTags()}
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
            /* View-Mode Styling for Single Form */
            .view-mode-form .ant-input-disabled,
            .view-mode-form .ant-input[disabled],
            .view-mode-form .ant-select-disabled,
            .view-mode-form .ant-select-disabled .ant-select-selection-item,
            .view-mode-form .ant-select-disabled .ant-select-selector,
            .view-mode-form .ant-input-number-disabled,
            .view-mode-form .ant-picker-disabled {
                color: var(--ant-color-text, rgba(0, 0, 0, 0.88)) !important;
                -webkit-text-fill-color: var(--ant-color-text, rgba(0, 0, 0, 0.88)) !important;
                background-color: var(--ant-color-bg-container-disabled, rgba(0, 0, 0, 0.04)) !important;
                border-color: var(--ant-color-border, #d9d9d9) !important;
                opacity: 1 !important;
                cursor: default !important;
            }
            .view-mode-form .ant-switch-disabled {
               opacity: 1 !important;
               cursor: default !important;
            }
          `}</style>
          <Table
            bordered
            rowClassName={(record) => {
            const r = record as any; const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
            let cls = '';
            if (String(record.code) === String(viewId)) cls += 'selected-table-row ';
            if (recordId && String(recordId) === String(deletingRecordId)) cls += 'deleting-row-highlight';
            return cls.trim();
          }}
            style={{ flex: 1 }}
            columns={columns}
            dataSource={listData}
            rowKey="code"
            loading={isFetching}
            scroll={{ x: 'max-content', y: 300 }}
            pagination={{
              current: params.pageNumber,
              pageSize: params.pageSize,
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
          <div className="font-semibold pb-3 mb-2" style={{fontSize: '18px', borderBottom: '1px solid #f0f0f0'}}>
            查詢條件設定
          </div>
        }
        open={isSearchModalOpen}
        mask={{ closable: isViewMode }}
        keyboard={isViewMode}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2" style={{borderTop: '1px solid #f0f0f0'}}>
            <Button icon={<ClearOutlined />} onClick={handleSearchReset}>
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
      >
        <DynamicSearchForm 
          config={productSearchFormConfig()} 
          form={searchForm} 
          onSearch={handleSearch} 
        />
      </Modal>

      <Drawer
        styles={{ body: { padding: 0 } }}
        title={
          <DrawerTitle
            moduleName="產品管理"
            isCreate={isCreateDrawerOpen}
            isEdit={isDrawerEditing}
            record={viewData}
            displayField={(record) => {
              if (record.code && record.name) return `${record.code} - ${record.name}`;
              return record.code || record.name || '';
            }}
          />
        }
        placement="right"
        size={DRAWER_WIDTH_MAIN as any}
        onClose={closeViewDrawer}
        open={!!viewId || isCreateDrawerOpen}
        mask={{ closable: isViewMode }}
        keyboard={isViewMode}
        
      >
        <Spin spinning={isFetchingView && !isCreateDrawerOpen}>
          <ActionBar 
            createdBy={viewData?.createdBy}
            createdAt={viewData?.createdAt}
            updatedBy={viewData?.updatedBy}
            updatedAt={viewData?.updatedAt}
            actions={
              <Space>
            {(!isDrawerEditing && !isCreateDrawerOpen) && (
              <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={startEditMode} disabled={isBomEditing}>編輯主檔</Button>
            )}
            {(isDrawerEditing || isCreateDrawerOpen) && activeTab === 'master_info' && (
              <>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  form="productForm"
                  icon={<SaveOutlined />} 
                  loading={isCreateDrawerOpen ? createMutation.isPending : updateMutation.isPending}
                >
                  儲存主檔
                </Button>
                <Button onClick={handleCancel}>取消</Button>
              </>
            )}
          </Space>
            }
          />
          <div className="p-6">
          <MasterDetailTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCreateMode={isCreateDrawerOpen}
            isEditMode={isDrawerEditing}
            viewId={viewId}
            entityType="Product"
            disableTabSwitching={isBomEditing} // 新增此行，當 BOM 在編輯狀態時鎖定所有 Tab 切換
            masterContent={
              <DynamicForm
                key={isCreateDrawerOpen ? 'create' : (viewId || 'empty')}
                defaultValues={isCreateDrawerOpen ? { 
                  isActive: true,
                  type: '0002', // 0002 預設對應 "量產"
                  customerMoldFee: 0,
                  unitPrice: 0
                } : viewData}
                fields={mainFormConfig()}
                onSubmit={handleCrudSubmit}
                isUpdateMode={isDrawerEditing}
                isViewMode={isViewMode}
                formId="productForm"
                hideDefaultFooter={true}
              />
            }
            detailTabs={[
              {
                key: 'attachments',
                label: '附件檔案',
                children: <ProductAttachments productCode={viewData?.code} isViewMode={isViewMode} />
              },
              {
                key: 'molds',
                label: '模具規格',
                children: <ProductMolds productCode={viewData?.code} isViewMode={isViewMode} />
              },
              {
                key: 'bom',
                label: 'BOM 表',
                children: <ProductBom productCode={viewData?.code} isViewMode={isViewMode} onEditingChange={setIsBomEditing} />
              }
            ]}
          />
                  </div>
        </Spin>
      </Drawer>
    </div>
  );
}