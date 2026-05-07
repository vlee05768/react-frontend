// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
import type { InputRef } from 'antd';
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
  Popconfirm,
  Drawer,
  Descriptions,
  Switch,
  Divider
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClearOutlined,
  SaveOutlined,
  EyeOutlined,
  AppstoreOutlined,
  CheckOutlined,
  CloseOutlined,
  MailOutlined,
  StopOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1User, 
  getApiV1UserById,
  postApiV1User,
  putApiV1UserById,
  deleteApiV1UserById,
  postApiV1AuthResendActivation
} from '@/api/generated/sdk.gen';

import { useUserQueryStore } from '@/stores/systemStore';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLoadingStore } from '@/stores/useLoadingStore';
import { mainDictionary, mainFormConfig, mainTableColumns , userSearchFormConfig} from './UserConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { App } from 'antd';
import { ANIMATION_DELAY_MS, DRAWER_WIDTH_MAIN } from '@/constants';;

export default function UserList() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const { params, setParams, resetParams } = useUserQueryStore();
  const { hasPermission } = useAuthStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

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

  
  const { viewId } = useParams<{ viewId: string }>();
  const navigate = useNavigate();

  // 單筆資料查詢 (Drawer)
  const { data: viewRes, isFetching: isFetchingView } = useQuery({
    queryKey: ['userDetail', viewId],
    queryFn: () => getApiV1UserById({ path: { id: viewId as any } }),
    enabled: !!viewId,
  });
  const viewData = viewRes?.data?.data || viewRes?.data;

  const formattedViewData = useMemo(() => {
    if (!viewData) return undefined;
    const data = { ...viewData };
    Object.keys(data).forEach(key => {
      if (key.toLowerCase().includes('date') && data[key] && typeof data[key] === 'string') {
        data[key] = data[key].substring(0, 10);
      }
    });
    return data;
  }, [viewData]);

  // 取消原本 crudForm 的依賴
  // useEffect(() => {
  //   if (viewData) { ... crudForm.setFieldsValue(...) }
  // }, [viewData, crudForm]);

  // API 查詢
  const { data, isFetching } = useQuery({
    queryKey: ['userList', params],
    queryFn: () =>
      getApiV1User({
        query: params as any,
      }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1User({ body: values }),
    onSuccess: () => {
      messageApi.success('新增成功');
      setIsCreateDrawerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['userList'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string | number, values: any }) => 
      putApiV1UserById({ path: { id: id as any }, body: values }),
    onSuccess: () => {
      messageApi.success('更新成功');
      setIsDrawerEditing(false);
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['userDetail'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteApiV1UserById({ path: { id: id as any } }),
    onSuccess: () => {
      messageApi.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['userDetail'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const resendActivationMutation = useMutation({
    mutationFn: (email: string) => {
      // 直接把設定寫入全域 Store，避開 Axios Headers 的複雜度
      useLoadingStore.getState().setLoadingMessage('正在重新發送啟用信件...');
      return postApiV1AuthResendActivation({ body: { email } });
    },
    onSuccess: (_, email) => {
      messageApi.success('已重新發送啟用信件');
      
      // 直接更新本地快取，將該帳號的啟動狀態設為 false
      queryClient.setQueriesData({ queryKey: ['userList'] }, (oldData: any) => {
        if (!oldData) return oldData;
        
        // 建立資料深拷貝以避免 mutate 原有 state
        const newData = JSON.parse(JSON.stringify(oldData));
        
        // 根據常見的 API 回傳結構更新資料
        if (newData?.data?.data?.data && Array.isArray(newData.data.data.data)) {
          newData.data.data.data = newData.data.data.data.map((user: any) => 
            user.email === email ? { ...user, isActive: false } : user
          );
        } else if (newData?.data?.data && Array.isArray(newData.data.data)) {
          newData.data.data = newData.data.data.map((user: any) => 
            user.email === email ? { ...user, isActive: false } : user
          );
        } else if (newData?.data && Array.isArray(newData.data)) {
          newData.data = newData.data.map((user: any) => 
            user.email === email ? { ...user, isActive: false } : user
          );
        }
        
        return newData;
      });
      
      // 同步觸發背景重取，確保與後端完全一致
      queryClient.invalidateQueries({ queryKey: ['userList'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `重新啟用失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (record: any) => {
      return putApiV1UserById({ 
        path: { id: record.id as any }, 
        body: { isActive: !record.isActive } 
      });
    },
    onSuccess: (_, record) => {
      messageApi.success(`已成功${record.isActive ? '停用' : '啟用'}帳號`);
      
      // 直接更新本地快取，讓畫面即時反應
      queryClient.setQueriesData({ queryKey: ['userList'] }, (oldData: any) => {
        if (!oldData) return oldData;
        
        const newData = JSON.parse(JSON.stringify(oldData));
        const toggleActive = (user: any) => user.id === record.id ? { ...user, isActive: !record.isActive } : user;

        if (newData?.data?.data?.data && Array.isArray(newData.data.data.data)) {
          newData.data.data.data = newData.data.data.data.map(toggleActive);
        } else if (newData?.data?.data && Array.isArray(newData.data.data)) {
          newData.data.data = newData.data.data.map(toggleActive);
        } else if (newData?.data && Array.isArray(newData.data)) {
          newData.data = newData.data.map(toggleActive);
        }
        
        return newData;
      });

      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['userDetail'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `狀態更新失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const openViewDrawer = (record: any) => {
    navigate(`/system/users/${record.id}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/system/users');
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
    setIsCreateDrawerOpen(true);
  };

  const startEditMode = () => {
    setIsDrawerEditing(true);
  };

  const handleCrudSubmit = (values: any) => {
    if (isCreateDrawerOpen) {
      createMutation.mutate(values);
    } else if (viewId) {
      updateMutation.mutate({ id: viewId as any, values });
    }
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'left' as const,
    width: 160,
    render: (_: any, record: any) => (
      <Space>
        {hasPermission('System.Users.View') && (
          <Tooltip title="檢視">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              style={{ color: '#1890ff' }} 
              onClick={() => openViewDrawer(record)}
            />
          </Tooltip>
        )}
        {hasPermission('System.Users.Delete') && (
          <Tooltip title="刪除">
            <Popconfirm
              title="確定要刪除此筆資料嗎？"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="確定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        )}
        {hasPermission('System.Users.Update') && record.email && (
          <Tooltip title={`重新發送啟用信件給 ${record.userName}`}>
            <Popconfirm
              title={`確定要重新發送啟用信件給 ${record.userName} 嗎？`}
              onConfirm={() => resendActivationMutation.mutate(record.email)}
              okText="確定"
              cancelText="取消"
            >
              <Button type="text" icon={<MailOutlined />} style={{ color: '#1890ff' }} />
            </Popconfirm>
          </Tooltip>
        )}
        {hasPermission('System.Users.Update') && (
          <Tooltip title={record.isActive ? "停用帳號" : "啟用帳號"}>
            <Popconfirm
              title={`確定要${record.isActive ? '停用' : '啟用'}此帳號嗎？`}
              onConfirm={() => toggleStatusMutation.mutate(record)}
              okText="確定"
              cancelText="取消"
            >
              <Button 
                type="text" 
                icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />} 
                style={{ color: record.isActive ? '#ff4d4f' : '#52c41a' }} 
              />
            </Popconfirm>
          </Tooltip>
        )}
      </Space>
    ),
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn);

  const handleSearch = (values: any) => {
    const nextParams = { ...values };
    userSearchFormConfig().forEach(field => {
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
    searchForm.resetFields();
    // 僅清空表單，不呼叫 resetParams()，避免自動觸發 API 查詢
  };


  const renderSearchTags = () => {
    const searchKeys = ['userName', 'name', 'employeeCode'];
    const activeFilters: React.ReactNode[] = [];
    
    searchKeys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        let label = key;
        let valueStr = String(params[key]);
        if (key === 'userName') label = '帳號';
        if (key === 'name') label = '姓名';
        if (key === 'employeeCode') label = '員工編號';
        activeFilters.push(<Tag color="blue" key={key} style={{ fontSize: '13px', padding: '2px 8px' }}>{label}: {valueStr}</Tag>);
      }
    });

    if (activeFilters.length === 0) {
      return <Tag color="default" style={{ margin: 0, fontSize: '13px', padding: '2px 8px' }}>【全部資料】</Tag>;
    }
    
    return <Space size={[0, 8]} wrap>{activeFilters}</Space>;
  };

  const openSearchModal = () => {
    searchForm.setFieldsValue(params);
    setIsSearchModalOpen(true);
  };

  const renderFormFields = (isEdit: boolean) => (
    <DynamicForm
      key={isCreateDrawerOpen ? 'create' : (viewId || 'empty')}
      defaultValues={isCreateDrawerOpen ? { isActive: true } : formattedViewData}
      fields={mainFormConfig()}
      onSubmit={handleCrudSubmit}
      isUpdateMode={isEdit}
      isViewMode={isViewMode}
      formId="userForm"
      hideDefaultFooter={true}
    />
  );

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
            <div style={{
              width: '4px',
              height: '24px',
              backgroundColor: '#1677ff',
              borderRadius: '2px'
            }} />
            <div style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--ant-color-text, inherit)', lineHeight: '24px' }}>
              用戶管理
            </div>
          </div>
        }
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={openSearchModal}
              style={{ fontWeight: 500 }}
            >
              進階查詢
            </Button>
            {hasPermission('System.Users.Create') && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={openCreateDrawer}
                style={{ fontWeight: 500 }}
              >
                新增資料
              </Button>
            )}
          </Space>
        }
      >
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-quaternary, #fafafa)', padding: '12px 16px', borderRadius: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', color: 'var(--ant-color-text-secondary, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>目前的查詢條件:</span>
          <DynamicSearchTags config={userSearchFormConfig()} params={params} onClose={(key) => setParams({ [key]: undefined, pageNumber: 1 })} />
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
            .view-mode-form .ant-select-arrow {
                display: none !important;
            }
          `}</style>
          <Table
            bordered
            rowClassName={(record) => String(record.id) === String(viewId) ? 'selected-table-row' : ''}
            style={{ flex: 1 }}
            columns={columns}
            dataSource={listData}
            rowKey="id"
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
        width={DRAWER_WIDTH_MAIN}
        style={{ top: '10vh' }}
        styles={{
          body: {
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '24px 24px 0 24px'
          }
        }}
        closeIcon={true}
      >
        <DynamicSearchForm config={userSearchFormConfig()} form={searchForm} onSearch={handleSearch} />
      </Modal>

      <Drawer
        title={
          <DrawerTitle
            moduleName="用戶管理"
            isCreate={isCreateDrawerOpen}
            isEdit={isDrawerEditing}
            record={viewData}
            displayField={(record) => `${record.userName || ''} - ${record.name || ''}`.replace(/^ - | - $/g, '')}
          />
        }
        placement="right"
        width={DRAWER_WIDTH_MAIN}
        onClose={closeViewDrawer}
        open={!!viewId || isCreateDrawerOpen}
        extra={
          <Space>
            {(!isDrawerEditing && !isCreateDrawerOpen && hasPermission('System.Users.Update')) && (
              <Button type="primary" icon={<EditOutlined />} onClick={startEditMode}>編輯</Button>
            )}
            {(isDrawerEditing || isCreateDrawerOpen) && (
              <>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  form="userForm"
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
          {renderFormFields(isDrawerEditing)}
        </Spin>
      </Drawer>
    </div>
  );
}
