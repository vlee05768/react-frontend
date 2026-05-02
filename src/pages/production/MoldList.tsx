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
  getApiV1Mold, 
  getApiV1MoldByCode,
  postApiV1Mold,
  putApiV1MoldByCode,
  deleteApiV1MoldByCode
} from '@/api/generated/sdk.gen';
import type { MoldDto } from '@/api/generated/types.gen';
import { useMoldQueryStore } from '@/stores/productionStore';
import { useAuthStore } from '@/stores/useAuthStore';

const { Title } = Typography;

export default function MoldList() {
  const { viewId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const firstInputRef = useRef<InputRef>(null);

  const { params, setParams, resetParams } = useMoldQueryStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchForm] = Form.useForm();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(!!viewId);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>(viewId ? 'view' : 'create');
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['moldList', params],
    queryFn: () =>
      getApiV1Mold({
        query: params as any,
      }),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['moldDetail', viewId],
    queryFn: () => getApiV1MoldByCode({ path: { code: viewId as any } }),
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
    mutationFn: (values: any) => postApiV1Mold({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['moldList'] });
      closeDrawer();
    },
    onError: () => message.error('新增失敗'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, values }: { code: string | number; values: any }) =>
      putApiV1MoldByCode({ path: { code: code as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['moldList'] });
      queryClient.invalidateQueries({ queryKey: ['moldDetail', viewId] });
      setDrawerMode('view');
    },
    onError: () => message.error('更新失敗'),
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string | number) => deleteApiV1MoldByCode({ path: { code: code as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['moldList'] });
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
    navigate('/production-quality/molds/new');
    setDrawerMode('create');
    form.resetFields();
    setIsDrawerOpen(true);
    setTimeout(() => firstInputRef.current?.focus(), 100);
  };

  const openView = (code: string | number) => {
    navigate(`/production-quality/molds/${code}`);
    setDrawerMode('view');
  };

  const openEdit = (code: string | number) => {
    navigate(`/production-quality/molds/${code}`);
    setDrawerMode('edit');
    setTimeout(() => firstInputRef.current?.focus(), 100);
  };

  const closeDrawer = () => {
    navigate('/production-quality/molds');
    setIsDrawerOpen(false);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (drawerMode === 'create') {
        createMutation.mutate(values);
      } else {
        updateMutation.mutate({ code: viewId as any, values });
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
      render: (_: any, record: MoldDto) => (
        <Space size="small">
          <Tooltip title="檢視">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openView(record.code as any)}
              className="text-blue-500"
            />
          </Tooltip>
          {hasPermission('ProductionQuality.Molds.Update') && (
            <Tooltip title="編輯">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => openEdit(record.code as any)}
                className="text-orange-500"
              />
            </Tooltip>
          )}
          {hasPermission('ProductionQuality.Molds.Delete') && (
            <Tooltip title="刪除">
              <Popconfirm
                title="確定要刪除此筆資料？"
                onConfirm={() => deleteMutation.mutate(record.code as any)}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: 'code', dataIndex: 'code', key: 'code' },
    { title: 'name', dataIndex: 'name', key: 'name' },
    { title: 'type', dataIndex: 'type', key: 'type' },
    { title: 'supplierCode', dataIndex: 'supplierCode', key: 'supplierCode' },
    { title: 'shape', dataIndex: 'shape', key: 'shape' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#141414] p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <Title level={3} className="!m-0 text-gray-100">模具管理</Title>
        <Space>
          <Button
            type="default"
            icon={<SearchOutlined />}
            onClick={() => setIsSearchModalOpen(true)}
          >
            查詢
          </Button>
          {hasPermission('ProductionQuality.Molds.Create') && (
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
          rowKey="code"
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
          <Form.Item name="CodeOrName" label="CodeOrName">
            <Input placeholder="請輸入CodeOrName" allowClear />
          </Form.Item>
          <Form.Item name="Type" label="Type">
            <Input placeholder="請輸入Type" allowClear />
          </Form.Item>
          <Form.Item name="SupplierCode" label="SupplierCode">
            <Input placeholder="請輸入SupplierCode" allowClear />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={drawerMode === 'create' ? '新增模具管理' : drawerMode === 'edit' ? '編輯模具管理' : '檢視模具管理'}
        width={720}
        size="large"
        onClose={closeDrawer}
        open={isDrawerOpen}
        extra={
          <Space>
            {drawerMode === 'view' ? (
              hasPermission('ProductionQuality.Molds.Update') && (
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
              <Descriptions.Item label="code">{detail?.code}</Descriptions.Item>
              <Descriptions.Item label="name">{detail?.name}</Descriptions.Item>
              <Descriptions.Item label="type">{detail?.type}</Descriptions.Item>
              <Descriptions.Item label="supplierCode">{detail?.supplierCode}</Descriptions.Item>
              <Descriptions.Item label="shape">{detail?.shape}</Descriptions.Item>
              <Descriptions.Item label="dimensionLMm">{detail?.dimensionLMm}</Descriptions.Item>
              <Descriptions.Item label="dimensionWMm">{detail?.dimensionWMm}</Descriptions.Item>
              <Descriptions.Item label="dimensionHMm">{detail?.dimensionHMm}</Descriptions.Item>
              <Descriptions.Item label="isShareable">{detail?.isShareable ? '是' : '否'}</Descriptions.Item>
              <Descriptions.Item label="description">{detail?.description}</Descriptions.Item>
              <Descriptions.Item label="notes">{detail?.notes}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="code" label="code" rules={[{ required: true, message: '必填欄位' }]}>
                    <Input placeholder="請輸入code" ref={firstInputRef} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="name" label="name" rules={[{ required: true, message: '必填欄位' }]}>
                    <Input placeholder="請輸入name" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="type" label="type" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入type" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="supplierCode" label="supplierCode" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入supplierCode" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="shape" label="shape" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入shape" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="dimensionLMm" label="dimensionLMm" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入dimensionLMm" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="dimensionWMm" label="dimensionWMm" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入dimensionWMm" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="dimensionHMm" label="dimensionHMm" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入dimensionHMm" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="isShareable" label="isShareable" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="description" label="description" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入description" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="notes" label="notes" rules={[{ required: false, message: '必填欄位' }]}>
                    <Input placeholder="請輸入notes" />
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
