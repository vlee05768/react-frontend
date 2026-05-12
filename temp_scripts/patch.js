const fs = require('fs');
const path = '/home/hermes/git_projects/erp-frontend-react/src/pages/warehouse/InventoryAdjustment/Tabs/InventoryAdjustmentItemsTab.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  /queryFn: \(\) => getApiV1InventoryAdjustmentByMovementNumberItems\(\{ path: \{ movementNumber: documentNumber \} \}\),/,
  `queryFn: () => getApiV1InventoryAdjustmentByMovementNumberItems({ path: { movementNumber: documentNumber }, query: { pageSize: 100 } as any }),`
);
fs.writeFileSync(path, content);
console.log("patched!");
