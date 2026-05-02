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
  Typography,
  Tag,
  Tooltip,
  Row,
  Col,
  message,
  Popconfirm,
  Drawer,
  Descriptions,
  Switch
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
  getApiV1Mold, 
  getApiV1MoldByCode,
  postApiV1Mold,
  putApiV1MoldByCode,
  deleteApiV1MoldByCode
} from '@/api/generated/sdk.gen';
import { useMoldQueryStore } from '@/stores/productionStore';
import { useAuthStore } from '@/stores/useAuthStore';

const { Title, Text } = Typography;

export default function MoldList() {
  const { params, setParams, resetParams } = useMoldQueryStore();
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
    queryKey: ['moldDetail', viewId],
    queryFn: () => getApiV1MoldByCode({ path: { code: viewId as any } }),
    enabled: !!viewId,
  });
  const viewData = viewRes?.data?.data || viewRes?.data;

  // API 查詢
  const { data, isFetching } = useQuery({
    queryKey: ['moldList', params],
    queryFn: () =>
      getApiV1Mold({
        query: params as any,
      }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  
  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1Mold({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['moldList'] });
    },
    onError: (error: any) => {
      message.error(`新增失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, values }: { code: string | number, values: any }) => 
      putApiV1MoldByCode({ path: { code: code as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['moldList'] });
      queryClient.invalidateQueries({ queryKey: ['moldDetail'] });
    },
    onError: (error: any) => {
      message.error(`更新失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string | number) => deleteApiV1MoldByCode({ path: { code: code as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['moldList'] });
      queryClient.invalidateQueries({ queryKey: ['moldDetail'] });
    },
    onError: (error: any) => {
      message.error(`刪除失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const openViewDrawer = (record: any) => {
    navigate(`/production-quality/molds/${record.code}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('/production-quality/molds');
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
      updateMutation.mutate({ code: viewId as any, values });
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
          {hasPermission('ProductionQuality.Molds.View') && (
            <Tooltip title="檢視">
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                style={{ color: '#1890ff' }} 
                onClick={() => openViewDrawer(record)}
              />
            </Tooltip>
          )}
          {hasPermission('ProductionQuality.Molds.Delete') && (
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
    },
    { title: 'code', dataIndex: 'code', key: 'code' },
    { title: 'name', dataIndex: 'name', key: 'name' },
    { title: 'type', dataIndex: 'type', key: 'type' },
    { title: 'supplierCode', dataIndex: 'supplierCode', key: 'supplierCode' },
    { title: 'shape', dataIndex: 'shape', key: 'shape' },
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

  const openSearchModal = () => {
    searchForm.setFieldsValue(params);
    setIsSearchModalOpen(true);
  };

  const renderFormFields = (isEdit: boolean) => (
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
                <AppstoreOutlined style={{ fontSize: 22 }} />
              </div>
              <Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '1px' }}>模具管理</Title>
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
            {hasPermission('ProductionQuality.Molds.Create') && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>
                新增
              </Button>
            )}
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={listData}
          rowKey="code"
          loading={isFetching}
          scroll={{ x: 'max-content' }}
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
          <Form.Item name="CodeOrName" label="CodeOrName">
            <Input placeholder="請輸入CodeOrName" allowClear />
          </Form.Item>
          <Form.Item name="Type" label="Type">
            <Input placeholder="請輸入Type" allowClear />
          </Form.Item>
          <Form.Item name="SupplierCode" label="SupplierCode">
            <Input placeholder="請輸入SupplierCode" allowClear />
          </Form.Item>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title={
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {isCreateDrawerOpen ? '新增模具管理' : (isDrawerEditing ? '編輯模具管理' : '檢視模具管理')}
          </div>
        }
        placement="right"
        size="large"
        onClose={closeViewDrawer}
        open={!!viewId || isCreateDrawerOpen}
        extra={
          (!isDrawerEditing && !isCreateDrawerOpen && hasPermission('ProductionQuality.Molds.Update')) && (
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
          )}
        </Spin>
      </Drawer>
    </div>
  );
}
