import os
import re

TEMPLATE = """// @ts-nocheck
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
  getApiV1{Entity}, 
  getApiV1{Entity}By{IdKeyC},
  postApiV1{Entity},
  putApiV1{Entity}By{IdKeyC},
  deleteApiV1{Entity}By{IdKeyC}
} from '@/api/generated/sdk.gen';
import { use{Entity}QueryStore } from '@/stores/{StoreFile}';
import { useAuthStore } from '@/stores/useAuthStore';

const { Title, Text } = Typography;

export default function {Entity}List() {
  const { params, setParams, resetParams } = use{Entity}QueryStore();
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
    queryKey: ['{entity}Detail', viewId],
    queryFn: () => getApiV1{Entity}By{IdKeyC}({ path: { {idKey}: viewId as any } }),
    enabled: !!viewId,
  });
  const viewData = viewRes?.data?.data || viewRes?.data;

  // API 查詢
  const { data, isFetching } = useQuery({
    queryKey: ['{entity}List', params],
    queryFn: () =>
      getApiV1{Entity}({
        query: params as any,
      }),
  });

  const listData = (data?.data as any)?.data?.data || (data?.data as any)?.data || [];
  const totalRecords = (data?.data as any)?.data?.totalRecords || (data?.data as any)?.totalRecords || 0;
  
  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: any) => postApiV1{Entity}({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      setIsCreateDrawerOpen(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['{entity}List'] });
    },
    onError: (error: any) => {
      message.error(`新增失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ {idKey}, values }: { {idKey}: string | number, values: any }) => 
      putApiV1{Entity}By{IdKeyC}({ path: { {idKey}: {idKey} as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      setIsDrawerEditing(false);
      crudForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['{entity}List'] });
      queryClient.invalidateQueries({ queryKey: ['{entity}Detail'] });
    },
    onError: (error: any) => {
      message.error(`更新失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({idKey}: string | number) => deleteApiV1{Entity}By{IdKeyC}({ path: { {idKey}: {idKey} as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['{entity}List'] });
      queryClient.invalidateQueries({ queryKey: ['{entity}Detail'] });
    },
    onError: (error: any) => {
      message.error(`刪除失敗: ${error?.response?.data?.message || '未知錯誤'}`);
    }
  });

  const openViewDrawer = (record: any) => {
    navigate(`{RoutePath}/${record.{idKey}}`);
  };

  const closeViewDrawer = () => {
    setIsCreateDrawerOpen(false);
    setIsDrawerEditing(false);
    if (viewId) {
      navigate('{RoutePath}');
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
      updateMutation.mutate({ {idKey}: viewId as any, values });
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
          {hasPermission('{PermKey}.View') && (
            <Tooltip title="檢視">
              <Button 
                type="text" 
                icon={<EyeOutlined />} 
                style={{ color: '#1890ff' }} 
                onClick={() => openViewDrawer(record)}
              />
            </Tooltip>
          )}
          {hasPermission('{PermKey}.Delete') && (
            <Tooltip title="刪除">
              <Popconfirm
                title="確定要刪除此筆資料嗎？"
                onConfirm={() => deleteMutation.mutate(record.{idKey})}
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
{ColumnsStr}
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
{EditFormStr}
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
              <Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '1px' }}>{TitleStr}</Title>
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
            {hasPermission('{PermKey}.Create') && (
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
          rowKey="{idKey}"
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
{SearchFormStr}
          </Row>
        </Form>
      </Modal>

      <Drawer
        title={
          <div style={{ fontSize: '18px', fontWeight: 600 }}>
            {isCreateDrawerOpen ? '新增{TitleStr}' : (isDrawerEditing ? '編輯{TitleStr}' : '檢視{TitleStr}')}
          </div>
        }
        placement="right"
        size="large"
        onClose={closeViewDrawer}
        open={!!viewId || isCreateDrawerOpen}
        extra={
          (!isDrawerEditing && !isCreateDrawerOpen && hasPermission('{PermKey}.Update')) && (
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
{ViewDescriptionsStr}
            </Descriptions>
          )}
        </Spin>
      </Drawer>
    </div>
  );
}
"""

entities = [
    {
        "Entity": "User", "entity": "user", "TitleStr": "用戶管理", "PermKey": "System.Users",
        "IdKeyC": "Id", "idKey": "id", "StoreFile": "systemStore", "RoutePath": "/system/users",
        "cols": ["userName", "name", "email", "isActive"],
        "search": ["name"],
        "fields": ["userName", "name", "email", "isActive", "employeeCode"]
    },
    {
        "Entity": "Role", "entity": "role", "TitleStr": "角色管理", "PermKey": "System.Roles",
        "IdKeyC": "Id", "idKey": "id", "StoreFile": "systemStore", "RoutePath": "/system/roles",
        "cols": ["name", "caption", "description"],
        "search": [],
        "fields": ["name", "caption", "description"]
    },
    {
        "Entity": "Storage", "entity": "storage", "TitleStr": "儲位管理", "PermKey": "Warehouse.Storages",
        "IdKeyC": "Code", "idKey": "code", "StoreFile": "warehouseStore", "RoutePath": "/warehouse/storages",
        "cols": ["code", "name", "type", "location", "isActive"],
        "search": ["CodeOrName", "Type"],
        "fields": ["code", "name", "type", "location", "area", "isCalculateInventory", "isActive", "notes"]
    },
    {
        "Entity": "Mold", "entity": "mold", "TitleStr": "模具管理", "PermKey": "ProductionQuality.Molds",
        "IdKeyC": "Code", "idKey": "code", "StoreFile": "productionStore", "RoutePath": "/production-quality/molds",
        "cols": ["code", "name", "type", "supplierCode", "shape"],
        "search": ["CodeOrName", "Type", "SupplierCode"],
        "fields": ["code", "name", "type", "supplierCode", "shape", "dimensionLMm", "dimensionWMm", "dimensionHMm", "isShareable", "description", "notes"]
    },
    {
        "Entity": "Machine", "entity": "machine", "TitleStr": "機台管理", "PermKey": "ProductionQuality.Machines",
        "IdKeyC": "Code", "idKey": "code", "StoreFile": "productionStore", "RoutePath": "/production-quality/machines",
        "cols": ["code", "name", "type", "capacity"],
        "search": ["CodeOrName"],
        "fields": ["code", "name", "type", "capacity"]
    },
    {
        "Entity": "Employee", "entity": "employee", "TitleStr": "員工基本檔", "PermKey": "BasicData.Employees",
        "IdKeyC": "Id", "idKey": "id", "StoreFile": "employeeStore", "RoutePath": "/employee",
        "cols": ["employeeCode", "name", "department", "isActive"],
        "search": ["employeeNo", "name"],
        "fields": ["employeeCode", "name", "department", "mobile", "email", "isActive"]
    }
]

def make_col(c):
    if c == 'isActive':
        return f"    {{ title: '狀態', dataIndex: '{c}', key: '{c}', render: (v: boolean) => <Tag color={{v ? 'green' : 'red'}}>{{v ? '啟用' : '停用'}}</Tag> }},"
    return f"    {{ title: '{c}', dataIndex: '{c}', key: '{c}' }},"

def make_search(c):
    return f"""          <Form.Item name="{c}" label="{c}">
            <Input placeholder="請輸入{c}" allowClear />
          </Form.Item>"""

def make_desc(c):
    if c == 'isActive' or c == 'isCalculateInventory' or c == 'isShareable':
        return f"              <Descriptions.Item label=\"{c}\">{{viewData?.{c} ? '是' : '否'}}</Descriptions.Item>"
    return f"              <Descriptions.Item label=\"{c}\">{{viewData?.{c}}}</Descriptions.Item>"

def make_form(c):
    if c == 'isActive' or c == 'isCalculateInventory' or c == 'isShareable':
        return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{c}" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>"""
    return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{c}" rules={{[{{ required: {str(c in ['code', 'name', 'userName']).lower()}, message: '必填欄位' }}]}}>
                    <Input placeholder="請輸入{c}" />
                  </Form.Item>
                </Col>"""

def build(e):
    cols_str = "\n".join(make_col(c) for c in e["cols"])
    search_str = "\n".join(make_search(c) for c in e["search"])
    desc_str = "\n".join(make_desc(c) for c in e["fields"])
    form_str = "\n".join(make_form(c) for c in e["fields"])
    
    code = TEMPLATE.replace("{Entity}", e["Entity"])
    code = code.replace("{entity}", e["entity"])
    code = code.replace("{TitleStr}", e["TitleStr"])
    code = code.replace("{PermKey}", e["PermKey"])
    code = code.replace("{IdKeyC}", e["IdKeyC"])
    code = code.replace("{idKey}", e["idKey"])
    code = code.replace("{StoreFile}", e["StoreFile"])
    code = code.replace("{RoutePath}", e["RoutePath"])
    code = code.replace("{ColumnsStr}", cols_str)
    code = code.replace("{SearchFormStr}", search_str)
    code = code.replace("{ViewDescriptionsStr}", desc_str)
    code = code.replace("{EditFormStr}", form_str)
    
    if e["Entity"] == "User":
        code = code.replace('<Input placeholder="請輸入userName" />', '<Input placeholder="請輸入userName" ref={firstInputRef} />')
    elif e["Entity"] == "Role":
        code = code.replace('<Input placeholder="請輸入name" />', '<Input placeholder="請輸入name" ref={firstInputRef} />')
    elif e["Entity"] == "Employee":
        code = code.replace('<Input placeholder="請輸入employeeCode" />', '<Input placeholder="請輸入employeeCode" ref={firstInputRef} />')
    else:
        code = code.replace('<Input placeholder="請輸入code" />', '<Input placeholder="請輸入code" ref={firstInputRef} />')
        
    return code

os.makedirs('/home/hermes/git_projects/erp-frontend-react/src/pages/system', exist_ok=True)
os.makedirs('/home/hermes/git_projects/erp-frontend-react/src/pages/warehouse', exist_ok=True)
os.makedirs('/home/hermes/git_projects/erp-frontend-react/src/pages/production', exist_ok=True)
os.makedirs('/home/hermes/git_projects/erp-frontend-react/src/pages/employee', exist_ok=True)

for e in entities:
    if e['Entity'] == 'Employee':
        path = '/home/hermes/git_projects/erp-frontend-react/src/pages/basic/Employee.tsx'
    else:
        path = f"/home/hermes/git_projects/erp-frontend-react/src/pages/{e['StoreFile'].replace('Store','')}/{e['Entity']}List.tsx"
    with open(path, 'w') as f:
        f.write(build(e))
    print(f"Generated {path}")

