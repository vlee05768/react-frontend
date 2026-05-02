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
  getApiV1{Entity}, 
  getApiV1{Entity}By{IdKeyC},
  postApiV1{Entity},
  putApiV1{Entity}By{IdKeyC},
  deleteApiV1{Entity}By{IdKeyC}
} from '@/api/generated/sdk.gen';
import type { {Entity}Dto } from '@/api/generated/types.gen';
import { use{Entity}QueryStore } from '@/stores/{StoreFile}';
import { useAuthStore } from '@/stores/useAuthStore';

const { Title } = Typography;

export default function {Entity}List() {
  const { viewId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const firstInputRef = useRef<InputRef>(null);

  const { params, setParams, resetParams } = use{Entity}QueryStore();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchForm] = Form.useForm();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(!!viewId);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>(viewId ? 'view' : 'create');
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['{entity}List', params],
    queryFn: () =>
      getApiV1{Entity}({
        query: params as any,
      }),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['{entity}Detail', viewId],
    queryFn: () => getApiV1{Entity}By{IdKeyC}({ path: { {idKey}: viewId as any } }),
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
    mutationFn: (values: any) => postApiV1{Entity}({ body: values }),
    onSuccess: () => {
      message.success('新增成功');
      queryClient.invalidateQueries({ queryKey: ['{entity}List'] });
      closeDrawer();
    },
    onError: () => message.error('新增失敗'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ {idKey}, values }: { {idKey}: string | number; values: any }) =>
      putApiV1{Entity}By{IdKeyC}({ path: { {idKey}: {idKey} as any }, body: values }),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['{entity}List'] });
      queryClient.invalidateQueries({ queryKey: ['{entity}Detail', viewId] });
      setDrawerMode('view');
    },
    onError: () => message.error('更新失敗'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({idKey}: string | number) => deleteApiV1{Entity}By{IdKeyC}({ path: { {idKey}: {idKey} as any } }),
    onSuccess: () => {
      message.success('刪除成功');
      queryClient.invalidateQueries({ queryKey: ['{entity}List'] });
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
    navigate('{RoutePath}/new');
    setDrawerMode('create');
    form.resetFields();
    setIsDrawerOpen(true);
    setTimeout(() => firstInputRef.current?.focus(), 100);
  };

  const openView = ({idKey}: string | number) => {
    navigate(`{RoutePath}/${{idKey}}`);
    setDrawerMode('view');
  };

  const openEdit = ({idKey}: string | number) => {
    navigate(`{RoutePath}/${{idKey}}`);
    setDrawerMode('edit');
    setTimeout(() => firstInputRef.current?.focus(), 100);
  };

  const closeDrawer = () => {
    navigate('{RoutePath}');
    setIsDrawerOpen(false);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (drawerMode === 'create') {
        createMutation.mutate(values);
      } else {
        updateMutation.mutate({ {idKey}: viewId as any, values });
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
      render: (_: any, record: {Entity}Dto) => (
        <Space size="small">
          <Tooltip title="檢視">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openView(record.{idKey} as any)}
              className="text-blue-500"
            />
          </Tooltip>
          {hasPermission('{PermKey}.Update') && (
            <Tooltip title="編輯">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => openEdit(record.{idKey} as any)}
                className="text-orange-500"
              />
            </Tooltip>
          )}
          {hasPermission('{PermKey}.Delete') && (
            <Tooltip title="刪除">
              <Popconfirm
                title="確定要刪除此筆資料？"
                onConfirm={() => deleteMutation.mutate(record.{idKey} as any)}
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

  return (
    <div className="flex flex-col h-full bg-[#141414] p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <Title level={3} className="!m-0 text-gray-100">{TitleStr}</Title>
        <Space>
          <Button
            type="default"
            icon={<SearchOutlined />}
            onClick={() => setIsSearchModalOpen(true)}
          >
            查詢
          </Button>
          {hasPermission('{PermKey}.Create') && (
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
          rowKey="{idKey}"
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
{SearchFormStr}
        </Form>
      </Modal>

      <Drawer
        title={drawerMode === 'create' ? '新增{TitleStr}' : drawerMode === 'edit' ? '編輯{TitleStr}' : '檢視{TitleStr}'}
        width={720}
        size="large"
        onClose={closeDrawer}
        open={isDrawerOpen}
        extra={
          <Space>
            {drawerMode === 'view' ? (
              hasPermission('{PermKey}.Update') && (
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
{ViewDescriptionsStr}
            </Descriptions>
          ) : (
            <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
              <Row gutter={16}>
{EditFormStr}
              </Row>
            </Form>
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
        return f"              <Descriptions.Item label=\"{c}\">{{detail?.{c} ? '是' : '否'}}</Descriptions.Item>"
    return f"              <Descriptions.Item label=\"{c}\">{{detail?.{c}}}</Descriptions.Item>"

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
    path = f"/home/hermes/git_projects/erp-frontend-react/src/pages/{e['StoreFile'].replace('Store','')}/{e['Entity']}List.tsx"
    with open(path, 'w') as f:
        f.write(build(e))
    print(f"Generated {path}")

