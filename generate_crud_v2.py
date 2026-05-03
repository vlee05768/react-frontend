import os
import re

I18N_MAP = {
    'userName': '帳號', 'name': '姓名', 'email': '電子郵件', 'isActive': '狀態', 'position': '職位', 'extensionNumber': '分機號碼', 'phoneNumber': '電話號碼', 'roles': '角色', 'mobile': '手機號碼',
    'employeeCode': '員工編號', 'employeeNo': '員工編號', 'caption': '角色標題',
    'description': '描述', 'code': '編號', 'type': '類型', 'location': '儲位位置',
    'area': '區域', 'isCalculateInventory': '計算庫存', 'notes': '備註',
    'supplierCode': '供應商編號', 'shape': '形狀', 'dimensionLMm': '長度 (mm)',
    'dimensionWMm': '寬度 (mm)', 'dimensionHMm': '高度 (mm)', 'isShareable': '可共用',
    'capacity': '產能', 'department': '部門',
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
  AppstoreOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getApiV1{Entity}, 
  getApiV1{Entity}By{IdKeyC},
  postApiV1{Entity},
  putApiV1{Entity}By{IdKeyC},
  deleteApiV1{Entity}By{IdKeyC}
} from '@/api/generated/sdk.gen';
{ExtraImportsStr}
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
    queryKey: ['{entity}Detail', viewId],
    queryFn: () => getApiV1{Entity}By{IdKeyC}({ path: { {idKey}: viewId as any } }),
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
{ExtraHooksStr}
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
          {{DeletePermCheck} && (
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
    // 確保清空的欄位能覆蓋 Zustand store 中的舊值
    const searchKeys = {SearchKeysArray};
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
    const searchKeys = {SearchKeysArray};
    const activeFilters: React.ReactNode[] = [];
    
    searchKeys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        let label = key;
        let valueStr = String(params[key]);
{SearchTagsMappingStr}
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
{EditFormStr}
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
              {TitleStr}
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
            {{CreatePermCheck} && (
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
            rowKey="{idKey}"
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
          (!isDrawerEditing && !isCreateDrawerOpen && {UpdatePermCheck}) && (
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
"""

entities = [
    {
        "Entity": "User", "entity": "user", "TitleStr": "用戶管理", "PermKey": "System.Users",
        "IdKeyC": "Id", "idKey": "id", "StoreFile": "systemStore", "RoutePath": "/system/users",
        "cols": ["isActive", "userName", "name", "employeeCode", "position", "email", "department", "extensionNumber", "mobile", "phoneNumber", "roles"],
        "search": ["userName", "name", "employeeCode"],
        "fields": [{"name": "isActive"}, {"name": "userName", "updateDisabled": True}, {"name": "name"}, {"name": "employeeCode"}, {"name": "position"}, {"name": "email"}, {"name": "department"}, {"name": "extensionNumber"}, {"name": "mobile"}, {"name": "phoneNumber"}, {"name": "roles"}]
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
        "cols": ["code", "name", "type", "location", "area", "isCalculateInventory", "isActive", "notes"],
        "search": ["CodeOrName", "Type"],
        "fields": ["code", "name", "type", "location", "area", "isCalculateInventory", "isActive", "notes"],
        "readOnly": True
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
        "cols": ["employeeNo", "name", "departmentName", "phone", "hireDate", "resignDate", "status", "notes"],
        "search": ["employeeNo", "name", "status", "departmentCode"],
        "fields": ["employeeNo", "name", "status", "departmentCode", "phone", "email", "hireDate", "resignDate", "notes"]
    }
]

def t(c, entity=''):
    if entity == 'employee' and c == 'name':
        return '姓名'
    if entity == 'storage':
        if c == 'code': return '儲位編碼'
        if c == 'name': return '儲位名稱'
        if c == 'type': return '儲位類型'
        if c == 'location': return '地區'
    return I18N_MAP.get(c, c)

def make_col(c, entity=""):
    if c in ['isActive', 'isCalculateInventory', 'isShareable']:
        return f"    {{ title: '{t(c, entity)}', dataIndex: '{c}', key: '{c}', align: 'center', render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{{{ color: 'green' }}}} /> : (v === false ? <CloseOutlined style={{{{ color: 'red' }}}} /> : null) }},"
    if c == 'status':
        return f"    {{ title: '{t(c, entity)}', dataIndex: '{c}', key: '{c}', align: 'center', render: (v: number) => v === 1 ? <CheckOutlined style={{{{ color: 'green' }}}} /> : (v === 2 ? <CloseOutlined style={{{{ color: 'red' }}}} /> : null) }},"
    if 'Date' in c:
        return f"    {{ title: '{t(c, entity)}', dataIndex: '{c}', key: '{c}', align: 'center', render: (v: string) => v ? v.substring(0, 10) : '-' }},"
    if c == 'roles':
        return f"    {{ title: '{t(c, entity)}', dataIndex: '{c}', key: '{c}', render: (v: string[]) => v?.join(', ') || '-' }},"
    if c in ['capacity', 'dimensionLMm', 'dimensionWMm', 'dimensionHMm']:
        return f"    {{ title: '{t(c, entity)}', dataIndex: '{c}', key: '{c}', align: 'right', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v }},"
    # Text columns (left aligned content, header centered via css)
    return f"    {{ title: '{t(c, entity)}', dataIndex: '{c}', key: '{c}', render: (v: any) => typeof v === 'number' ? new Intl.NumberFormat('en-US').format(v) : v }},"


def make_search(c, entity=""):
    if c == 'status':
        return f"""            <Col span={{12}}>
              <Form.Item name="{c}" label="{t(c, entity)}">
                <Select placeholder="請選擇{t(c, entity)}" allowClear style={{{{ width: '100%' }}}}>
                  <Select.Option value={{1}}>在職</Select.Option>
                  <Select.Option value={{2}}>離職</Select.Option>
                </Select>
              </Form.Item>
            </Col>"""
    if c == 'departmentCode':
        return f"""            <Col span={{12}}>
              <Form.Item name="{c}" label="{t(c, entity)}">
                <Select placeholder="請選擇{t(c, entity)}" allowClear style={{{{ width: '100%' }}}} options={{departmentOptions}} loading={{isFetchingDepartments}} showSearch filterOption={{(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}} />
              </Form.Item>
            </Col>"""
    return f"""            <Col span={{12}}>
              <Form.Item name="{c}" label="{t(c, entity)}">
                <Input placeholder="請輸入{t(c, entity)}" allowClear />
              </Form.Item>
            </Col>"""

def make_form(field_def, entity=""):
    if isinstance(field_def, dict):
        c = field_def.get("name")
        ud = field_def.get("updateDisabled", False)
        cd = field_def.get("createDisabled", False)
    else:
        c = field_def
        ud = False
        cd = False

    disabled_expr = "false"
    if ud and cd:
        disabled_expr = "true"
    elif ud:
        disabled_expr = "isEdit"
    elif cd:
        disabled_expr = "!isEdit"

    disabled_prop = f" disabled={{{disabled_expr}}}" if disabled_expr != "false" else ""

    if c == 'isActive' or c == 'isCalculateInventory' or c == 'isShareable':
        return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c, entity)}" valuePropName="checked">
                    <Switch{disabled_prop} />
                  </Form.Item>
                </Col>"""
    if c == 'status':
        return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c, entity)}" rules={{[{{ required: true, message: '必填欄位' }}]}}>
                    <Select placeholder={{isViewMode ? '' : '請選擇{t(c, entity)}'}} style={{{{ width: '100%' }}}}{disabled_prop}>
                      <Select.Option value={{1}}>在職</Select.Option>
                      <Select.Option value={{2}}>離職</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>"""
    if c == 'roles':
        return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c, entity)}">
                    <Select mode="tags" placeholder={{isViewMode ? '' : '請選擇或輸入{t(c, entity)}'}} style={{{{ width: '100%' }}}}{disabled_prop} />
                  </Form.Item>
                </Col>"""
    if c == 'departmentCode':
        return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c, entity)}" rules={{[{{ required: true, message: '必填欄位' }}]}}>
                    <Select placeholder={{isViewMode ? '' : '請選擇{t(c, entity)}'}} style={{{{ width: '100%' }}}}{disabled_prop} options={{departmentOptions}} loading={{isFetchingDepartments}} showSearch filterOption={{(input, option) => (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())}} />
                  </Form.Item>
                </Col>"""
    if 'Date' in c:
        return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c, entity)}">
                    <Input type={{isViewMode ? 'text' : 'date'}} placeholder={{isViewMode ? '' : '請選擇{t(c, entity)}'}} style={{{{ width: '100%' }}}}{disabled_prop} />
                  </Form.Item>
                </Col>"""
    if c == 'notes' or c == 'description':
        return f"""                <Col span={{24}}>
                  <Form.Item name="{c}" label="{t(c, entity)}">
                    <Input.TextArea placeholder={{isViewMode ? '' : '請輸入{t(c, entity)}'}} rows={{3}}{disabled_prop} />
                  </Form.Item>
                </Col>"""
    return f"""                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c, entity)}" rules={{[{{ required: {str(c in ['code', 'name', 'userName', 'employeeNo', 'departmentCode']).lower()}, message: '必填欄位' }}]}}>
                    <Input placeholder={{isViewMode ? '' : '請輸入{t(c, entity)}'}}{disabled_prop} />
                  </Form.Item>
                </Col>"""

def make_search_tags(e):
    ent = e["entity"]
    lines = []
    for c in e["search"]:
        lbl = t(c, ent)
        if c == 'status':
            lines.append(f"        if (key === '{c}') valueStr = params[key] === 1 ? '在職' : (params[key] === 2 ? '離職' : String(params[key]));")
        elif c == 'departmentCode' and ent == 'employee':
            lines.append(f"        if (key === '{c}') valueStr = departmentOptions?.find((o: any) => o.value === params[key])?.label || String(params[key]);")
        lines.append(f"        if (key === '{c}') label = '{lbl}';")
    return "\n".join(lines)

def build(e):

    ent = e["entity"]
    is_emp = e["Entity"] == "Employee"
    cols_str = "\n".join(make_col(c, ent) for c in e["cols"])
    search_str = "\n".join(make_search(c, ent) for c in e["search"])
    
    form_str = "\n".join(make_form(c, ent) for c in e["fields"])
    
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

    # 處理 ReadOnly
    is_read_only = e.get("readOnly", False)
    code = code.replace("{CreatePermCheck}", "false" if is_read_only else f"hasPermission('{e['PermKey']}.Create')")
    code = code.replace("{UpdatePermCheck}", "false" if is_read_only else f"hasPermission('{e['PermKey']}.Update')")
    code = code.replace("{DeletePermCheck}", "false" if is_read_only else f"hasPermission('{e['PermKey']}.Delete')")

    
    
    search_keys_arr = str(e["search"])
    code = code.replace("{SearchKeysArray}", search_keys_arr)
    code = code.replace("{SearchTagsMappingStr}", make_search_tags(e))

    
    extra_imports = ""
    extra_hooks = ""
    if is_emp:
        extra_imports = "import { getApiV1GeneralTypesGetTypes } from '@/api/generated/sdk.gen';"
        extra_hooks = """
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
"""
        
    code = code.replace("{ExtraImportsStr}", extra_imports)
    code = code.replace("{ExtraHooksStr}", extra_hooks)
    code = code.replace("{EditFormStr}", form_str)
    
    # inject ref to first input
    if e["Entity"] == "User":
        code = code.replace(f'<Input placeholder="請輸入{t("userName")}" disabled={{isEdit}} />', f'<Input placeholder="請輸入{t("userName")}" disabled={{isEdit}} ref={{firstInputRef}} />')
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
