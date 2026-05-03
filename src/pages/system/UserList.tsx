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
  getApiV1User, 
  getApiV1UserById,
  postApiV1User,
  putApiV1UserById,
  deleteApiV1UserById
} from '@/api/generated/sdk.gen';

import { useUserQueryStore } from '@/stores/systemStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function UserList() {
  const { params, setParams, resetParams } = useUserQueryStore();
  const { hasPermission } = useAuthStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const [searchForm] = Form.useForm();
  const [crudForm] = Form.useForm();
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const isViewMode = !isDrawerEditing && !isCreateDrawerOpen;
  
  const firstInputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (isCreateDrawerOpen || isDrawerEditing) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
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
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['userList'] });
    },
    onError: (error: any) => {
      message.error(`新增失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string | number, values: any }) => 
      putApiV1UserById({ path: { id: id as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['userDetail'] });
    },
    onError: (error: any) => {
      message.error(`更新失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteApiV1UserById({ path: { id: id as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['userDetail'] });
    },
    onError: (error: any) => {
      message.error(`刪除失敗: ${error?.response?.data?.message || '未知錯誤'}`);
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
      crudForm.resetFields();
    } else if (isCreateDrawerOpen) {
      closeViewDrawer();
    }
  };

  const openCreateDrawer = () => {
    crudForm.resetFields();
    crudForm.setFieldsValue({ isActive: true });
    setIsCreateDrawerOpen(true);
  };

  const startEditMode = () => {
    if (viewData) {
      const formattedData = { ...viewData };
      // 將 API 傳回的 ISO Date 截斷為 YYYY-MM-DD 供 <Input type="date"> 使用
      Object.keys(formattedData).forEach(key => {
        if (key.toLowerCase().includes('date') && formattedData[key] && typeof formattedData[key] === 'string') {
          formattedData[key] = formattedData[key].substring(0, 10);
        }
      });
      crudForm.setFieldsValue(formattedData);
      setIsDrawerEditing(true);
    }
  };

  const handleCrudSubmit = (values: any) => {
    if (isCreateDrawerOpen) {
      createMutation.mutate(values);
    } else if (viewId) {
      updateMutation.mutate({ id: viewId as any, values });
    }
  };

  const handleFinishFailed = (errorInfo: any) => {
    if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
      const firstErrorField = errorInfo.errorFields[0].name;
      crudForm.scrollToField(firstErrorField, { behavior: 'smooth' });
      setTimeout(() => {
        crudForm.getFieldInstance(firstErrorField)?.focus();
      }, 100);
    }
  };

  const columns = [
    {
      title: '操作',
      key: 'actions',
      fixed: 'left' as const,
      width: 120,
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
        </Space>
      ),
    },
    { title: '狀態', dataIndex: 'isActive', key: 'isActive', align: 'center', render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null) },
    { title: '帳號', dataIndex: 'userName', key: 'userName', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '姓名', dataIndex: 'name', key: 'name', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '員工編號', dataIndex: 'employeeCode', key: 'employeeCode', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '職位', dataIndex: 'position', key: 'position', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '電子郵件', dataIndex: 'email', key: 'email', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '部門', dataIndex: 'department', key: 'department', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '分機號碼', dataIndex: 'extensionNumber', key: 'extensionNumber', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '手機號碼', dataIndex: 'mobile', key: 'mobile', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '電話號碼', dataIndex: 'phoneNumber', key: 'phoneNumber', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '角色', dataIndex: 'roles', key: 'roles', render: (v: string[]) => v?.join(', ') || '-' },
  ];

  const handleSearch = (values: any) => {
    // 確保清空的欄位能覆蓋 Zustand store 中的舊值
    const searchKeys = ['userName', 'name', 'employeeCode'];
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
    <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="isActive" label="狀態" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="userName" label="帳號" rules={[{ required: true, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入帳號'} disabled={isEdit} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="name" label="姓名" rules={[{ required: true, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入姓名'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="employeeCode" label="員工編號" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入員工編號'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="position" label="職位" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入職位'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label="電子郵件" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入電子郵件'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="department" label="部門" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入部門'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="extensionNumber" label="分機號碼" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入分機號碼'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="mobile" label="手機號碼" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入手機號碼'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phoneNumber" label="電話號碼" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入電話號碼'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="roles" label="角色">
                    <Select mode="tags" placeholder={isViewMode ? '' : '請選擇或輸入角色'} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
    </Row>
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
            .view-mode-form .ant-select-disabled .ant-select-selection-item,
            .view-mode-form .ant-select-disabled .ant-select-selector,
            .view-mode-form .ant-input-number-disabled,
            .view-mode-form .ant-picker-disabled {
                color: var(--ant-color-text, rgba(0, 0, 0, 0.88)) !important;
                background-color: var(--ant-color-bg-container-disabled, rgba(0, 0, 0, 0.04)) !important;
                border-color: var(--ant-color-border, #d9d9d9) !important;
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
              <Form.Item name="userName" label="帳號">
                <Input placeholder="請輸入帳號" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="姓名">
                <Input placeholder="請輸入姓名" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employeeCode" label="員工編號">
                <Input placeholder="請輸入員工編號" allowClear />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title={
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {isCreateDrawerOpen ? '新增用戶管理' : (isDrawerEditing ? '編輯用戶管理' : '檢視用戶管理')}
          </div>
        }
        placement="right"
        size="large"
        onClose={closeViewDrawer}
        open={!!viewId || isCreateDrawerOpen}
        extra={
          (!isDrawerEditing && !isCreateDrawerOpen && hasPermission('System.Users.Update')) && (
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
                  onClick={() => crudForm.submit()}
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
          <Form
            form={crudForm}
            layout="vertical"
            onFinish={handleCrudSubmit}
            onFinishFailed={handleFinishFailed}
            className={(!isDrawerEditing && !isCreateDrawerOpen) ? 'view-mode-form' : ''}
            disabled={!isDrawerEditing && !isCreateDrawerOpen}
          >
            {renderFormFields(isDrawerEditing)}
          </Form>
        </Spin>
      </Drawer>
    </div>
  );
}
