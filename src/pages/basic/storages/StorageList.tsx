// @ts-nocheck
import PageCard from '@/components/common/PageCard';
import { getApiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Spin, Button, Modal, Space, message, Drawer, Divider } from 'antd';
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
  getApiV1Storage, 
  getApiV1StorageByCode,
  postApiV1Storage,
  putApiV1StorageByCode,
  deleteApiV1StorageByCode
} from '@/api/generated/sdk.gen';

import { useStorageQueryStore } from '@/stores/warehouseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { useErpListQuery } from '@/hooks/useErpListQuery';
import ActiveQueryAndSortTags from '@/components/Table/ActiveQueryAndSortTags';
import StandardErpTable from '@/components/Table/StandardErpTable';
import { mainFormConfig, mainTableColumns , storageSearchFormConfig} from './StorageConfig';
import { buildTableColumns, formatSorterToRules } from '@/utils/tableUtils';
import { ANIMATION_DELAY_MS, DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';;
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import { ActionBar } from '@/components/common/ActionBar';

export default function StorageList() {
  const deletingRecordId = null;
  const { params, setParams } = useStorageQueryStore();
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
    queryKey: ['storageDetail', viewId],
    queryFn: () => getApiV1StorageByCode({ path: { code: viewId as any } }),
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
    queryKey: ['storageList', params],
    queryFn: () =>
      getApiV1Storage({
        query: params as any,
      }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1Storage({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      setFormDefaultValues({});
      queryClient.invalidateQueries({ queryKey: ['storageList'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, values }: { code: string | number, values: any }) => 
      putApiV1StorageByCode({ path: { code: code as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      setFormDefaultValues({});
      queryClient.invalidateQueries({ queryKey: ['storageList'] });
      queryClient.invalidateQueries({ queryKey: ['storageDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => deleteApiV1StorageByCode({ path: { code: code as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['storageList'] });
      closeViewDrawer();
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const reservedCodes = ["TW-FG-GEN", "TW-MAT-GEN", "TW-QC-GEN", "TW-SCRAP-GEN"];
  const isReserved = (code: string) => reservedCodes.includes(code);

  const openViewDrawer = (record: any) => {
    navigate(`/basic/storages/${record.code}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/basic/storages');
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
    setFormDefaultValues({ 
      isActive: true, 
      location: 'TW', 
      type: 'MAT',
      isCalculateInventory: true,
      code: '【系統自動編碼】',
      name: '【系統自動產生】'
    });
    setIsCreateDrawerOpen(true);
  };

  const startEditMode = () => {
    setIsDrawerEditing(true);
  };

  const handleCrudSubmit = (values: any) => {
    const payload = { ...values };
    if (payload.code === '【系統自動編碼】') {
      delete payload.code;
    }
    if (payload.name === '【系統自動產生】') {
      delete payload.name;
    }
    if (isCreateDrawerOpen) {
      payload.isCalculateInventory = true;
      createMutation.mutate(payload);
    } else if (viewId) {
      payload.isCalculateInventory = viewData?.isCalculateInventory ?? true;
      updateMutation.mutate({ code: viewId as any, values: payload });
    }
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
    render: (_: any, record: any) => {
      const showDelete = !isReserved(record.code) && hasPermission('BasicData.Storages.Delete');
      return (
        <TableActions
          onView={hasPermission('BasicData.Storages.View') ? () => openViewDrawer(record) : undefined}
          onDelete={showDelete ? () => {
            Modal.confirm({
              title: `確定要刪除儲位 ${record.code} 嗎？`,
              content: '警告：此操作不可逆！刪除儲位可能會影響該儲位的相關庫存記錄。',
              okText: '確定刪除',
              cancelText: '取消',
              okButtonProps: { danger: true },
              onOk: () => {
                deleteMutation.mutate(record.code);
              }
            });
          } : undefined}
        />
      );
    },
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
      <PageCard title="儲位管理" extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={listQuery.openSearchModal}
              className="font-medium"
            >
              查詢
            </Button>
            {hasPermission('BasicData.Storages.Create') && (
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
          searchConfig={storageSearchFormConfig()}
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
            selectedRowKey="storageCode"
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
        <DynamicSearchForm config={storageSearchFormConfig()} form={listQuery.searchForm} onSearch={listQuery.handleSearch} />
      </Modal>

      <Drawer
        styles={{ body: { padding: 0 } }}
        title={
          <DrawerTitle
            moduleName="儲位管理"
            isCreate={isCreateDrawerOpen}
            isEdit={isDrawerEditing}
            record={viewData}
            displayField={(record) => `${record.storageCode || ''} - ${record.name || ''}`.replace(/^ - | - $/g, '')}
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
                {(!isDrawerEditing && !isCreateDrawerOpen && viewId && !isReserved(viewId) && hasPermission('BasicData.Storages.Update')) && (
                  <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={startEditMode}>編輯</Button>
                )}
                {(isDrawerEditing || isCreateDrawerOpen) && (
                  <>
                    <Button 
                      type="primary" 
                      htmlType="submit"
                      form="storageForm"
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
              formId="storageForm"
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
