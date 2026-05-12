import re

with open('src/pages/sales/orders/OrdersList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Card title
content = re.sub(
    r'title={<Text strong className="text-lg border-l-4 border-blue-500 pl-2">訂單管理</Text>}',
    r"title={\n          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>\n            <div style={{ width: '4px', height: '24px', backgroundColor: '#1677ff', borderRadius: '2px' }} />\n            <div style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>\n              訂單管理\n            </div>\n          </div>\n        }",
    content
)

# Replace outer return
content = re.sub(
    r'return \(\n    <Card\n      title=\{',
    r"return (\n    <div style={{ padding: '16px 16px 0px 16px', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>\n      <Card\n        style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}\n        styles={{ \n          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },\n          body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 4px 16px' }\n        }}\n        title={",
    content
)

# Update Card extra
# Need to be careful. The current extra is:
# extra={
#   <Space>
#     <DynamicSearchForm form={searchForm}
#       config={searchConfig}
#       onSearch={(values: any) => setParams({ ...params, ...values, page: 1 })}
#     />
#     {hasPermission('Sales.Orders.Create') && (
#       <Button
#         type="primary"
#         icon={<PlusOutlined />}
#         onClick={() => navigate('/sales/orders/create')}
#       >
#         新增
#       </Button>
#     )}
#   </Space>
# }

new_extra = """extra={
          <Space separator={<Divider orientation="vertical" />}>
            <Button
              type="default"
              icon={<SearchOutlined />}
              onClick={() => setIsSearchModalOpen(true)}
            >
              進階查詢
            </Button>
            {hasPermission('Sales.Orders.Create') && (
              <Button 
                type="primary" 
                icon={<PlusOutlined style={{ fontSize: TABLE_ACTION_ICON_SIZE }} />} 
                onClick={() => navigate('/sales/orders/create')}
              >
                新增資料
              </Button>
            )}
          </Space>
        }"""
content = re.sub(r'extra=\{\s*<Space>[\s\S]*?</Space>\s*\}', new_extra, content)

# Replace search tags container
tags_container_old = r'<div className="mb-4 bg-gray-50 p-3 rounded-md">\s*<DynamicSearchTags\s*config=\{searchConfig\}\s*params=\{params\}\s*onClose=\{\(key\) => setParams\(\{ \[key\]: undefined, page: 1 \}\)\}\s*/>\s*</div>'
tags_container_new = r"""<div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', backgroundColor: 'var(--ant-color-fill-tertiary, #fafafa)', padding: '12px 16px', borderRadius: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', color: 'var(--ant-color-text-description, #8c8c8c)', marginRight: '12px', fontWeight: 500 }}>目前的查詢條件:</span>
          <DynamicSearchTags
            config={searchConfig}
            params={params}
            onClose={(key) => setParams({ [key]: undefined, page: 1 })}
          />
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
          `}</style>"""

content = re.sub(tags_container_old, tags_container_new, content)

# wrap table in the div from tags_container_new
content = content.replace("</Card>", "</div>\n      </Card>")
content = content.replace("</Card>", "</Card>\n\n      <Modal\n        title={\n          <div style={{ fontSize: '18px', fontWeight: 600, paddingBottom: '12px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>\n            查詢條件設定\n          </div>\n        }\n        open={isSearchModalOpen}\n        onCancel={() => setIsSearchModalOpen(false)}\n        footer={\n          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>\n            <Button icon={<ClearOutlined />} onClick={() => searchForm.resetFields()}>\n              清空重置\n            </Button>\n            <Button type=\"primary\" icon={<SearchOutlined />} onClick={() => searchForm.submit()}>\n              執行查詢\n            </Button>\n          </div>\n        }\n        width={800}\n        style={{ top: '10vh' }}\n        styles={{\n          body: {\n            maxHeight: '60vh',\n            overflowY: 'auto',\n            padding: '24px 24px 0 24px'\n          }\n        }}\n        closeIcon={true}\n      >\n        <DynamicSearchForm \n          config={searchConfig} \n          form={searchForm} \n          onSearch={(values: any) => {\n            setParams({ ...params, ...values, page: 1 });\n            setIsSearchModalOpen(false);\n          }} \n        />\n      </Modal>\n    </div>")

# Add imports
content = content.replace("import { EyeOutlined, PlusOutlined,", "import { EyeOutlined, PlusOutlined, SearchOutlined, ClearOutlined,")
content = content.replace("import { Card, Table, Button, Space, Typography, Tooltip, App, Form }", "import { Card, Table, Button, Space, Typography, Tooltip, App, Form, Divider, Modal }")
content = content.replace("import { useMemo }", "import { useMemo, useState }")

content = content.replace("const [searchForm] = Form.useForm();", "const [searchForm] = Form.useForm();\n  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);")

with open('src/pages/sales/orders/OrdersList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

