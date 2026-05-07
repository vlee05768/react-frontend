const fs = require('fs');
const path = 'src/pages/basic/BusinessPartner/BusinessPartnerConfig.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('CheckOutlined')) {
  content = content.replace('import { z } from "zod";', 'import { z } from "zod";\nimport { CheckOutlined, CloseOutlined } from "@ant-design/icons";');
}

content = content.replace(
  /render:\s*\(\s*val:\s*boolean\s*\)\s*=>\s*\(val\s*\?\s*"是"\s*:\s*"否"\)/,
  "align: 'center',\n    render: (v: boolean | undefined | null) => v === true ? <CheckOutlined style={{ color: 'green' }} /> : (v === false ? <CloseOutlined style={{ color: 'red' }} /> : null)"
);

fs.writeFileSync(path, content);
