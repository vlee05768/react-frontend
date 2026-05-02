import re

with open('/home/hermes/git_projects/erp-frontend-react/generate_crud_v2.py', 'r') as f:
    content = f.read()

# Update I18N_MAP
old_i18n = """I18N_MAP = {
    'userName': '使用者名稱', 'name': '名稱', 'email': '電子郵件', 'isActive': '狀態',
    'employeeCode': '員工編號', 'employeeNo': '員工編號', 'caption': '角色標題',
    'description': '描述', 'code': '編號', 'type': '類型', 'location': '儲位位置',
    'area': '區域', 'isCalculateInventory': '計算庫存', 'notes': '備註',
    'supplierCode': '供應商編號', 'shape': '形狀', 'dimensionLMm': '長度 (mm)',
    'dimensionWMm': '寬度 (mm)', 'dimensionHMm': '高度 (mm)', 'isShareable': '可共用',
    'capacity': '產能', 'department': '部門', 'mobile': '手機',
    'CodeOrName': '編號或名稱', 'Type': '類型', 'SupplierCode': '供應商編號'
}"""
new_i18n = """I18N_MAP = {
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
}"""
content = content.replace(old_i18n, new_i18n)

# Update Employee config
old_emp = """"Entity": "Employee", "entity": "employee", "TitleStr": "員工基本檔", "PermKey": "BasicData.Employees",
        "IdKeyC": "Id", "idKey": "id", "StoreFile": "employeeStore", "RoutePath": "/employee",
        "cols": ["employeeCode", "name", "department", "isActive"],
        "search": ["employeeNo", "name"],
        "fields": ["employeeCode", "name", "department", "mobile", "email", "isActive"]"""
new_emp = """"Entity": "Employee", "entity": "employee", "TitleStr": "員工基本檔", "PermKey": "BasicData.Employees",
        "IdKeyC": "Id", "idKey": "id", "StoreFile": "employeeStore", "RoutePath": "/employee",
        "cols": ["employeeNo", "name", "departmentName", "phone", "hireDate", "status"],
        "search": ["employeeNo", "name", "phone", "status", "departmentCode"],
        "fields": ["employeeNo", "name", "status", "departmentCode", "phone", "email", "hireDate", "resignDate", "notes"]"""
content = content.replace(old_emp, new_emp)

# Update make_col
old_make_col = """def make_col(c):
    if c == 'isActive':
        return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}', render: (v: boolean) => <Tag color={{v ? 'green' : 'red'}}>{{v ? '啟用' : '停用'}}</Tag> }},"
    return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}' }},\""""
new_make_col = """def make_col(c):
    if c == 'isActive':
        return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}', render: (v: boolean) => <Tag color={{v ? 'green' : 'red'}}>{{v ? '啟用' : '停用'}}</Tag> }},"
    if c == 'status':
        return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}', render: (v: number) => <Tag color={{v === 1 ? 'green' : 'red'}}>{{v === 1 ? '在職' : '離職'}}</Tag> }},"
    if 'Date' in c:
        return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}', render: (v: string) => v ? v.substring(0, 10) : '-' }},"
    return f"    {{ title: '{t(c)}', dataIndex: '{c}', key: '{c}' }},\""""
content = content.replace(old_make_col, new_make_col)

# Update make_search
old_make_search = """def make_search(c):
    return f\"\"\"            <Col span={{24}}>
              <Form.Item name="{c}" label="{t(c)}">
                <Input placeholder="請輸入{t(c)}" allowClear />
              </Form.Item>
            </Col>\"\"\""""
new_make_search = """def make_search(c):
    if c == 'status':
        return f\"\"\"            <Col span={{24}}>
              <Form.Item name="{c}" label="{t(c)}">
                <Select placeholder="請選擇{t(c)}" allowClear>
                  <Select.Option value={{1}}>在職</Select.Option>
                  <Select.Option value={{2}}>離職</Select.Option>
                </Select>
              </Form.Item>
            </Col>\"\"\"
    return f\"\"\"            <Col span={{24}}>
              <Form.Item name="{c}" label="{t(c)}">
                <Input placeholder="請輸入{t(c)}" allowClear />
              </Form.Item>
            </Col>\"\"\""""
content = content.replace(old_make_search, new_make_search)

# Update make_desc
old_make_desc = """def make_desc(c):
    if c == 'isActive' or c == 'isCalculateInventory' or c == 'isShareable':
        return f"              <Descriptions.Item label=\\"{t(c)}\\">{{viewData?.{c} ? '是' : '否'}}</Descriptions.Item>"
    return f"              <Descriptions.Item label=\\"{t(c)}\\">{{viewData?.{c}}}</Descriptions.Item>\""""
new_make_desc = """def make_desc(c):
    if c == 'isActive' or c == 'isCalculateInventory' or c == 'isShareable':
        return f"              <Descriptions.Item label=\\"{t(c)}\\">{{viewData?.{c} ? '是' : '否'}}</Descriptions.Item>"
    if c == 'status':
        return f"              <Descriptions.Item label=\\"{t(c)}\\">{{viewData?.{c} === 1 ? '在職' : '離職'}}</Descriptions.Item>"
    if 'Date' in c:
        return f"              <Descriptions.Item label=\\"{t(c)}\\">{{viewData?.{c} ? viewData.{c}.substring(0,10) : '-'}}</Descriptions.Item>"
    return f"              <Descriptions.Item label=\\"{t(c)}\\">{{viewData?.{c}}}</Descriptions.Item>\""""
content = content.replace(old_make_desc, new_make_desc)

# Update make_form
old_make_form = """def make_form(c):
    if c == 'isActive' or c == 'isCalculateInventory' or c == 'isShareable':
        return f\"\"\"                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>\"\"\"
    return f\"\"\"                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}" rules={{[{{ required: {str(c in ['code', 'name', 'userName']).lower()}, message: '必填欄位' }}]}}>
                    <Input placeholder="請輸入{t(c)}" />
                  </Form.Item>
                </Col>\"\"\""""
new_make_form = """def make_form(c):
    if c == 'isActive' or c == 'isCalculateInventory' or c == 'isShareable':
        return f\"\"\"                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>\"\"\"
    if c == 'status':
        return f\"\"\"                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}" rules={{[{{ required: true, message: '必填欄位' }}]}}>
                    <Select placeholder="請選擇{t(c)}">
                      <Select.Option value={{1}}>在職</Select.Option>
                      <Select.Option value={{2}}>離職</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>\"\"\"
    if 'Date' in c:
        return f\"\"\"                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}">
                    <Input type="date" />
                  </Form.Item>
                </Col>\"\"\"
    if c == 'notes' or c == 'description':
        return f\"\"\"                <Col span={{24}}>
                  <Form.Item name="{c}" label="{t(c)}">
                    <Input.TextArea placeholder="請輸入{t(c)}" rows={{3}} />
                  </Form.Item>
                </Col>\"\"\"
    return f\"\"\"                <Col span={{12}}>
                  <Form.Item name="{c}" label="{t(c)}" rules={{[{{ required: {str(c in ['code', 'name', 'userName', 'employeeNo', 'departmentCode']).lower()}, message: '必填欄位' }}]}}>
                    <Input placeholder="請輸入{t(c)}" />
                  </Form.Item>
                </Col>\"\"\""""
content = content.replace(old_make_form, new_make_form)

# Inject ref to Employee config
old_inject = """    elif e["Entity"] == "Employee":
        code = code.replace(f'<Input placeholder="請輸入{t("employeeCode")}" />', f'<Input placeholder="請輸入{t("employeeCode")}" ref={{firstInputRef}} />')"""
new_inject = """    elif e["Entity"] == "Employee":
        code = code.replace(f'<Input placeholder="請輸入{t("employeeNo")}" />', f'<Input placeholder="請輸入{t("employeeNo")}" ref={{firstInputRef}} />')"""
content = content.replace(old_inject, new_inject)

with open('/home/hermes/git_projects/erp-frontend-react/generate_crud_v2.py', 'w') as f:
    f.write(content)
