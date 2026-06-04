// @ts-nocheck
import PageCard from '@/components/common/PageCard';
import { getApiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from 'react-router-dom';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import { employeeFormConfig, employeeTableColumns, employeeSearchConfig } from './EmployeeConfig';
import { buildTableColumns, formatSorterToRules, getColumnLabel } from '@/utils/tableUtils';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { InputRef } from 'antd';
import { App , Popconfirm} from 'antd';
import { Spin, Table, Button, Modal, Form, Input, Select, Space, Tag, Tooltip, Row, Col, message, Drawer, Descriptions, Switch, Divider } from 'antd';
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
  getApiV1Employee, 
  getApiV1EmployeeById,
  postApiV1Employee,
  putApiV1EmployeeById,
  deleteApiV1EmployeeById
} from '@/api/generated/sdk.gen';
import { DictLabel } from '@/components/Form/DictLabel';
import { DictSelect } from '@/components/Form/DictSelect';
import { useEmployeeQueryStore } from '@/stores/employeeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { ANIMATION_DELAY_MS, DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';;
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import { ActionBar } from '@/components/common/ActionBar';

export default function EmployeeList() {
  const { modal } = App.useApp();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const { params, setParams, resetParams } = useEmployeeQueryStore();
  const { hasPermission } = useAuthStore();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const listQuery = useErpListQuery({
    params,
    setParams,
  });
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
    queryKey: ['employeeDetail', viewId],
    queryFn: () => getApiV1EmployeeById({ path: { id: viewId as any } }),
    enabled: !!viewId,
  });
  const viewData = (viewRes?.data?.data || viewRes?.data) as any;

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
    queryKey: ['employeeList', params],
    queryFn: () =>
      getApiV1Employee({
        query: params as any,
      }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;


  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1Employee({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      setFormDefaultValues({});
      queryClient.invalidateQueries({ queryKey: ['employeeList'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string | number, values: any }) => 
      putApiV1EmployeeById({ path: { id: id as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      setFormDefaultValues({});
      queryClient.invalidateQueries({ queryKey: ['employeeList'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteApiV1EmployeeById({ path: { id: id as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['employeeList'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const openViewDrawer = (record: any) => {
    navigate(`/basic/employees/${record.id}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/basic/employees');
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
    setFormDefaultValues({ status: 1 });
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
      width: 120,
      render: (_: any, record: any) => (
        <TableActions
          onView={hasPermission('BasicData.Employees.View') ? () => openViewDrawer(record) : undefined}
          onDelete={hasPermission('BasicData.Employees.Delete') ? () => deleteMutation.mutate(record.id) : undefined}
          recordName={record.name || record.employeeCode}
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

  const columns = buildTableColumns(employeeTableColumns, actionColumn, params.SortRules);

    return (
    <div className="p-4 pb-0 flex flex-col h-[calc(100vh-64px)]">
      <PageCard title="員工基本檔" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={listQuery.openSearchModal}
              className="font-medium"
            >
              查詢
            </Button>
            {hasPermission('BasicData.Employees.Create') && (
              <Button 
                type="primary" 
                icon={<PlusOutlined/>} 
                onClick={openCreateDrawer}
                className="font-medium"
              >
                新增資料
              </Button>
            )}
          </Space>
        }>
        <ActiveQueryAndSortTags
          searchConfig={employeeSearchConfig}
          tableColumns={employeeTableColumns}
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
        <DynamicSearchForm
          config={employeeSearchConfig}
          form={listQuery.searchForm}
          onSearch={listQuery.handleSearch}
        />
      </Modal>

      <Drawer
        styles={{ body: { padding: 0 } }}
        title={
          <DrawerTitle
            moduleName="員工基本檔"
            isCreate={isCreateDrawerOpen}
            isEdit={isDrawerEditing}
            record={viewData}
            displayField={(record) => `${record.employeeNo || ''} - ${record.name || ''}`.replace(/^ - | - $/g, '')}
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
            {(!isDrawerEditing && !isCreateDrawerOpen && hasPermission('BasicData.Employees.Update')) && (
              <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={startEditMode}>編輯</Button>
            )}
            {(isDrawerEditing || isCreateDrawerOpen) && (
              <>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  form="employee-form"
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
            formId="employee-form"
            fields={employeeFormConfig}
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
