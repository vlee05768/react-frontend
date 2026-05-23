import PageCard from '@/components/common/PageCard';
// @ts-nocheck
import { getApiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { Spin, Button, Modal, Space, Drawer, Divider } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  ClearOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { TableActions } from '@/utils/tableActions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1BusinessPartners, 
  getApiV1BusinessPartnersByCode,
  postApiV1BusinessPartners,
  putApiV1BusinessPartnersByCode,
  deleteApiV1BusinessPartnersByCode
} from '@/api/generated/sdk.gen';

import { create } from 'zustand';
import { DynamicForm } from '@/components/Form/DynamicForm';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { mainFormConfig, mainTableColumns, bpSearchFormConfig } from './BusinessPartnerConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { App } from 'antd';
import ContactList from './ContactList';
import { ANIMATION_DELAY_MS, DEFAULT_PAGE_SIZE, DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';;
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';


import { ActionBar } from '@/components/common/ActionBar';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';

// Local store for query params
export const useBPQueryStore = create((set) => ({
  params: {
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    CodeOrName: undefined,
    Types: undefined,
    IsTYCustomer: undefined,
    Others: undefined,
    SortRules: undefined,
  },
  setParams: (newParams: any) => set((state: any) => ({ params: { ...state.params, ...newParams } })),
  resetParams: () => set({ params: { pageNumber: 1, pageSize: DEFAULT_PAGE_SIZE, CodeOrName: undefined, Types: undefined, IsTYCustomer: undefined, Others: undefined, SortRules: undefined } }),
}));

export default function BusinessPartnerList() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const deletingRecordId: string | null = null;
  const params = useBPQueryStore((state: any) => state.params);
  const setParams = useBPQueryStore((state: any) => state.setParams);
  
  // 使用 ERP 統一查詢行為 Hook
  const listQuery = useErpListQuery({
    params,
    setParams,
  });

  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('master_info');

  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
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
  const { viewId } = useParams<{ viewId: string }>(); // viewId represents "code" here
  const navigate = useNavigate();

  // Detail query
  const { data: viewRes, isFetching: isFetchingView } = useQuery({
    queryKey: ['bpDetail', viewId],
    queryFn: () => getApiV1BusinessPartnersByCode({ path: { code: viewId as string } }),
    enabled: !!viewId,
    refetchInterval: 30000, // Background polling
  });
  const viewData = (viewRes?.data?.data || viewRes?.data) as any;

  // List query
  const { data, isFetching } = useQuery({
    queryKey: ['bpList', params],
    queryFn: () => getApiV1BusinessPartners({ query: params as any }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;

  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1BusinessPartners({ body: values }),
    onSuccess: () => {
      messageApi.success('新增成功');
      setIsCreateDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['bpList'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, values }: { code: string, values: any }) => 
      putApiV1BusinessPartnersByCode({ path: { code }, body: values }),
    onSuccess: () => {
      messageApi.success('更新成功');
      setIsDrawerEditing(false);
      queryClient.invalidateQueries({ queryKey: ['bpList'] });
      queryClient.invalidateQueries({ queryKey: ['bpDetail'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => deleteApiV1BusinessPartnersByCode({ path: { code } }),
    onSuccess: () => {
      messageApi.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['bpList'] });
      queryClient.invalidateQueries({ queryKey: ['bpDetail'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const openViewDrawer = (record: any) => {
    setActiveTab('master_info');
    navigate(`/business-partners/${record.code}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/business-partners');
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
      <TableActions
        onView={() => openViewDrawer(record)}
        onDelete={() => deleteMutation.mutate(record.code)}
        recordName={record.name || record.code}
        deleteConfirmType="popconfirm"
      />
    ),
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn, params.SortRules);



  
  return (
    <div className="p-4 pb-0 flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <PageCard title="廠商客戶管理" extra={
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
              icon={<PlusOutlined/>} 
              onClick={openCreateDrawer}
            >
              新增資料
            </Button>
          </Space>
        }>
        
        {/* 統一的查詢與排序標籤區塊 */}
        <ActiveQueryAndSortTags
          searchConfig={bpSearchFormConfig()}
          tableColumns={mainTableColumns()}
          params={params}
          onQueryTagClose={listQuery.handleClearQueryField}
          onSortTagClose={listQuery.handleClearSortField}
          onClearSort={listQuery.handleClearAllSort}
        />

        {/* 標準 ERP 表格 */}
        <StandardErpTable
          columns={columns}
          dataSource={listData}
          rowKey="code"
          loading={isFetching}
          selectedRowId={viewId}
          selectedRowKey="code"
          deletingRowId={deletingRecordId}
          onChange={(pagination, _, sorter) => {
            const sortRules = formatSorterToRules(sorter);
            setParams({
              pageNumber: pagination.current,
              pageSize: pagination.pageSize,
              SortRules: sortRules,
            });
          }}
          pagination={{
            current: currentPage,
            pageSize: currentPageSize,
            total: totalRecords,
          }}
        />
      </PageCard>

      <Modal
        title={
          <div className="font-semibold pb-3 mb-2" style={{fontSize: '18px', borderBottom: '1px solid #f0f0f0'}}>
            查詢條件設定
          </div>
        }
        open={listQuery.isSearchModalOpen}
        onCancel={() => listQuery.setIsSearchModalOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2" style={{borderTop: '1px solid #f0f0f0'}}>
            <Button icon={<ClearOutlined />} onClick={listQuery.handleClear}>
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
          config={bpSearchFormConfig()} 
          form={listQuery.searchForm} 
          onSearch={listQuery.handleSearch} 
        />

      </Modal>

      <Drawer
        styles={{ body: { padding: 0, overflow: 'hidden' } }}
        title={
          <DrawerTitle
            moduleName="廠商客戶"
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
        size={DRAWER_WIDTH_MAIN}
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
              <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={startEditMode}>編輯</Button>
            )}
            {(isDrawerEditing || isCreateDrawerOpen) && activeTab === 'master_info' && (
              <>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  form="bpForm"
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
          <div className="py-2 px-6">
          <MasterDetailTabs
            heightOffset={160}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isCreateMode={isCreateDrawerOpen}
            isEditMode={isDrawerEditing}
            viewId={viewId}
            entityType="BusinessPartner"
            masterContent={
              <DynamicForm
                key={isCreateDrawerOpen ? 'create' : (viewId || 'empty')}
                defaultValues={isCreateDrawerOpen ? { isTYCustomer: false } : viewData}
                fields={mainFormConfig()}
                onSubmit={handleCrudSubmit}
                isUpdateMode={isDrawerEditing}
                isViewMode={isViewMode}
                formId="bpForm"
                hideDefaultFooter={true}
              />
            }
            detailTabs={[
              {
                key: 'detail_contacts',
                label: '聯絡人清單',
                children: <ContactList businessPartnerCode={viewData?.code} isViewMode={isViewMode} />
              }
            ]}
          />
                  </div>
        </Spin>
      </Drawer>
    </div>
  );
}
