const fs = require('fs');
const path = './src/pages/warehouse/StorageInventory/StorageInventoryList.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  'return res.data?.data || [];',
  'console.log("API RES:", res);\n      return Array.isArray(res.data?.data) ? res.data.data : [];'
);
fs.writeFileSync(path, content);
