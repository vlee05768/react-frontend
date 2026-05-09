// @ts-nocheck
import { getApiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import {
  Spin,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Card,
  Tag,
  Tooltip,
  Row,
  Col,
  Popconfirm,
  Drawer,
  Divider,
  Tabs,
  Select
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClearOutlined,
  SaveOutlined,
  EyeOutlined
} from '@ant-design/icons';
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
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { useAuthStore } from '@/stores/useAuthStore';
import { mainFormConfig, mainTableColumns, bpTypeOptions, bpSearchFormConfig } from './BusinessPartnerConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { App } from 'antd';
import ContactList from './ContactList';
import { ANIMATION_DELAY_MS, DEFAULT_PAGE_SIZE, DRAWER_WIDTH_MAIN, DRAWER_WIDTH_SEARCH, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';;
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';


// Local store for query params
export const useBPQueryStore = create((set) => ({
  params: {
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    CodeOrName: undefined,
    Types: undefined,
    IsTYCustomer: undefined,
    Others: undefined,
  },
  setParams: (newParams: any) => set((state: any) => ({ params: { ...state.params, ...newParams } })),
  resetParams: () => set({ params: { pageNumber: 1, pageSize: DEFAULT_PAGE_SIZE, CodeOrName: undefined, Types: undefined, IsTYCustomer: undefined, Others: undefined } }),
}));

export default function BusinessPartnerList() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const params = useBPQueryStore((state: any) => state.params);
  const setParams = useBPQueryStore((state: any) => state.setParams);
  
  const { hasPermission } = useAuthStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('master_info');

  const [searchForm] = Form.useForm();
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
  });
  const viewData = viewRes?.data?.data || viewRes?.data;

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
    fixed: 'left' as const,
    width: 120,
    render: (_: any, record: any) => (
      <Space>
        {/* Permission logic usually has: hasPermission('BasicData.BusinessPartners.View') */}
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
            title="確定要刪除此筆資料嗎？"
            onConfirm={() => deleteMutation.mutate(record.code)}
            okText="確定"
            cancelText="取消"
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
    if (!nextParams.Others) nextParams.Others = undefined;

    setParams({
      ...nextParams,
      pageNumber: 1,
    });
    setIsSearchModalOpen(false);
  };

  const handleSearchReset = () => {
    searchForm.resetFields();
  };

  
  const renderSearchTags = () => {
    return (
      <DynamicSearchTags 
        config={bpSearchFormConfig()} 
        params={params} 
        onClose={(key) => {
          setParams({ [key]: undefined, pageNumber: 1 });
        }} 
      />
    );
  };


  const openSearchModal = () => {
    searchForm.setFieldsValue(params);
    setIsSearchModalOpen(true);
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
              商業夥伴管理
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
              icon={<PlusOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
              onClick={openCreateDrawer}
            >
              新增資料
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', padding: '12px 16px', borderRadius: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>目前的查詢條件:</span>
          {renderSearchTags()}
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
            rowClassName={(record) => String(record.code) === String(viewId) ? 'selected-table-row' : ''}
            style={{ flex: 1 }}
            columns={columns}
            dataSource={listData}
            rowKey="code"
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
          config={bpSearchFormConfig()} 
          form={searchForm} 
          onSearch={handleSearch} 
        />

      </Modal>

      <Drawer
        title={
          <DrawerTitle
            moduleName="商業夥伴"
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
        extra={
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
      >
        <Spin spinning={isFetchingView && !isCreateDrawerOpen}>
          <MasterDetailTabs
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
        </Spin>
      </Drawer>
    </div>
  );
}
