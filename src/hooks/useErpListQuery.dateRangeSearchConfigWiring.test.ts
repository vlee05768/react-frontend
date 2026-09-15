import { describe, expect, it } from 'vitest';

type DateRangeListPage = {
  label: string;
  listPath: string;
  configPath: string;
  configName: string;
};

const dateRangeListPages: DateRangeListPage[] = [
  {
    label: '客戶對帳',
    listPath: '../pages/sales/statements/CustomerStatementList.tsx',
    configPath: '../pages/sales/statements/CustomerStatementConfig.tsx',
    configName: 'searchConfig',
  },
  {
    label: '銷售出貨',
    listPath: '../pages/sales/sales-deliveries/SalesDeliveriesList.tsx',
    configPath: '../pages/sales/sales-deliveries/SalesDeliveryConfig.tsx',
    configName: 'searchConfig',
  },
  {
    label: '訂單',
    listPath: '../pages/sales/orders/OrdersList.tsx',
    configPath: '../pages/sales/orders/OrderConfig.tsx',
    configName: 'searchConfig',
  },
  {
    label: '製令',
    listPath: '../pages/production-quality/work-orders/WorkOrdersList.tsx',
    configPath: '../pages/production-quality/work-orders/WorkOrderConfig.tsx',
    configName: 'searchConfig',
  },
  {
    label: '生產入庫',
    listPath: '../pages/production-quality/production-receipts/ProductionReceiptsList.tsx',
    configPath: '../pages/production-quality/production-receipts/ProductionReceiptConfig.tsx',
    configName: 'productionReceiptSearchConfig',
  },
  {
    label: 'QC',
    listPath: '../pages/production-quality/qc-receipts/QcReceiptsList.tsx',
    configPath: '../pages/production-quality/qc-receipts/QcReceiptConfig.tsx',
    configName: 'qcReceiptSearchConfig',
  },
  {
    label: '採購入庫',
    listPath: '../pages/purchase/receipts/PurchaseReceiptsList.tsx',
    configPath: '../pages/purchase/receipts/PurchaseReceiptConfig.tsx',
    configName: 'purchaseReceiptSearchConfig',
  },
  {
    label: 'IQC',
    listPath: '../pages/purchase/iqc-inspections/IqcList.tsx',
    configPath: '../pages/purchase/iqc-inspections/IqcConfig.tsx',
    configName: 'iqcSearchConfig',
  },
  {
    label: '採購單',
    listPath: '../pages/purchase/orders/PurchaseOrdersList.tsx',
    configPath: '../pages/purchase/orders/PurchaseOrderConfig.tsx',
    configName: 'searchConfig',
  },
  {
    label: '客供料入庫',
    listPath: '../pages/warehouse/customer-material-receipt/CustomerMaterialReceiptList.tsx',
    configPath: '../pages/warehouse/customer-material-receipt/CustomerMaterialReceiptConfig.tsx',
    configName: 'customerMaterialReceiptSearchConfig\\(\\)',
  },
  {
    label: '庫存異動',
    listPath: '../pages/warehouse/inventory-movements/StorageTransactionsList.tsx',
    configPath: '../pages/warehouse/inventory-movements/StorageTransactionsList.tsx',
    configName: 'searchConfig',
  },
  {
    label: '庫存調整',
    listPath: '../pages/warehouse/inventory-adjustments/InventoryAdjustmentList.tsx',
    configPath: '../pages/warehouse/inventory-adjustments/InventoryAdjustmentConfig.tsx',
    configName: 'mainSearchFormConfig\\(\\)',
  },
];

const pageSources = import.meta.glob<string>('../pages/**/*.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const source = (relativePath: string) => {
  const content = pageSources[relativePath];
  if (!content) throw new Error(`找不到測試來源檔案：${relativePath}`);
  return content;
};

describe('DateRangePicker list searchConfig wiring', () => {
  it.each(dateRangeListPages)('$label passes its DateRangePicker config into useErpListQuery', ({ listPath, configPath, configName }) => {
    expect(source(configPath)).toContain('DateRangePicker');
    expect(source(listPath)).toMatch(new RegExp(`useErpListQuery\\(\\{[\\s\\S]{0,500}?(?:searchConfig\\s*:\\s*${configName}|${configName}\\s*,)`));
  });
});
