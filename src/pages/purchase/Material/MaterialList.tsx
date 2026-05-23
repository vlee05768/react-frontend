import PageCard from '@/components/common/PageCard';
// @ts-nocheck
import { getApiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Spin, Table, Button, Modal, Form, Space, Tag, Tooltip, Divider, message, Popconfirm, Drawer, Tabs, App } from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, ClearOutlined, SaveOutlined
} from '@ant-design/icons';
import { TableActions } from '@/utils/tableActions';
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
import { buildTableColumns, formatSorterToRules, getColumnLabel } from '@/utils/tableUtils';
import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';
import { DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import { ActionBar } from '@/components/common/ActionBar';
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';


export default function MaterialList() {
  const { modal } = App.useApp();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const { params, setParams, resetParams } = useMaterialQueryStore();

  const { page, pageNumber, pageSize, ...queryFields } = params;
  useUrlQuerySync({
    query: queryFields,
    page: page || pageNumber || 1,
    pageSize: pageSize || 20,
    setPagination: (p, s) => setParams({ [params.pageNumber !== undefined ? 'pageNumber' : 'page']: p, pageSize: s }),
    setQuery: (q) => setParams({ ...q, [params.pageNumber !== undefined ? 'pageNumber' : 'page']: 1 })
  });
  const { hasPermission } = useAuthStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const searchForm = useForm();
  const [formDefaultValues, setFormDefaultValues] = useState<any>({});
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const isViewMode = !isDrawerEditing && !isCreateDrawerOpen;
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
    fixed: 'right' as const,
    width: 120,
    render: (_: any, record: any) => (
      <TableActions
        onView={hasPermission('Warehouse.Materials.View') ? () => openViewDrawer(record) : undefined}
        onDelete={hasPermission('Warehouse.Materials.Delete') ? () => deleteMutation.mutate(record.code) : undefined}
        recordName={record.name || record.code}
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
    searchForm.reset(Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = null; return acc; }, {}));
  };

  const openSearchModal = () => {
    searchForm.reset(params);
    setIsSearchModalOpen(true);
  };

  return (
    <div className="p-4 pb-0 flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <PageCard title="原料管理" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button type="default" icon={<SearchOutlined />} onClick={openSearchModal} className="font-medium">
              查詢
            </Button>
            {hasPermission('Warehouse.Materials.Create') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer} className="font-medium">
                新增資料
              </Button>
            )}
          </Space>
        }>
        <div className="mb-4 flex items-center py-3 px-4" style={{flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-quaternary, #fafafa)', borderRadius: '6px', flexShrink: 0 }}>
          <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-secondary, #8c8c8c)'}}>目前的查詢條件:</span>
          <DynamicSearchTags config={materialSearchFormConfig()} params={params} onClose={(key) => setParams({ [key]: undefined, pageNumber: 1 })} />
        {((params as any).SortRules) && (
          <>
            <Divider type="vertical" style={{ height: '20px', borderColor: '#d9d9d9', margin: '0 16px' }} />
            <span className="mr-3 font-medium" style={{ fontSize: '14px', color: 'var(--ant-color-text-secondary, #8c8c8c)' }}>
              排序順序:
            </span>
            {(params as any).SortRules.split(',').map((rule: string, idx: number) => {
              const [field, order] = rule.split(':');
              const label = getColumnLabel(field, mainTableColumns());
              return (
                <Tag
                  key={idx}
                  color="blue"
                  closable
                  onClose={() => {
                    const newRules = (params as any).SortRules.split(',')
                      .filter((r: string) => !r.startsWith(`${field}:`))
                      .join(',');
                    setParams({ SortRules: newRules || undefined, [params.pageNumber !== undefined ? 'pageNumber' : 'page']: 1 });
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  {label} ({order === 'asc' ? '升序 ↗' : '降序 ↘'})
                </Tag>
              );
            })}
            <Button
              type="link"
              size="small"
              onClick={() => setParams({ SortRules: undefined, [params.pageNumber !== undefined ? 'pageNumber' : 'page']: 1 })}
              style={{ padding: 0, fontSize: '12px' }}
            >
              清除排序
            </Button>
          </>
        )}
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          
          <Table
            onChange={handleTableChange}
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
              current: currentPage,
              pageSize: currentPageSize,
              total: totalRecords,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 筆資料`,
              
            }}
          />
        </div>
      </PageCard>

      <Modal
        title={<div className="font-semibold pb-3 mb-2" style={{fontSize: '18px', borderBottom: '1px solid #f0f0f0'}}>查詢條件設定</div>}
        open={isSearchModalOpen}
        mask={{ closable: isViewMode }}
        keyboard={isViewMode}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div className="pt-4 flex justify-end gap-2" style={{borderTop: '1px solid #f0f0f0'}}>
            <Button icon={<ClearOutlined />} onClick={() => {
              const emptyVals = Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = undefined; return acc; }, {});
              searchForm.reset(emptyVals);
              setParams({ ...emptyVals, [params.pageNumber !== undefined ? 'pageNumber' : 'page']: 1 });
            }}>清除條件</Button>
            <Button type="primary" icon={<SearchOutlined />} htmlType="submit" form="search-form">執行查詢</Button>
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
        style={{ top: '10vh' }}
        closeIcon={true}
      >
        <DynamicSearchForm config={materialSearchFormConfig()} form={searchForm} onSearch={handleSearch} />
      </Modal>

      <Drawer
        styles={{ body: { padding: 0 } }}
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
            {(!isDrawerEditing && !isCreateDrawerOpen && hasPermission('Warehouse.Materials.Update')) && (
              <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={startEditMode}>編輯</Button>
            )}
            {(isDrawerEditing || isCreateDrawerOpen) && (
              <>
                <Button type="primary" htmlType="submit" form="materialForm" icon={<SaveOutlined />} loading={isCreateDrawerOpen ? createMutation.isPending : updateMutation.isPending}>儲存</Button>
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
                  </div>
        </Spin>
      </Drawer>
    </div>
  );
}
