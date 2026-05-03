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
  getApiV1Employee, 
  getApiV1EmployeeById,
  postApiV1Employee,
  putApiV1EmployeeById,
  deleteApiV1EmployeeById
} from '@/api/generated/sdk.gen';
import { getApiV1GeneralTypesGetTypes } from '@/api/generated/sdk.gen';
import { useEmployeeQueryStore } from '@/stores/employeeStore';
import { useAuthStore } from '@/stores/useAuthStore';

export default function EmployeeList() {
  const { params, setParams, resetParams } = useEmployeeQueryStore();
  const { hasPermission } = useAuthStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const [searchForm] = Form.useForm();
  const [crudForm] = Form.useForm();
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
    queryKey: ['employeeDetail', viewId],
    queryFn: () => getApiV1EmployeeById({ path: { id: viewId as any } }),
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
      crudForm.setFieldsValue(formattedData);
    }
  }, [viewData, crudForm]);

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

  // 獲取部門選單
  const { data: deptRes, isFetching: isFetchingDepartments } = useQuery({
    queryKey: ['departmentOptions'],
    queryFn: () => getApiV1GeneralTypesGetTypes({ query: { types: ['Department'] } }),
    staleTime: 1000 * 60 * 5,
  });
  
  const departmentOptions = ((deptRes?.data as any)?.data?.Department || (deptRes?.data as any)?.Department || []).map((d: any) => ({
    label: d.desc || d.code || '',
    value: d.code || ''
  }));

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1Employee({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['employeeList'] });
    },
    onError: (error: any) => {
      message.error(`新增失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string | number, values: any }) => 
      putApiV1EmployeeById({ path: { id: id as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['employeeList'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDetail'] });
    },
    onError: (error: any) => {
      message.error(`更新失敗: ${error?.response?.data?.message || '未知錯誤'}`);
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
      message.error(`刪除失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const openViewDrawer = (record: any) => {
    navigate(`/employee/${record.id}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/employee');
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
        crudForm.setFieldsValue(formattedData);
      }
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
    setIsDrawerEditing(true);
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
          {hasPermission('BasicData.Employees.View') && (
            <Tooltip title="檢視">
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                style={{ color: '#1890ff' }} 
                onClick={() => openViewDrawer(record)}
              />
            </Tooltip>
          )}
          {hasPermission('BasicData.Employees.Delete') && (
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
    { title: '員工編號', dataIndex: 'employeeNo', key: 'employeeNo', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '姓名', dataIndex: 'name', key: 'name', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '部門名稱', dataIndex: 'departmentName', key: 'departmentName', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '聯絡電話', dataIndex: 'phone', key: 'phone', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
    { title: '到職日期', dataIndex: 'hireDate', key: 'hireDate', align: 'center', render: (v: string) => v ? v.substring(0, 10) : '-' },
    { title: '離職日期', dataIndex: 'resignDate', key: 'resignDate', align: 'center', render: (v: string) => v ? v.substring(0, 10) : '-' },
    { title: '狀態', dataIndex: 'status', key: 'status', align: 'center', render: (v: number) => v === 1 ? <CheckOutlined style={{ color: 'green' }} /> : (v === 2 ? <CloseOutlined style={{ color: 'red' }} /> : null) },
    { title: '備註', dataIndex: 'notes', key: 'notes', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v },
  ];

  const handleSearch = (values: any) => {
    // 確保清空的欄位能覆蓋 Zustand store 中的舊值
    const searchKeys = ['employeeNo', 'name', 'status', 'departmentCode'];
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
    const searchKeys = ['employeeNo', 'name', 'status', 'departmentCode'];
    const activeFilters: React.ReactNode[] = [];
    
    searchKeys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        let label = key;
        let valueStr = String(params[key]);
        if (key === 'employeeNo') label = '員工編號';
        if (key === 'name') label = '姓名';
        if (key === 'status') valueStr = params[key] === 1 ? '在職' : (params[key] === 2 ? '離職' : String(params[key]));
        if (key === 'status') label = '狀態';
        if (key === 'departmentCode') valueStr = departmentOptions?.find((o: any) => o.value === params[key])?.label || String(params[key]);
        if (key === 'departmentCode') label = '部門代碼';
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
                  <Form.Item name="employeeNo" label="員工編號" rules={[{ required: true, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入員工編號'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="name" label="姓名" rules={[{ required: true, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入姓名'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="status" label="狀態" rules={[{ required: true, message: '必填欄位' }]}>
                    <Select placeholder={isViewMode ? '' : '請選擇狀態'} style={{ width: '100%' }}>
                      <Select.Option value={1}>在職</Select.Option>
                      <Select.Option value={2}>離職</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="departmentCode" label="部門代碼" rules={[{ required: true, message: '必填欄位' }]}>
                    <Select placeholder={isViewMode ? '' : '請選擇部門代碼'} style={{ width: '100%' }} options={departmentOptions} loading={isFetchingDepartments} showSearch filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="聯絡電話" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入聯絡電話'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label="電子郵件" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder={isViewMode ? '' : '請輸入電子郵件'} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="hireDate" label="到職日期">
                    <Input type={isViewMode ? 'text' : 'date'} placeholder={isViewMode ? '' : '請選擇到職日期'} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="resignDate" label="離職日期">
                    <Input type={isViewMode ? 'text' : 'date'} placeholder={isViewMode ? '' : '請選擇離職日期'} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="notes" label="備註">
                    <Input.TextArea placeholder={isViewMode ? '' : '請輸入備註'} rows={3} />
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
              員工基本檔
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
            {hasPermission('BasicData.Employees.Create') && (
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
              <Form.Item name="employeeNo" label="員工編號">
                <Input placeholder="請輸入員工編號" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="姓名">
                <Input placeholder="請輸入姓名" allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="狀態">
                <Select placeholder="請選擇狀態" allowClear style={{ width: '100%' }}>
                  <Select.Option value={1}>在職</Select.Option>
                  <Select.Option value={2}>離職</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentCode" label="部門代碼">
                <Select placeholder="請選擇部門代碼" allowClear style={{ width: '100%' }} options={departmentOptions} loading={isFetchingDepartments} showSearch filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title={
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {isCreateDrawerOpen ? '新增員工基本檔' : (isDrawerEditing ? '編輯員工基本檔' : '檢視員工基本檔')}
          </div>
        }
        placement="right"
        size="large"
        onClose={closeViewDrawer}
        open={!!viewId || isCreateDrawerOpen}
        extra={
          (!isDrawerEditing && !isCreateDrawerOpen && hasPermission('BasicData.Employees.Update')) && (
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
