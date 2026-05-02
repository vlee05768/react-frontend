import os
import re

I18N_MAP = {
    'userName': '使用者名稱', 'name': '姓名', 'email': '電子郵件', 'isActive': '狀態',
    'employeeCode': '員工編號', 'employeeNo': '員工編號', 'caption': '角色標題',
    'description': '描述', 'code': '編號', 'type': '類型', 'location': '儲位位置',
    'area': '區域', 'isCalculateInventory': '計算庫存', 'notes': '備註',
    'supplierCode': '供應商編號', 'shape': '形狀', 'dimensionLMm': '長度 (mm)',
    'dimensionWMm': '寬度 (mm)', 'dimensionHMm': '高度 (mm)', 'isShareable': '可共用',
    'capacity': '產能', 'department': '部門', 'mobile': '手機',
    'CodeOrName': '編號或名稱', 'Type': '類型', 'SupplierCode': '供應商編號',
    'departmentName': '部門名稱', 'phone': '聯絡電話', 'hireDate': '到職日期', 
    'resignDate': '離職日期', 'status': '狀態', 'departmentCode': '部門代碼'
}

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
  getApiV1{Entity}, 
  getApiV1{Entity}By{IdKeyC},
  postApiV1{Entity},
  putApiV1{Entity}By{IdKeyC},
  deleteApiV1{Entity}By{IdKeyC}
} from '@/api/generated/sdk.gen';
import { use{Entity}QueryStore } from '@/stores/{StoreFile}';
import { useAuthStore } from '@/stores/useAuthStore';

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
  const currentPage = (data?.data as any)?.data?.pageNumber || params.pageNumber;
  const currentPageSize = (data?.data as any)?.data?.pageSize || params.pageSize;
  
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '4px',
              height: '24px',
              backgroundColor: '#1677ff',
              borderRadius: '2px'
            }} />
            <div style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--ant-color-text, inherit)', lineHeight: '24px' }}>
              {TitleStr}
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
            {hasPermission('{PermKey}.Create') && (
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
        <Table
          columns={columns}
          dataSource={listData}
          rowKey="{idKey}"
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
        width={600}
        style={{ top: 50 }}
        styles={{
          body: {
            height: '400px',
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
        "cols": ["employeeNo", "name", "departmentName", "phone", "hireDate", "status"],
        "search": ["employeeNo", "name", "phone", "status", "departmentCode"],
        "fields": ["employeeNo", "name", "status", "departmentCode", "phone", "email", "hireDate", "resignDate", "notes"]
    }
]

def t(c):
    return I18N_MAP.get(c, c)

def make_col(c):
    if c == 'isActive':
        return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}', render: (v: boolean) => <Tag color={{v ? 'green' : 'red'}}>{{v ? '啟用' : '停用'}}</Tag> }},"
    if c == 'status':
        return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}', render: (v: number) => <Tag color={{v === 1 ? 'green' : 'red'}}>{{v === 1 ? '在職' : '離職'}}</Tag> }},"
    if 'Date' in c:
        return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}', render: (v: string) => v ? v.substring(0, 10) : '-' }},"
    return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}' }},"

def make_search(c):
    if c == 'status':
        return f"""            <Col span={{24}}>
              <Form.Item name="{c}" label="{t(c)}">
                <Select placeholder="請選擇{t(c)}" allowClear>
                  <Select.Option value={{1}}>在職</Select.Option>
                  <Select.Option value={{2}}>離職</Select.Option>
                </Select>
              </Form.Item>
            </Col>"""
    return f"""            <Col span={{24}}>
              <Form.Item name="{c}" label="{t(c)}">
                <Input placeholder="請輸入{t(c)}" allowClear />
              </Form.Item>
            </Col>"""

def make_desc(c):
    if c == 'isActive' or c == 'isCalculateInventory' or c == 'isShareable':
        return f"              <Descriptions.Item label=\"{t(c)}\">{{viewData?.{c} ? '是' : '否'}}</Descriptions.Item>"
    if c == 'status':
        return f"              <Descriptions.Item label=\"{t(c)}\">{{viewData?.{c} === 1 ? '在職' : '離職'}}</Descriptions.Item>"
    if 'Date' in c:
        return f"              <Descriptions.Item label=\"{t(c)}\">{{viewData?.{c} ? viewData.{c}.substring(0,10) : '-'}}</Descriptions.Item>"
    return f"              <Descriptions.Item label=\"{t(c)}\">{{viewData?.{c}}}</Descriptions.Item>"

def make_form(c):
    if c == 'isActive' or c == 'isCalculateInventory' or c == 'isShareable':
        return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>"""
    if c == 'status':
        return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}" rules={{[{{ required: true, message: '必填欄位' }}]}}>
                    <Select placeholder="請選擇{t(c)}">
                      <Select.Option value={{1}}>在職</Select.Option>
                      <Select.Option value={{2}}>離職</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>"""
    if 'Date' in c:
        return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}">
                    <Input type="date" />
                  </Form.Item>
                </Col>"""
    if c == 'notes' or c == 'description':
        return f"""                <Col span={{24}}>
                  <Form.Item name="{c}" label="{t(c)}">
                    <Input.TextArea placeholder="請輸入{t(c)}" rows={{3}} />
                  </Form.Item>
                </Col>"""
    return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}" rules={{[{{ required: {str(c in ['code', 'name', 'userName', 'employeeNo', 'departmentCode']).lower()}, message: '必填欄位' }}]}}>
                    <Input placeholder="請輸入{t(c)}" />
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
    
    # inject ref to first input
    if e["Entity"] == "User":
        code = code.replace(f'<Input placeholder="請輸入{t("userName")}" />', f'<Input placeholder="請輸入{t("userName")}" ref={{firstInputRef}} />')
    elif e["Entity"] == "Role":
        code = code.replace(f'<Input placeholder="請輸入{t("name")}" />', f'<Input placeholder="請輸入{t("name")}" ref={{firstInputRef}} />')
    elif e["Entity"] == "Employee":
        code = code.replace(f'<Input placeholder="請輸入{t("employeeNo")}" />', f'<Input placeholder="請輸入{t("employeeNo")}" ref={{firstInputRef}} />')
    else:
        code = code.replace(f'<Input placeholder="請輸入{t("code")}" />', f'<Input placeholder="請輸入{t("code")}" ref={{firstInputRef}} />')
        
    return code

os.makedirs('/home/hermes/git_projects/erp-frontend-react/src/pages/system', exist_ok=True)
os.makedirs('/home/hermes/git_projects/erp-frontend-react/src/pages/warehouse', exist_ok=True)
os.makedirs('/home/hermes/git_projects/erp-frontend-react/src/pages/production', exist_ok=True)
os.makedirs('/home/hermes/git_projects/erp-frontend-react/src/pages/basic', exist_ok=True)

for e in entities:
    if e['Entity'] == 'Employee':
        path = '/home/hermes/git_projects/erp-frontend-react/src/pages/basic/Employee.tsx'
    else:
        path = f"/home/hermes/git_projects/erp-frontend-react/src/pages/{e['StoreFile'].replace('Store','')}/{e['Entity']}List.tsx"
    with open(path, 'w') as f:
        f.write(build(e))
    print(f"Generated {path}")
