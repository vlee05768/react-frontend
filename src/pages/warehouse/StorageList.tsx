// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
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
  CloseOutlined
} from '@ant-design/icons';
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
import { mainDictionary, mainFormConfig, mainTableColumns } from './StorageConfig';
import { buildTableColumns } from '@/utils/tableUtils';

export default function StorageList() {
  const { params, setParams, resetParams } = useStorageQueryStore();
  const { hasPermission } = useAuthStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const [searchForm] = Form.useForm();
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
      }, 100);
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
      Modal.error({ centered: true, title: '錯誤提示', content: `新增失敗: ${error?.response?.data?.message || '未知錯誤'}` });
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
      Modal.error({ centered: true, title: '錯誤提示', content: `更新失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string | number) => deleteApiV1StorageByCode({ path: { code: code as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['storageList'] });
      queryClient.invalidateQueries({ queryKey: ['storageDetail'] });
    },
    onError: (error: any) => {
      Modal.error({ centered: true, title: '錯誤提示', content: `刪除失敗: ${error?.response?.data?.message || '未知錯誤'}` });
    }
  });

  const openViewDrawer = (record: any) => {
    navigate(`/warehouse/storages/${record.code}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/warehouse/storages');
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
    fixed: 'left' as const,
    width: 120,
    render: (_: any, record: any) => (
      <Space>
        {hasPermission('Warehouse.Storages.View') && (
          <Tooltip title="檢視">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              style={{ color: '#1890ff' }} 
              onClick={() => openViewDrawer(record)}
            />
          </Tooltip>
        )}
        {false && (
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
    // 確保清空的欄位能覆蓋 Zustand store 中的舊值
    const searchKeys = ['CodeOrName', 'Type'];
    const nextParams = { ...values };
    
    searchKeys.forEach(key => {
      if (nextParams[key] === '' || nextParams[key] === null) {
        nextParams[key] = undefined;
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
    const searchKeys = ['CodeOrName', 'Type'];
    const activeFilters: React.ReactNode[] = [];
    
    searchKeys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        let label = key;
        let valueStr = String(params[key]);
        if (key === 'CodeOrName') label = '編號或名稱';
        if (key === 'Type') label = '類型';
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
              儲位管理
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
            {false && (
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
            .view-mode-form .ant-select-arrow {
                display: none !important;
            }
          `}</style>
          <Table
            bordered
            rowClassName={(record) => record.code === viewId ? 'selected-table-row' : ''}
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
        width={'60vw'}
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
        <Form
          form={searchForm}
          layout="vertical"
          onFinish={handleSearch}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="CodeOrName" label="編號或名稱">
                <Input placeholder="請輸入編號或名稱" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="Type" label="類型">
                <Input placeholder="請輸入類型" allowClear />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title={
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {isCreateDrawerOpen ? '新增儲位管理' : (isDrawerEditing ? '編輯儲位管理' : '檢視儲位管理')}
          </div>
        }
        placement="right"
        size="large"
        onClose={closeViewDrawer}
        open={!!viewId || isCreateDrawerOpen}
        extra={
          (!isDrawerEditing && !isCreateDrawerOpen && false) && (
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={startEditMode}
            >
              編輯
            </Button>
          )
        }
        footer={
          (isDrawerEditing || isCreateDrawerOpen) && (
            <div style={{ textAlign: 'right', padding: '8px 0' }}>
              <Space>
                <Button onClick={handleCancel}>取消</Button>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />} 
                  htmlType="submit" form="crud-form"
                  loading={isCreateDrawerOpen ? createMutation.isPending : updateMutation.isPending}
                >
                  儲存
                </Button>
              </Space>
            </div>
          )
        }
      >
                <Spin spinning={isFetchingView && !isCreateDrawerOpen}>
          <DynamicForm
            formId="storageForm"
            fields={mainFormConfig()}
            defaultValues={formDefaultValues}
            onSubmit={handleCrudSubmit}
            isUpdateMode={isDrawerEditing}
            isViewMode={!isDrawerEditing && !isCreateDrawerOpen}
            hideDefaultFooter={true}
          />
        </Spin>
      </Drawer>
    </div>
  );
}
