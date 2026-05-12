import re

with open('src/pages/sales/orders/OrdersList.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { Card, Table, Button, Space, Typography, Tooltip, App, Form, Divider, Modal } from 'antd';", "import { Card, Table, Button, Space, Tooltip, App, Form, Divider, Modal } from 'antd';")

with open('src/pages/sales/orders/OrdersList.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
