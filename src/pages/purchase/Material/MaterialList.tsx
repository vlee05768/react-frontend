// @ts-nocheck
import { getApiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Spin, Table, Button, Modal, Form, Space, Card, Tag, Tooltip, Divider, message, Popconfirm, Drawer, Tabs
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ClearOutlined, SaveOutlined, EyeOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1Material, 
  getApiV1MaterialByCode,
  postApiV1Material,
  putApiV1MaterialByCode,
  deleteApiV1MaterialByCode
} from '@/api/generated/sdk.gen';

import { useMaterialQueryStore } from '@/stores/purchaseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { mainFormConfig, mainTableColumns, materialSearchFormConfig } from './MaterialConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { DRAWER_WIDTH_MAIN } from '@/constants';

export default function MaterialList() {
  const { params, setParams, resetParams } = useMaterialQueryStore();
  const { hasPermission } = useAuthStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const [searchForm] = Form.useForm();
  const [formDefaultValues, setFormDefaultValues] = useState<any>({});
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('master_info');

  useEffect(() => {
    if (isDrawerEditing || isCreateDrawerOpen) {
      setActiveTab('master_info');
    }
  }, [isDrawerEditing, isCreateDrawerOpen]);

  
  const queryClient = useQueryClient();
  const { viewId } = useParams<{ viewId: string }>();
  const navigate = useNavigate();

  // 單筆資料查詢
  const { data: viewRes, isFetching: isFetchingView } = useQuery({
    queryKey: ['materialDetail', viewId],
    queryFn: () => getApiV1MaterialByCode({ path: { code: viewId as any } }),
    enabled: !!viewId,
  });
  const viewData = viewRes?.data?.data || viewRes?.data;

  useEffect(() => {
    if (viewData) {
      setFormDefaultValues({ ...viewData });
    }
  }, [viewData]);

  // API 查詢
  const { data, isFetching } = useQuery({
    queryKey: ['materialList', params],
    queryFn: () => getApiV1Material({ query: params as any }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1Material({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      setFormDefaultValues({});
      queryClient.invalidateQueries({ queryKey: ['materialList'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, values }: { code: string, values: any }) => 
      putApiV1MaterialByCode({ path: { code: code as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      queryClient.invalidateQueries({ queryKey: ['materialList'] });
      queryClient.invalidateQueries({ queryKey: ['materialDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => deleteApiV1MaterialByCode({ path: { code: code as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['materialList'] });
      queryClient.invalidateQueries({ queryKey: ['materialDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const openViewDrawer = (record: any) => {
    setActiveTab('master_info');
    navigate(`/purchase/materials/${record.code}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/purchase/materials');
    }
  };

  const handleCancel = () => {
    if (isDrawerEditing) {
      setIsDrawerEditing(false);
      if (viewData) {
        setFormDefaultValues({ ...viewData });
      }
    } else if (isCreateDrawerOpen) {
      closeViewDrawer();
    }
  };

  const openCreateDrawer = () => {
    setActiveTab('master_info');
    setFormDefaultValues({ isActive: true, materialForm: 'R', primaryUoM: 'M²', secondaryUoM: 'ROLL', purchasingUoM: 'ROLL', length: 0, conversionFactor: 1 });
    setIsCreateDrawerOpen(true);
  };

  const startEditMode = () => {
    setIsDrawerEditing(true);
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
        {hasPermission('Warehouse.Materials.View') && (
          <Tooltip title="檢視">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              style={{ color: '#1890ff' }} 
              onClick={() => openViewDrawer(record)}
            />
          </Tooltip>
        )}
        {hasPermission('Warehouse.Materials.Delete') && (
          <Tooltip title="刪除">
            <Popconfirm
              title="確定要刪除此筆資料嗎？"
              onConfirm={() => deleteMutation.mutate(record.code)}
              okText="確定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        )}
      </Space>
    ),
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn);

  const handleSearch = (values: any) => {
    const nextParams = { ...values };
    materialSearchFormConfig().forEach(field => {
      if (nextParams[field.name] === '' || nextParams[field.name] === null) {
        nextParams[field.name] = undefined;
      }
    });
    setParams({ ...nextParams, pageNumber: 1 });
    setIsSearchModalOpen(false);
  };

  const handleSearchReset = () => {
    searchForm.resetFields();
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
            <div style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--ant-color-text, inherit)', lineHeight: '24px' }}>
              原料管理
            </div>
          </div>
        }
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button type="default" icon={<SearchOutlined />} onClick={openSearchModal} style={{ fontWeight: 500 }}>
              進階查詢
            </Button>
            {hasPermission('Warehouse.Materials.Create') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer} style={{ fontWeight: 500 }}>
                新增資料
              </Button>
            )}
          </Space>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-quaternary, #fafafa)', padding: '12px 16px', borderRadius: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', color: 'var(--ant-color-text-secondary, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>目前的查詢條件:</span>
          <DynamicSearchTags config={materialSearchFormConfig()} params={params} onClose={(key) => setParams({ [key]: undefined, pageNumber: 1 })} />
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
            .view-mode-form .ant-switch-disabled { opacity: 1 !important; cursor: default !important; }
            .view-mode-form .ant-select-arrow { display: none !important; }
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
        title={<div style={{ fontSize: '18px', fontWeight: 600, paddingBottom: '12px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>查詢條件設定</div>}
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button icon={<ClearOutlined />} onClick={handleSearchReset}>清空重置</Button>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => searchForm.submit()}>執行查詢</Button>
          </div>
        }
        size={DRAWER_WIDTH_MAIN}
        style={{ top: '10vh' }}
        closeIcon={true}
      >
        <DynamicSearchForm config={materialSearchFormConfig()} form={searchForm} onSearch={handleSearch} />
      </Modal>

      <Drawer
        title={
          <DrawerTitle
            moduleName="原料管理"
            isCreate={isCreateDrawerOpen}
            isEdit={isDrawerEditing}
            record={viewData}
            displayField={(record) => `${record.code || ''} - ${record.name || ''}`.replace(/^ - | - $/g, '')}
          />
        }
        placement="right"
        size={DRAWER_WIDTH_MAIN}
        onClose={closeViewDrawer}
        open={!!viewId || isCreateDrawerOpen}
        extra={
          <Space>
            {(!isDrawerEditing && !isCreateDrawerOpen && hasPermission('Warehouse.Materials.Update')) && (
              <Button type="primary" icon={<EditOutlined />} onClick={startEditMode}>編輯</Button>
            )}
            {(isDrawerEditing || isCreateDrawerOpen) && (
              <>
                <Button type="primary" htmlType="submit" form="materialForm" icon={<SaveOutlined />} loading={isCreateDrawerOpen ? createMutation.isPending : updateMutation.isPending}>儲存</Button>
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
            entityType="Material"
            showAttachments={true}
            masterContent={
              <DynamicForm
                formId="materialForm"
                fields={mainFormConfig()}
                defaultValues={formDefaultValues}
                onSubmit={handleCrudSubmit}
                isUpdateMode={isDrawerEditing}
                isViewMode={!isDrawerEditing && !isCreateDrawerOpen}
                hideDefaultFooter={true}
              />
            }
          />
        </Spin>
      </Drawer>
    </div>
  );
}
