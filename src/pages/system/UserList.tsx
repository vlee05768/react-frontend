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
  Space,
  Typography,
  Tooltip,
  Row,
  Col,
  message,
  Popconfirm,
  Drawer,
  Descriptions,
  Tag,
  Switch
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClearOutlined,
  SaveOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1User, 
  getApiV1UserById,
  postApiV1User,
  putApiV1UserById,
  deleteApiV1UserById
} from '@/api/generated/sdk.gen';
import type { UserDto } from '@/api/generated/types.gen';
import { useUserQueryStore } from '@/stores/systemStore';
import { useAuthStore } from '@/stores/useAuthStore';

const { Title } = Typography;

export default function UserList() {
  const { viewId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const firstInputRef = useRef<InputRef>(null);

  const { params, setParams, resetParams } = useUserQueryStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchForm] = Form.useForm();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(!!viewId);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>(viewId ? 'view' : 'create');
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['userList', params],
    queryFn: () =>
      getApiV1User({
        query: params as any,
      }),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['userDetail', viewId],
    queryFn: () => getApiV1UserById({ path: { id: viewId as any } }),
    enabled: !!viewId,
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  const detail = (detailData?.data as any)?.data || detailData?.data;

  useEffect(() => {
    setIsDrawerOpen(!!viewId);
    if (viewId && drawerMode === 'create') {
      setDrawerMode('view');
    }
  }, [viewId]);

  useEffect(() => {
    if (isDrawerOpen && detail && drawerMode !== 'create') {
      form.setFieldsValue(detail);
    }
  }, [detail, isDrawerOpen, drawerMode, form]);

  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1User({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      closeDrawer();
    },
    onError: () => message.error('新增失敗'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string | number; values: any }) =>
      putApiV1UserById({ path: { id: id as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['userList'] });
      queryClient.invalidateQueries({ queryKey: ['userDetail', viewId] });
      setDrawerMode('view');
    },
    onError: () => message.error('更新失敗'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteApiV1UserById({ path: { id: id as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['userList'] });
    },
    onError: () => message.error('刪除失敗'),
  });

  const handleSearch = (values: any) => {
    setParams({ ...values, pageNumber: 1 });
    setIsSearchModalOpen(false);
  };

  const handleSearchReset = () => {
    searchForm.resetFields();
    resetParams();
    setIsSearchModalOpen(false);
  };

  const openCreate = () => {
    navigate('/system/users/new');
    setDrawerMode('create');
    form.resetFields();
    setIsDrawerOpen(true);
    setTimeout(() => firstInputRef.current?.focus(), 100);
  };

  const openView = (id: string | number) => {
    navigate(`/system/users/${id}`);
    setDrawerMode('view');
  };

  const openEdit = (id: string | number) => {
    navigate(`/system/users/${id}`);
    setDrawerMode('edit');
    setTimeout(() => firstInputRef.current?.focus(), 100);
  };

  const closeDrawer = () => {
    navigate('/system/users');
    setIsDrawerOpen(false);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (drawerMode === 'create') {
        createMutation.mutate(values);
      } else {
        updateMutation.mutate({ id: viewId as any, values });
      }
    } catch (error) {
      setTimeout(() => {
        const firstErrorNode = document.querySelector('.ant-form-item-has-error input') as HTMLElement;
        firstErrorNode?.focus();
      }, 100);
    }
  };

  const columns = [
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'left' as const,
      render: (_: any, record: UserDto) => (
        <Space size="small">
          <Tooltip title="檢視">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openView(record.id as any)}
              className="text-blue-500"
            />
          </Tooltip>
          {hasPermission('System.Users.Update') && (
            <Tooltip title="編輯">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => openEdit(record.id as any)}
                className="text-orange-500"
              />
            </Tooltip>
          )}
          {hasPermission('System.Users.Delete') && (
            <Tooltip title="刪除">
              <Popconfirm
                title="確定要刪除此筆資料？"
                onConfirm={() => deleteMutation.mutate(record.id as any)}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: 'userName', dataIndex: 'userName', key: 'userName' },
    { title: 'name', dataIndex: 'name', key: 'name' },
    { title: 'email', dataIndex: 'email', key: 'email' },
    { title: '狀態', dataIndex: 'isActive', key: 'isActive', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '啟用' : '停用'}</Tag> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#141414] p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <Title level={3} className="!m-0 text-gray-100">用戶管理</Title>
        <Space>
          <Button
            type="default"
            icon={<SearchOutlined />}
            onClick={() => setIsSearchModalOpen(true)}
          >
            查詢
          </Button>
          {hasPermission('System.Users.Create') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增
            </Button>
          )}
        </Space>
      </div>

      <div className="flex-1 overflow-hidden">
        <Table
          columns={columns}
          dataSource={listData}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }}
          pagination={{
            current: params.pageNumber,
            pageSize: params.pageSize,
            total: totalRecords,
            showSizeChanger: true,
            onChange: (page, pageSize) => setParams({ pageNumber: page, pageSize }),
          }}
          className="h-full border border-gray-800 rounded-md"
        />
      </div>

      <Modal
        title="查詢條件"
        open={isSearchModalOpen}
        onCancel={() => setIsSearchModalOpen(false)}
        footer={[
          <Button key="clear" icon={<ClearOutlined />} onClick={handleSearchReset}>
            清除
          </Button>,
          <Button key="search" type="primary" icon={<SearchOutlined />} onClick={() => searchForm.submit()}>
            搜尋
          </Button>,
        ]}
      >
        <Form form={searchForm} layout="vertical" onFinish={handleSearch} initialValues={params}>
          <Form.Item name="name" label="name">
            <Input placeholder="請輸入name" allowClear />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={drawerMode === 'create' ? '新增用戶管理' : drawerMode === 'edit' ? '編輯用戶管理' : '檢視用戶管理'}
        width={720}
        size="large"
        onClose={closeDrawer}
        open={isDrawerOpen}
        extra={
          <Space>
            {drawerMode === 'view' ? (
              hasPermission('System.Users.Update') && (
                <Button type="primary" icon={<EditOutlined />} onClick={() => { setDrawerMode('edit'); setTimeout(() => firstInputRef.current?.focus(), 100); }}>
                  編輯
                </Button>
              )
            ) : (
              <>
                <Button onClick={() => {
                  if (drawerMode === 'create') closeDrawer();
                  else {
                    setDrawerMode('view');
                    form.setFieldsValue(detail);
                  }
                }}>
                  取消
                </Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={createMutation.isPending || updateMutation.isPending}>
                  儲存
                </Button>
              </>
            )}
          </Space>
        }
      >
        <Spin spinning={detailLoading && drawerMode !== 'create'}>
          {drawerMode === 'view' ? (
            <Descriptions bordered column={2} size="small" labelStyle={{ width: '120px', backgroundColor: '#1f1f1f', color: '#e5e7eb' }} contentStyle={{ backgroundColor: '#141414', color: '#d1d5db' }}>
              <Descriptions.Item label="userName">{detail?.userName}</Descriptions.Item>
              <Descriptions.Item label="name">{detail?.name}</Descriptions.Item>
              <Descriptions.Item label="email">{detail?.email}</Descriptions.Item>
              <Descriptions.Item label="isActive">{detail?.isActive ? '是' : '否'}</Descriptions.Item>
              <Descriptions.Item label="employeeCode">{detail?.employeeCode}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="userName" label="userName" rules={[{ required: true, message: '必填欄位' }]}>
                    <Input placeholder="請輸入userName" ref={firstInputRef} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="name" label="name" rules={[{ required: true, message: '必填欄位' }]}>
                    <Input placeholder="請輸入name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label="email" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入email" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="isActive" label="isActive" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="employeeCode" label="employeeCode" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入employeeCode" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          )}
        </Spin>
      </Drawer>
    </div>
  );
}
