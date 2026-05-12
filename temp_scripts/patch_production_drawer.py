import re

file_path = "src/pages/quality/productionreceipt/ProductionReceiptDrawer.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

if "DrawerTitle" not in content:
    content = content.replace(
        "import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';",
        "import { MasterDetailTabs } from '@/components/Form/MasterDetailTabs';\nimport { DrawerTitle } from '@/components/Form/DrawerTitle';"
    )

old_title = """title={
        <div className="flex items-center gap-2">
          <span>製令入庫單</span>
          {id && <span className="text-gray-500 font-normal">#{id}</span>}
        </div>
      }"""
      
new_title = """title={
        <DrawerTitle
          moduleName="製令入庫單"
          isCreate={false}
          isEdit={false}
          record={{ documentNumber: id }}
          displayField="documentNumber"
        />
      }"""

content = content.replace(old_title, new_title)

# Ensure extra action buttons use `ActionButton` or consistent style with icons.
old_extra_start = "extra={"
old_extra_end = ">\n    "

# The extra section ends where the dynamic form begins inside `<Spin>`. So just string replace buttons.
content = content.replace(
    '<Button type="primary" onClick={() => confirmMutation.mutate(id!)} loading={confirmMutation.isPending}>確認單據</Button>',
    '<Button type="primary" icon={<CheckCircleOutlined />} onClick={() => confirmMutation.mutate(id!)} loading={confirmMutation.isPending}>確認單據</Button>'
)
content = content.replace(
    '<Button onClick={() => cancelConfirmMutation.mutate(id!)} loading={cancelConfirmMutation.isPending} danger>取消確認</Button>',
    '<Button danger icon={<CloseOutlined />} onClick={() => cancelConfirmMutation.mutate(id!)} loading={cancelConfirmMutation.isPending}>取消確認</Button>'
)
content = content.replace(
    '<Button style={{ backgroundColor: \'#2080f0\', color: \'white\' }} onClick={() => closeMutation.mutate(id!)} loading={closeMutation.isPending}>結案單據</Button>',
    '<Button style={{ backgroundColor: \'#2080f0\', color: \'white\' }} icon={<CheckCircleOutlined />} onClick={() => closeMutation.mutate(id!)} loading={closeMutation.isPending}>結案單據</Button>'
)
content = content.replace(
    '<Button onClick={() => cancelCloseMutation.mutate(id!)} loading={cancelCloseMutation.isPending}>取消結案</Button>',
    '<Button icon={<SyncOutlined />} onClick={() => cancelCloseMutation.mutate(id!)} loading={cancelCloseMutation.isPending}>取消結案</Button>'
)

if "CheckCircleOutlined" not in content:
    content = content.replace(
        "import { EditOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons';",
        "import { EditOutlined, CloseOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';"
    )
    if "CheckCircleOutlined" not in content:
        content = content.replace("import { Spin, Drawer, Button, message, Space } from 'antd';", "import { Spin, Drawer, Button, message, Space } from 'antd';\nimport { EditOutlined, CloseOutlined, SaveOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';")


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

