const fs = require('fs');
let code = fs.readFileSync('src/components/Form/DynamicField.tsx', 'utf8');
code = code.replace("import { Form, Input, Select, InputNumber, DatePicker, Switch, Tooltip } from 'antd';", 
"import { Form, Input, Select, InputNumber, DatePicker, Switch, Tooltip } from 'antd';\nimport { CalendarOutlined } from '@ant-design/icons';");

code = code.replace(
  "<DatePicker {...commonProps} className=\"w-full\" />",
  "<DatePicker {...commonProps} className=\"w-full\" suffixIcon={<CalendarOutlined style={{ color: 'rgba(255,255,255,0.65)' }} />} />"
);

fs.writeFileSync('src/components/Form/DynamicField.tsx', code);
