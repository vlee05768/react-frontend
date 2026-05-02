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
  AppstoreOutlined
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
    queryKey: ['employeeDetail', viewId],
    queryFn: () => getApiV1EmployeeById({ path: { id: viewId as any } }),
    enabled: !!viewId,
  });
  const viewData = viewRes?.data?.data || viewRes?.data;

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
      crudForm.setFieldsValue(viewData);
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
    { title: '員工編號', dataIndex: 'employeeNo', key: 'employeeNo' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '部門名稱', dataIndex: 'departmentName', key: 'departmentName' },
    { title: '聯絡電話', dataIndex: 'phone', key: 'phone' },
    { title: '到職日期', dataIndex: 'hireDate', key: 'hireDate', render: (v: string) => v ? v.substring(0, 10) : '-' },
    { title: '狀態', dataIndex: 'status', key: 'status', render: (v: number) => <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? '在職' : '離職'}</Tag> },
  ];

  const handleSearch = (values: any) => {
    // 移除空字串
    const cleanValues = Object.fromEntries(
      Object.entries(values).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    );
    setParams({
      ...cleanValues,
      pageNumber: 1,
    });
    setIsSearchModalOpen(false);
  };

  const handleSearchReset = () => {
    searchForm.resetFields();
    resetParams();
    setIsSearchModalOpen(false);
  };


  const renderSearchTags = () => {
    const searchKeys = ['employeeNo', 'name', 'phone', 'status', 'departmentCode'];
    const activeFilters: React.ReactNode[] = [];
    
    searchKeys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        let label = key;
        let valueStr = String(params[key]);
        if (key === 'employeeNo') label = '員工編號';
        if (key === 'name') label = '姓名';
        if (key === 'phone') label = '聯絡電話';
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
                    <Input placeholder="請輸入員工編號" ref={firstInputRef} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="name" label="姓名" rules={[{ required: true, message: '必填欄位' }]}>
                    <Input placeholder="請輸入姓名" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="status" label="狀態" rules={[{ required: true, message: '必填欄位' }]}>
                    <Select placeholder="請選擇狀態" style={{ width: '100%' }}>
                      <Select.Option value={1}>在職</Select.Option>
                      <Select.Option value={2}>離職</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="departmentCode" label="部門代碼" rules={[{ required: true, message: '必填欄位' }]}>
                    <Select placeholder="請選擇部門代碼" style={{ width: '100%' }} options={departmentOptions} loading={isFetchingDepartments} showSearch filterOption={(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="聯絡電話" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入聯絡電話" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label="電子郵件" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入電子郵件" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="hireDate" label="到職日期">
                    <Input type="date" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="resignDate" label="離職日期">
                    <Input type="date" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="notes" label="備註">
                    <Input.TextArea placeholder="請輸入備註" rows={3} />
                  </Form.Item>
                </Col>
    </Row>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card
        variant="borderless"
        styles={{ header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' } }}
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
          <Space split={<Divider type="vertical" />}>
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
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-quaternary, #fafafa)', padding: '12px 16px', borderRadius: '6px' }}>
          <span style={{ fontSize: '14px', color: 'var(--ant-color-text-secondary, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>目前的查詢條件:</span>
          {renderSearchTags()}
        </div>
        <Table
          columns={columns}
          dataSource={listData}
          rowKey="id"
          loading={isFetching}
          scroll={{ x: 1200 }}
          pagination={{
            current: currentPage,
            pageSize: currentPageSize,
            total: totalRecords,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 筆資料`,
            onChange: (page, pageSize) => setParams({ pageNumber: page, pageSize }),
          }}
        />
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
              <Form.Item name="phone" label="聯絡電話">
                <Input placeholder="請輸入聯絡電話" allowClear />
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
          {(isDrawerEditing || isCreateDrawerOpen) ? (
            <Form
              form={crudForm}
              layout="vertical"
              onFinish={handleCrudSubmit}
              onFinishFailed={handleFinishFailed}
            >
              {renderFormFields(isDrawerEditing)}
            </Form>
          ) : (
            <Descriptions column={1} bordered>
              <Descriptions.Item label="員工編號">{viewData?.employeeNo}</Descriptions.Item>
              <Descriptions.Item label="姓名">{viewData?.name}</Descriptions.Item>
              <Descriptions.Item label="狀態">{viewData?.status === 1 ? '在職' : '離職'}</Descriptions.Item>
              <Descriptions.Item label="部門代碼">{departmentOptions?.find((o: any) => o.value === viewData?.departmentCode)?.label || viewData?.departmentCode}</Descriptions.Item>
              <Descriptions.Item label="聯絡電話">{viewData?.phone}</Descriptions.Item>
              <Descriptions.Item label="電子郵件">{viewData?.email}</Descriptions.Item>
              <Descriptions.Item label="到職日期">{viewData?.hireDate ? viewData.hireDate.substring(0,10) : '-'}</Descriptions.Item>
              <Descriptions.Item label="離職日期">{viewData?.resignDate ? viewData.resignDate.substring(0,10) : '-'}</Descriptions.Item>
              <Descriptions.Item label="備註">{viewData?.notes}</Descriptions.Item>
            </Descriptions>
          )}
        </Spin>
      </Drawer>
    </div>
  );
}
