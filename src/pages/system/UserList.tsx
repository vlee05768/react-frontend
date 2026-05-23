// @ts-nocheck
import PageCard from '@/components/common/PageCard';
import { getApiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Button, Modal, Space, Tooltip, Popconfirm, Drawer, Divider, theme, Spin, App } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  ClearOutlined,
  SaveOutlined,
  MailOutlined,
  StopOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { TableActions } from '@/utils/tableActions';
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
import { useAuthStore } from '@/stores/useAuthStore';
import { useLoadingStore } from '@/stores/useLoadingStore';
import { mainFormConfig, mainTableColumns , userSearchFormConfig} from './UserConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { ANIMATION_DELAY_MS, DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';;
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import { ActionBar } from '@/components/common/ActionBar';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';

export default function UserList() {
  const { message: messageApi, modal: modalApi } = App.useApp();
  const deletingRecordId = null;
  const { params, setParams } = useUserQueryStore();

  const listQuery = useErpListQuery({
    params,
    setParams,
  });

  const { hasPermission } = useAuthStore();
  const { token } = theme.useToken();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
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
  const viewData = (viewRes?.data?.data || viewRes?.data) as any;

  const formattedViewData = useMemo<any>(() => {
    if (!viewData) return undefined;
    const data = { ...viewData } as any;
    Object.keys(data).forEach(key => {
      if (key.toLowerCase().includes('date') && data[key] && typeof data[key] === 'string') {
        data[key] = data[key].substring(0, 10);
      }
    });
    return data;
  }, [viewData]);

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
      modalApi.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
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
      modalApi.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
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
      modalApi.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const resendActivationMutation = useMutation({
    mutationFn: (email: string) => {
      useLoadingStore.getState().setLoadingMessage('正在重新發送啟用信件...');
      return postApiV1AuthResendActivation({ body: { email } });
    },
    onSuccess: (_, email) => {
      messageApi.success('已重新發送啟用信件');
      
      queryClient.setQueriesData({ queryKey: ['userList'] }, (oldData: any) => {
        if (!oldData) return oldData;
        
        const newData = JSON.parse(JSON.stringify(oldData));
        
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
      
      queryClient.invalidateQueries({ queryKey: ['userList'] });
    },
    onError: (error: any) => {
      modalApi.error({ centered: true, title: '錯誤提示', content: `重新啟用失敗: ${getApiErrorMessage(error)}` });
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
      modalApi.error({ centered: true, title: '錯誤提示', content: `狀態更新失敗: ${getApiErrorMessage(error)}` });
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
    fixed: 'right' as const,
    width: 180,
    render: (_: any, record: any) => (
      <TableActions
        onView={hasPermission('System.Users.View') ? () => openViewDrawer(record) : undefined}
        onDelete={hasPermission('System.Users.Delete') ? () => deleteMutation.mutate(record.id) : undefined}
        recordName={record.userName}
        deleteConfirmType="popconfirm"
        extra={
          <>
            {hasPermission('System.Users.Update') && record.email && (
              <Tooltip title={`重新發送啟用信件給 ${record.userName}`}>
                <Popconfirm
                  title={`確定要重新發送啟用信件給 ${record.userName} 嗎？`}
                  onConfirm={(e) => { e?.stopPropagation(); resendActivationMutation.mutate(record.email); }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="確定"
                  cancelText="取消"
                >
                  <Button 
                    type="text" 
                    icon={<MailOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
                    style={{ color: token.colorPrimary }} 
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center hover:opacity-80"
                    size="small"
                  />
                </Popconfirm>
              </Tooltip>
            )}
            {hasPermission('System.Users.Update') && (
              <Tooltip title={record.isActive ? "停用帳號" : "啟用帳號"}>
                <Popconfirm
                  title={`確定要${record.isActive ? '停用' : '啟用'}此帳號嗎？`}
                  onConfirm={(e) => { e?.stopPropagation(); toggleStatusMutation.mutate(record); }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="確定"
                  cancelText="取消"
                >
                  <Button 
                    type="text" 
                    icon={record.isActive ? <StopOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} /> : <CheckCircleOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
                    style={{ color: record.isActive ? token.colorError : token.colorSuccess }} 
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center hover:opacity-80"
                    size="small"
                  />
                </Popconfirm>
              </Tooltip>
            )}
          </>
        }
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

  const renderFormFields = (isEdit: boolean) => (
    <DynamicForm
      key={isCreateDrawerOpen ? 'create' : (viewId || 'empty')}
      defaultValues={isCreateDrawerOpen ? { isActive: true } : (formattedViewData as any)}
      fields={mainFormConfig()}
      onSubmit={handleCrudSubmit}
      isUpdateMode={isEdit}
      isViewMode={isViewMode}
      formId="userForm"
      hideDefaultFooter={true}
    />
  );

  return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard title="用戶管理" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={listQuery.openSearchModal}
              className="font-medium"
            >
              查詢
            </Button>
            {hasPermission('System.Users.Create') && (
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
        }>
        
        <ActiveQueryAndSortTags
          searchConfig={userSearchFormConfig()}
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
            rowKey="id"
            loading={isFetching}
            selectedRowId={viewId}
            selectedRowKey="id"
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
        closeIcon={true}
      >
        <DynamicSearchForm config={userSearchFormConfig()} form={listQuery.searchForm} onSearch={listQuery.handleSearch} />
      </Modal>

      <Drawer
        styles={{ body: { padding: 0 } }}
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
                {(!isDrawerEditing && !isCreateDrawerOpen && hasPermission('System.Users.Update')) && (
                  <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={startEditMode}>編輯</Button>
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
          />
          <div className="p-6">
            {renderFormFields(isDrawerEditing)}
          </div>
        </Spin>
      </Drawer>
    </div>
  );
}
