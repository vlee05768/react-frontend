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
  Typography,
  Tag,
  Tooltip,
  Row,
  Col,
  message,
  Popconfirm,
  DatePicker,
  Drawer,
  Descriptions
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  ClearOutlined,
  SaveOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1Employee, 
  getApiV1EmployeeById,
  getApiV1GeneralTypesGetTypes,
  postApiV1Employee,
  putApiV1EmployeeById,
  deleteApiV1EmployeeById
} from '../../api/generated/sdk.gen';
import { useEmployeeQueryStore } from '../../stores/employeeStore';
import { useAuthStore } from '../../stores/useAuthStore';
import dayjs from 'dayjs';


const { Title, Text } = Typography;

export default function Employee() {
  const { params, setParams, resetParams } = useEmployeeQueryStore();
  const { hasPermission } = useAuthStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  const [searchForm] = Form.useForm();
  const [crudForm] = Form.useForm();
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  
  const employeeNoRef = useRef<InputRef>(null);
  const nameRef = useRef<InputRef>(null);

  useEffect(() => {
    if (isCreateDrawerOpen) {
      setTimeout(() => employeeNoRef.current?.focus(), 100);
    } else if (isDrawerEditing) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [isCreateDrawerOpen, isDrawerEditing]);
  
  const queryClient = useQueryClient();
  const { viewId } = useParams<{ viewId: string }>();
  const navigate = useNavigate();


  // 單筆資料查詢 (Drawer)
  const { data: viewEmployeeRes, isFetching: isFetchingView } = useQuery({
    queryKey: ['employee', viewId],
    queryFn: () => getApiV1EmployeeById({ path: { id: Number(viewId) } }),
    enabled: !!viewId,
  });
  const viewEmployeeData = viewEmployeeRes?.data?.data;

  // API 查詢
  const { data, isFetching } = useQuery({
    queryKey: ['employees', params],
    queryFn: () =>
      getApiV1Employee({
        query: {
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
          EmployeeNo: params.employeeNo || undefined,
          Name: params.name || undefined,
          Status: params.status || undefined,
          DepartmentCode: params.departmentCode || undefined,
        },
      }),
  });

  // 部門清單查詢
  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () =>
      getApiV1GeneralTypesGetTypes({
        query: {
          types: ['Department'],
        },
      }),
  });

  const employeeData = data?.data?.data?.data || [];
  const totalRecords = data?.data?.data?.totalRecords || 0;
  
  const departmentOptions = (deptData?.data?.data as any)?.['Department']?.map((d: any) => ({
    label: d.desc || d.code,
    value: d.code,
  })) || [];

  const getSearchConditionsTags = () => {
    const conditions = [];
    if (params.employeeNo) conditions.push(`員工編號: ${params.employeeNo}`);
    if (params.name) conditions.push(`姓名: ${params.name}`);
    if (params.departmentCode) {
      const dept = departmentOptions.find((d: any) => d.value === params.departmentCode);
      conditions.push(`部門: ${dept ? dept.label : params.departmentCode}`);
    }
    if (params.status) {
      conditions.push(`狀態: ${params.status === 1 ? '在職' : '離職'}`);
    }

    if (conditions.length === 0) {
      return <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>全部資料</Tag>;
    }
    return conditions.map((cond, index) => (
      <Tag color="cyan" key={index} style={{ fontSize: '14px', padding: '4px 8px' }}>{cond}</Tag>
    ));
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1Employee({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: any) => {
      message.error(`新增失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number, values: any }) => 
      putApiV1EmployeeById({ path: { id }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
    },
    onError: (error: any) => {
      message.error(`更新失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteApiV1EmployeeById({ path: { id } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
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
    crudForm.setFieldsValue({ status: 1 }); // 預設在職
    setIsCreateDrawerOpen(true);
  };

  const startEditMode = () => {
    if (viewEmployeeData) {
      crudForm.setFieldsValue({
        ...viewEmployeeData,
        hireDate: viewEmployeeData.hireDate ? dayjs(viewEmployeeData.hireDate) : null,
        resignDate: viewEmployeeData.resignDate ? dayjs(viewEmployeeData.resignDate) : null,
      });
      setIsDrawerEditing(true);
    }
  };

  const handleCrudSubmit = (values: any) => {
    const payload = {
      ...values,
      hireDate: values.hireDate ? values.hireDate.format('YYYY-MM-DD') : null,
      resignDate: values.resignDate ? values.resignDate.format('YYYY-MM-DD') : null,
    };

    if (isCreateDrawerOpen) {
      createMutation.mutate(payload);
    } else if (viewId) {
      updateMutation.mutate({ id: Number(viewId), values: payload });
    }
  };

  const handleFinishFailed = (errorInfo: any) => {
    if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
      const firstErrorField = errorInfo.errorFields[0].name;
      crudForm.scrollToField(firstErrorField, { behavior: 'smooth' });
      // 確保滾動後 focus
      setTimeout(() => {
        crudForm.getFieldInstance(firstErrorField)?.focus();
      }, 100);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // 表格欄位定義
  const columns = [
    {
      title: '操作',
      key: 'actions',
      fixed: 'left' as const,
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="檢視">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              style={{ color: '#1890ff' }} 
              onClick={() => openViewDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="刪除">
            <Popconfirm
              title="確定要刪除此員工嗎？"
              onConfirm={() => handleDelete(record.id)}
              okText="確定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '員工編號',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 150,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '部門',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 180,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: number) => {
        return status === 1 ? (
          <Tag color="success">在職</Tag>
        ) : status === 2 ? (
          <Tag color="error">離職</Tag>
        ) : (
          <Tag color="default">未知</Tag>
        );
      },
    },
    {
      title: '聯絡電話',
      dataIndex: 'phone',
      key: 'phone',
      width: 180,
    },
    {
      title: '電子郵件',
      dataIndex: 'email',
      key: 'email',
      width: 250,
    },
    {
      title: '到職日',
      dataIndex: 'hireDate',
      key: 'hireDate',
      width: 150,
      render: (val: string) => val?.split('T')[0] || '-',
    },
  ];

  const handleSearch = (values: any) => {
    setParams({
      ...values,
      pageNumber: 1,
    });
    setIsSearchModalOpen(false);
  };

  const handleSearchReset = () => {
    searchForm.resetFields();
    resetParams();
    setIsSearchModalOpen(false);
  };

  const openSearchModal = () => {
    searchForm.setFieldsValue({
      employeeNo: params.employeeNo,
      name: params.name,
      status: params.status,
      departmentCode: params.departmentCode,
    });
    setIsSearchModalOpen(true);
  };

  const renderFormFields = (isEdit: boolean) => (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item 
          name="employeeNo" 
          label="員工編號" 
          rules={[{ required: true, message: '請輸入員工編號' }]}
          normalize={(value) => value?.toUpperCase()}
        >
          <Input ref={employeeNoRef} placeholder="請輸入員工編號" disabled={isEdit} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item 
          name="name" 
          label="姓名"
          rules={[{ required: true, message: '請輸入姓名' }]}
        >
          <Input ref={nameRef} placeholder="請輸入姓名" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item 
          name="departmentCode" 
          label="部門"
          rules={[{ required: true, message: '請選擇部門' }]}
        >
          <Select 
            placeholder="請選擇部門" 
            options={departmentOptions} 
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item 
          name="status" 
          label="在職狀態"
          rules={[{ required: true, message: '請選擇狀態' }]}
        >
          <Select placeholder="請選擇狀態">
            <Select.Option value={1}>在職</Select.Option>
            <Select.Option value={2}>離職</Select.Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="phone" label="聯絡電話">
          <Input placeholder="請輸入電話" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item 
          name="email" 
          label="電子郵件"
          rules={[{ type: 'email', message: '請輸入有效的電子郵件' }]}
        >
          <Input placeholder="請輸入電子郵件" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="hireDate" label="到職日">
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="resignDate" label="離職日">
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="notes" label="備註">
          <Input.TextArea rows={3} placeholder="請輸入備註" />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #1677ff 0%, #1677ff40 100%)',
                borderRadius: '10px',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(22, 119, 255, 0.4)'
              }}>
                <UserOutlined style={{ fontSize: 22 }} />
              </div>
              <Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '1px' }}>員工基本檔</Title>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              <Text type="secondary" style={{ fontSize: '14px' }}>目前查詢條件：</Text>
              {getSearchConditionsTags()}
            </div>
          </div>
        }
        extra={
          <Space>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={openSearchModal}
            >
              查詢
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
              新增員工
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={employeeData}
          rowKey="id"
          loading={isFetching}
          scroll={{ x: 1200 }}
          pagination={{
            current: params.pageNumber,
            pageSize: params.pageSize,
            total: totalRecords,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 筆資料`,
            onChange: (page, pageSize) => setParams({ pageNumber: page, pageSize }),
          }}
        />
      </Card>

      {/* 查詢彈跳視窗 */}
      <Modal
        title={
          <div style={{ fontSize: '18px', fontWeight: 600, paddingBottom: '8px', borderBottom: '1px solid #f0f0f0', marginBottom: '16px' }}>
            查詢條件
          </div>
        }
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Button icon={<ClearOutlined />} onClick={handleSearchReset}>
                重置
              </Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => searchForm.submit()}>
                執行查詢
              </Button>
            </Space>
          </div>
        }
        width="min(800px, 50vw)"
        style={{ top: 100 }}
        styles={{
          body: {
            overflow: 'hidden',
            paddingTop: '24px'
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
              <Form.Item name="departmentCode" label="部門">
                <Select 
                  placeholder="請選擇部門" 
                  allowClear 
                  options={departmentOptions} 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="在職狀態">
                <Select placeholder="請選擇狀態" allowClear>
                  <Select.Option value={1}>在職</Select.Option>
                  <Select.Option value={2}>離職</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 新增/檢視/編輯 Drawer */}
      <Drawer
        title={
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {isCreateDrawerOpen ? '新增員工' : (isDrawerEditing ? '編輯員工' : '檢視員工')}
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
              <Descriptions.Item label="員工編號">{viewEmployeeData?.employeeNo}</Descriptions.Item>
              <Descriptions.Item label="姓名">{viewEmployeeData?.name}</Descriptions.Item>
              <Descriptions.Item label="部門">{viewEmployeeData?.departmentName || viewEmployeeData?.departmentCode}</Descriptions.Item>
              <Descriptions.Item label="狀態">
                {viewEmployeeData?.status === 1 ? <Tag color="success">在職</Tag> : 
                 viewEmployeeData?.status === 2 ? <Tag color="error">離職</Tag> : 
                 <Tag color="default">未知</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="聯絡電話">{viewEmployeeData?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="電子郵件">{viewEmployeeData?.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="到職日">{viewEmployeeData?.hireDate?.split('T')[0] || '-'}</Descriptions.Item>
              <Descriptions.Item label="離職日">{viewEmployeeData?.resignDate?.split('T')[0] || '-'}</Descriptions.Item>
              <Descriptions.Item label="備註">{viewEmployeeData?.notes || '-'}</Descriptions.Item>
            </Descriptions>
          )}
        </Spin>
      </Drawer>

    </div>
  );
}
