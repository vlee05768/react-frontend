// @ts-nocheck
import { getApiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { InputRef } from 'antd';
import { App , Popconfirm} from 'antd';
import {
  Spin,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Card,
  Tag,
  Tooltip,
  Row,
  Col,
  message,
  
  Drawer,
  Descriptions,
  Switch,
  Divider
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  ClearOutlined,
  SaveOutlined,
  AppstoreOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { TableActions } from '@/utils/tableActions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1Machine, 
  getApiV1MachineByCode,
  postApiV1Machine,
  putApiV1MachineByCode,
  deleteApiV1MachineByCode
} from '@/api/generated/sdk.gen';

import { useMachineQueryStore } from '@/stores/productionStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { mainDictionary, mainFormConfig, mainTableColumns , machineSearchFormConfig} from './MachineConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { ANIMATION_DELAY_MS, DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';;
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import { ActionBar } from '@/components/common/ActionBar';
import { useUrlQuerySync } from '@/hooks/useUrlQuerySync';


export default function MachineList() {
  const { modal } = App.useApp();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const { params, setParams, resetParams } = useMachineQueryStore();

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

  // 單筆資料查詢 (Drawer)
  const { data: viewRes, isFetching: isFetchingView } = useQuery({
    queryKey: ['machineDetail', viewId],
    queryFn: () => getApiV1MachineByCode({ path: { code: viewId as any } }),
    enabled: !!viewId,
  });
  const viewData = viewRes?.data?.data || viewRes?.data;

  // 當獲取到單筆資料時，更新表單內容 (為了 View Mode 能看到資料)
  useEffect(() => {
    if (viewData) {
      const formattedData = { ...viewData };
      Object.keys(formattedData).forEach(key => {
        if (key.toLowerCase().includes('date') && formattedData[key] && typeof formattedData[key] === 'string') {
          formattedData[key] = formattedData[key].substring(0, 10);
        }
      });
      setFormDefaultValues(formattedData);
    }
  }, [viewData]);

  // API 查詢
  const { data, isFetching } = useQuery({
    queryKey: ['machineList', params],
    queryFn: () =>
      getApiV1Machine({
        query: params as any,
      }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1Machine({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      setFormDefaultValues({});
      queryClient.invalidateQueries({ queryKey: ['machineList'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, values }: { code: string | number, values: any }) => 
      putApiV1MachineByCode({ path: { code: code as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      setFormDefaultValues({});
      queryClient.invalidateQueries({ queryKey: ['machineList'] });
      queryClient.invalidateQueries({ queryKey: ['machineDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string | number) => deleteApiV1MachineByCode({ path: { code: code as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['machineList'] });
      queryClient.invalidateQueries({ queryKey: ['machineDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const openViewDrawer = (record: any) => {
    navigate(`/production-quality/machines/${record.code}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/production-quality/machines');
    }
  };

  const handleCancel = () => {
    if (isDrawerEditing) {
      setIsDrawerEditing(false);
      if (viewData) {
        const formattedData = { ...viewData };
        Object.keys(formattedData).forEach(key => {
          if (key.toLowerCase().includes('date') && formattedData[key] && typeof formattedData[key] === 'string') {
            formattedData[key] = formattedData[key].substring(0, 10);
          }
        });
        setFormDefaultValues(formattedData);
      }
    } else if (isCreateDrawerOpen) {
      closeViewDrawer();
    }
  };

  const openCreateDrawer = () => {
    setFormDefaultValues({});
    setFormDefaultValues({ isActive: true });
    setIsCreateDrawerOpen(true);
  };

  const startEditMode = () => {
    setIsDrawerEditing(true);
  };

  const handleCrudSubmit = (values: any) => {
    if (isCreateDrawerOpen) {
      createMutation.mutate(values);
    } else if (viewId) {
      updateMutation.mutate({ code: viewId as any, values });
    }
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
    render: (_: any, record: any) => (
      <TableActions
        onView={hasPermission('ProductionQuality.Machines.View') ? () => openViewDrawer(record) : undefined}
        onDelete={hasPermission('ProductionQuality.Machines.Delete') ? () => deleteMutation.mutate(record.code) : undefined}
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
    machineSearchFormConfig().forEach(field => {
      if (nextParams[field.name] === '' || nextParams[field.name] === null) {
        nextParams[field.name] = undefined;
      }
    });
    setParams({
      ...nextParams,
      pageNumber: 1,
    });
    setIsSearchModalOpen(false);
  };

  const handleSearchReset = () => {
    searchForm.reset(Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = null; return acc; }, {}));
    // 僅清空表單，不呼叫 resetParams()，避免自動觸發 API 查詢
  };


  const renderSearchTags = () => {
    const searchKeys = ['CodeOrName'];
    const activeFilters: React.ReactNode[] = [];
    
    searchKeys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        let label = key;
        let valueStr = String(params[key]);
        if (key === 'CodeOrName') label = '編號或名稱';
        activeFilters.push(<Tag color="blue" key={key} className="p-[2px 8px]" style={{fontSize: '13px'}}>{label}: {valueStr}</Tag>);
      }
    });

    if (activeFilters.length === 0) {
      return <Tag color="default" className="m-0 p-[2px 8px]" style={{fontSize: '13px'}}>【全部資料】</Tag>;
    }
    
    return <Space size={[0, 8]} wrap>{activeFilters}</Space>;
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
            <div style={{
              width: '4px',
              height: '24px',
              backgroundColor: '#1677ff',
              borderRadius: '2px'
            }} />
            <div className="m-0 font-semibold" style={{fontSize: '20px', color: 'var(--ant-color-text, inherit)', lineHeight: '24px' }}>
              機台管理
            </div>
          </div>
        }
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={openSearchModal}
              className="font-medium"
            >
              查詢
            </Button>
            {hasPermission('ProductionQuality.Machines.Create') && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={openCreateDrawer}
                className="font-medium"
              >
                新增資料
              </Button>
            )}
          </Space>
        }
      >
        <div className="mb-4 flex items-center p-[12px 16px]" style={{flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-quaternary, #fafafa)', borderRadius: '6px', flexShrink: 0 }}>
          <span className="mr-3 font-medium" style={{fontSize: '14px', color: 'var(--ant-color-text-secondary, #8c8c8c)'}}>目前的查詢條件:</span>
          <DynamicSearchTags config={machineSearchFormConfig()} params={params} onClose={(key) => setParams({ [key]: undefined, pageNumber: 1 })} />
        {((params as any).SortRules) && (
          <>
            <Divider type="vertical" style={{ height: '20px', borderColor: '#d9d9d9', margin: '0 16px' }} />
            <span className="mr-3 font-medium" style={{ fontSize: '14px', color: 'var(--ant-color-text-secondary, #8c8c8c)' }}>
              排序順序:
            </span>
            {(params as any).SortRules.split(',').map((rule: string, idx: number) => {
              const [field, order] = rule.split(':');
              const label = mainTableColumns().find(col => col.name === field)?.label || field;
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
            .view-mode-form .ant-select-arrow {
                display: none !important;
            }
          `}</style>
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
            <Button icon={<ClearOutlined />} onClick={() => {
              const emptyVals = Object.keys(searchForm.getValues()).reduce((acc: any, key) => { acc[key] = undefined; return acc; }, {});
              searchForm.reset(emptyVals);
              setParams({ ...emptyVals, [params.pageNumber !== undefined ? 'pageNumber' : 'page']: 1 });
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
        <DynamicSearchForm config={machineSearchFormConfig()} form={searchForm} onSearch={handleSearch} />
      </Modal>

      <Drawer
        styles={{ body: { padding: 0 } }}
        title={
          <DrawerTitle
            moduleName="機台管理"
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
            {(!isDrawerEditing && !isCreateDrawerOpen && hasPermission('ProductionQuality.Machines.Update')) && (
              <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={startEditMode}>編輯</Button>
            )}
            {(isDrawerEditing || isCreateDrawerOpen) && (
              <>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  form="machineForm"
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
          <DynamicForm
            formId="machineForm"
            fields={mainFormConfig()}
            defaultValues={formDefaultValues}
            onSubmit={handleCrudSubmit}
            isUpdateMode={isDrawerEditing}
            isViewMode={!isDrawerEditing && !isCreateDrawerOpen}
            hideDefaultFooter={true}
          />
                  </div>
        </Spin>
      </Drawer>
    </div>
  );
}
