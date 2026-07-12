// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import {
  Spin, Button, Modal, Space, Drawer, Divider, App
} from 'antd';
import { PageCard } from '@/components/common/PageCard';
import {
  SearchOutlined, PlusOutlined, EditOutlined, ClearOutlined, SaveOutlined
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
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { mainFormConfig, mainTableColumns, productSearchFormConfig } from './ProductConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { TableActions } from '@/utils/tableActions';
import { ANIMATION_DELAY_MS, DEFAULT_PAGE_SIZE, DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';

// Detail Tabs
import ProductMolds from './Tabs/ProductMolds';
import ProductBom from './Tabs/ProductBom';
import ProductAttachments from './Tabs/ProductAttachments';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';


// Local store for query params
import { ActionBar } from '@/components/common/ActionBar';

// Shared Components / Hooks
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';

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
  const listQuery = useErpListQuery({
    params,
    setParams,
  });
  const navigate = useNavigate();
  const { viewId } = useParams<{ viewId: string }>(); // viewId represents "code" here
  
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('master_info');

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
    width: 120, // 雙按鈕設為 120
    render: (_: any, record: any) => (
      <TableActions
        onView={() => openViewDrawer(record)}
        onDelete={() => deleteMutation.mutate(record.code)}
        recordName={`產品 ${record.code}`}
        deleteConfirmType="popconfirm"
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



  return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard
        title="產品管理"
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={listQuery.openSearchModal}
            >
              查詢
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
        <ActiveQueryAndSortTags
          searchConfig={productSearchFormConfig()}
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
            rowKey="code"
            loading={isFetching}
            selectedRowId={viewId}
            selectedRowKey="code"
            deletingRowId={deletingRecordId}
            pagination={{
              current: currentPage,
              pageSize: currentPageSize,
              total: totalRecords,
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
        mask={{ closable: isViewMode }}
        keyboard={isViewMode}
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
      >
        <DynamicSearchForm 
          config={productSearchFormConfig()} 
          form={listQuery.searchForm} 
          onSearch={listQuery.handleSearch} 
        />
      </Modal>

      <Drawer
        styles={{ body: { padding: 0, overflow: 'hidden' } }}
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
              <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={startEditMode} disabled={isBomEditing}>編輯</Button>
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
                  儲存
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
            heightOffset={(!isCreateDrawerOpen && viewData) ? 220 : 180}
            masterContent={
              <DynamicForm
                key={isCreateDrawerOpen ? 'create' : `${viewId || 'empty'}_${isViewMode}`}
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