// @ts-nocheck
import { getApiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
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
  Divider,
  Tree
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowsAltOutlined,
  ShrinkOutlined,
  PlusSquareOutlined,
  MinusSquareOutlined,
  ClearOutlined,
  SaveOutlined,
  EyeOutlined,
  AppstoreOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1Role,
  getApiV1AuthPermissionsTree, 
  getApiV1RoleById,
  postApiV1Role,
  putApiV1RoleById,
  deleteApiV1RoleById
} from '@/api/generated/sdk.gen';

import { useRoleQueryStore } from '@/stores/systemStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DrawerTitle } from '@/components/Form/DrawerTitle';
import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import DynamicSearchTags from '@/components/Form/DynamicSearchTags';
import { mainDictionary, mainFormConfig, mainTableColumns , roleSearchFormConfig} from './RoleConfig';
import { buildTableColumns } from '@/utils/tableUtils';
import { ANIMATION_DELAY_MS, DRAWER_WIDTH_MAIN, MODAL_BODY_MAX_HEIGHT, MODAL_WIDTH_SEARCH } from '@/constants';
import { TABLE_ACTION_ICON_SIZE } from '@/constants/ui';
import type { TreeDataNode } from 'antd';
import { ActionBar } from '@/components/common/ActionBar';

export default function RoleList() {
  const { modal } = App.useApp();
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const { params, setParams, resetParams } = useRoleQueryStore();
  const { hasPermission } = useAuthStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const searchForm = useForm();
  const [formDefaultValues, setFormDefaultValues] = useState<any>({});
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const isViewMode = !isDrawerEditing && !isCreateDrawerOpen;
  
  // Tree States
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [allTreeKeys, setAllTreeKeys] = useState<React.Key[]>([]);

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

  // 取得權限樹資料
  const { data: treeRes, isFetching: isFetchingTree } = useQuery({
    queryKey: ['permissionsTree'],
    queryFn: () => getApiV1AuthPermissionsTree(),
  });

  const treeData = useMemo(() => {
    const rawData = treeRes?.data?.data || [];
    const keys: React.Key[] = [];
    
    const transformToAntdTree = (nodes: any[]): TreeDataNode[] => {
      return nodes.map(node => {
        if (!keys.includes(node.key)) {
          keys.push(node.key);
        }
        return {
          key: node.key,
          title: node.label || node.title || node.key,
          children: node.children ? transformToAntdTree(node.children) : undefined
        };
      });
    };
    
    const result = transformToAntdTree(rawData);
    setAllTreeKeys(keys);
    
    // 預設全展開
    if (keys.length > 0 && expandedKeys.length === 0) {
      setExpandedKeys(keys);
    }
    return result;
  }, [treeRes?.data]);

  // 單筆資料查詢 (Drawer)
  const { data: viewRes, isFetching: isFetchingView } = useQuery({
    queryKey: ['roleDetail', viewId],
    queryFn: () => getApiV1RoleById({ path: { id: viewId as any } }),
    enabled: !!viewId,
  });
  const viewData = viewRes?.data?.data || viewRes?.data;

  // 當獲取到單筆資料時，更新表單內容與勾選的權限
  useEffect(() => {
    if (viewData) {
      const formattedData = { ...viewData };
      Object.keys(formattedData).forEach(key => {
        if (key.toLowerCase().includes('date') && formattedData[key] && typeof formattedData[key] === 'string') {
          formattedData[key] = formattedData[key].substring(0, 10);
        }
      });
      setFormDefaultValues(formattedData);
      
      // 更新權限樹狀態
      if (viewData.permissions) {
        setCheckedKeys(viewData.permissions);
      } else {
        setCheckedKeys([]);
      }
    }
  }, [viewData]);

  // API 查詢
  const { data, isFetching } = useQuery({
    queryKey: ['roleList', params],
    queryFn: () =>
      getApiV1Role({
        query: params as any,
      }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1Role({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      setFormDefaultValues({});
      setCheckedKeys([]);
      queryClient.invalidateQueries({ queryKey: ['roleList'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string | number, values: any }) => 
      putApiV1RoleById({ path: { id: id as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      setFormDefaultValues({});
      queryClient.invalidateQueries({ queryKey: ['roleList'] });
      queryClient.invalidateQueries({ queryKey: ['roleDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteApiV1RoleById({ path: { id: id as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['roleList'] });
      queryClient.invalidateQueries({ queryKey: ['roleDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${getApiErrorMessage(error)}` });
    }
  });

  const openViewDrawer = (record: any) => {
    navigate(`/system/roles/${record.id}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/system/roles');
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
        setCheckedKeys(viewData.permissions || []);
      }
    } else if (isCreateDrawerOpen) {
      closeViewDrawer();
    }
  };

  const openCreateDrawer = () => {
    setFormDefaultValues({});
    setCheckedKeys([]);
    setIsCreateDrawerOpen(true);
  };

  const startEditMode = () => {
    setIsDrawerEditing(true);
  };

  const handleCrudSubmit = (values: any) => {
    const payload = {
      ...values,
      permissions: checkedKeys
    };
    
    if (isCreateDrawerOpen) {
      createMutation.mutate(payload);
    } else if (viewId) {
      updateMutation.mutate({ id: viewId as any, values: payload });
    }
  };

  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right' as const,
    width: 120,
    render: (_: any, record: any) => (
      <Space>
        {hasPermission('System.Roles.View') && (
          <Tooltip title="檢視">
            <Button 
              type="text" 
              icon={<EyeOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
              style={{ color: '#1890ff' }} 
              onClick={() => openViewDrawer(record)}
            />
          </Tooltip>
        )}
        {hasPermission('System.Roles.Delete') && (
          <Tooltip title="刪除">
            <Popconfirm
            title="刪除確認"
            description="確定要刪除此筆資料嗎？此操作無法還原。"
            onConfirm={() => deleteMutation.mutate(record.id)}
            onOpenChange={(open) => {
              const r = record as any;
              const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
              if (typeof setDeletingRecordId !== 'undefined') setDeletingRecordId(open ? String(recordId) : null);
            }}
            okButtonProps={{ danger: true }}
            okText="刪除"
            cancelText="取消"
            placement="topLeft"
          >
            <Button type="text" danger icon={<DeleteOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} />
          </Popconfirm>
          </Tooltip>
        )}
      </Space>
    ),
  };

  const columns = buildTableColumns(mainTableColumns(), actionColumn);

  return (
    <div className="p-[16px 16px 0px 16px] flex flex-col" style={{height: 'calc(100vh - 64px)'}}>
      <Card
        variant="borderless"
        style={{flex: 1, overflow: 'hidden' }}
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
              角色管理
            </div>
          </div>
        }
        extra={
          <Space separator={<Divider orientation="vertical" />}>
            {hasPermission('System.Roles.Create') && (
              <Button 
                type="primary" 
                icon={<PlusOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
                onClick={openCreateDrawer}
                className="font-medium"
              >
                新增資料
              </Button>
            )}
          </Space>
        }
      >
        <div className="flex flex-col" style={{flex: 1, overflow: 'hidden' }}>
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
            .view-mode-form .ant-switch-disabled {
                opacity: 1 !important;
                cursor: default !important;
            }
            .view-mode-form .ant-select-arrow {
                display: none !important;
            }
            
            .permissions-tree-card .ant-card-body {
                padding: 16px;
                height: calc(100vh - 220px);
                overflow-y: auto;
            }
          `}</style>
          <Table
            bordered
            rowClassName={(record) => {
            const r = record as any; const recordId = r.id || r.code || r.documentNumber || r.moldCode || r.referenceNumber;
            let cls = '';
            if (String(record.id) === String(viewId)) cls += 'selected-table-row ';
            if (recordId && String(recordId) === String(deletingRecordId)) cls += 'deleting-row-highlight';
            return cls.trim();
          }}
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

      <Drawer
        styles={{ body: { padding: 0 } }}
        title={
          <DrawerTitle
            moduleName="角色管理"
            isCreate={isCreateDrawerOpen}
            isEdit={isDrawerEditing}
            record={viewData}
            displayField={(record) => `${record.name || ''} - ${record.caption || ''}`.replace(/^ - | - $/g, '')}
          />
        }
        placement="right"
        size={DRAWER_WIDTH_MAIN}
        onClose={closeViewDrawer}
        open={!!viewId || isCreateDrawerOpen}
        mask={{ closable: isViewMode }}
        keyboard={isViewMode}
        bodyStyle={{ backgroundColor: 'var(--ant-color-fill-quaternary, #fafafa)', padding: '24px' }}
        
      >
        <Spin spinning={isFetchingView && !isCreateDrawerOpen}>
          <ActionBar 
            createdBy={viewData?.createdBy}
            createdAt={viewData?.createdAt}
            updatedBy={viewData?.updatedBy}
            updatedAt={viewData?.updatedAt}
            actions={
              <Space>
            {(!isDrawerEditing && !isCreateDrawerOpen && hasPermission('System.Roles.Update')) && (
              <Button type="primary" icon={<EditOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} onClick={startEditMode}>編輯</Button>
            )}
            {(isDrawerEditing || isCreateDrawerOpen) && (
              <>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  form="roleForm"
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
          <Row gutter={[24, 24]}>
            <Col xs={24} md={14} lg={16}>
              <Card title="基本資料" variant="borderless" styles={{ body: { padding: '20px' }, header: { padding: '16px 20px', borderBottom: '1px solid #f0f0f0' } }}>
                <DynamicForm
                  formId="roleForm"
                  fields={mainFormConfig()}
                  defaultValues={formDefaultValues}
                  onSubmit={handleCrudSubmit}
                  isUpdateMode={isDrawerEditing}
                  isViewMode={!isDrawerEditing && !isCreateDrawerOpen}
                  hideDefaultFooter={true}
                />
              </Card>
            </Col>
            <Col xs={24} md={10} lg={8}>
              <Card 
                title="權限設定" 
                variant="borderless" 
                className="permissions-tree-card"
                styles={{ header: { padding: '16px 20px', borderBottom: '1px solid #f0f0f0' } }}
                extra={
                  <Space size="small">
                    <Tooltip title="全部展開">
                      <Button type="text" size="small" icon={<PlusSquareOutlined />} onClick={() => setExpandedKeys(allTreeKeys)} />
                    </Tooltip>
                    <Divider type="vertical" />
                    <Tooltip title="全部收合">
                      <Button type="text" size="small" icon={<MinusSquareOutlined />} onClick={() => setExpandedKeys([])} />
                    </Tooltip>
                  </Space>
                }
              >
                <Spin spinning={isFetchingTree}>
                  <Tree
                    checkable
                    disabled={isViewMode}
                    treeData={treeData}
                    checkedKeys={checkedKeys}
                    expandedKeys={expandedKeys}
                    onCheck={(checkedKeysValue) => {
                      if (!isViewMode) {
                        setCheckedKeys(checkedKeysValue as React.Key[]);
                      }
                    }}
                    onExpand={(expandedKeysValue) => {
                      setExpandedKeys(expandedKeysValue);
                    }}
                  />
                </Spin>
              </Card>
            </Col>
          </Row>
                  </div>
        </Spin>
      </Drawer>
    </div>
  );
}
