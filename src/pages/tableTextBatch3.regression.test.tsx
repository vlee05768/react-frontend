import React from 'react';
import { describe, expect, it } from 'vitest';
import { Link } from 'react-router-dom';
import { TableText } from '@/components/Table/tableText';
import { getColumns as getPurchaseOrderColumns } from './purchase/orders/PurchaseOrderConfig';
import { mainTableColumns as getPurchaseReceiptColumns } from './purchase/receipts/PurchaseReceiptConfig';
import { getColumns as getOrderColumns } from './sales/orders/OrderConfig';
import { getColumns as getSalesDeliveryColumns } from './sales/sales-deliveries/SalesDeliveryConfig';

function findColumn(configs: any[], name: string) {
  return configs.find(config => config.name === name);
}

describe('Batch 3 單據文字欄位回歸', () => {
  it.each([
    [getPurchaseOrderColumns, 'businessPartnerName', '/basic/business-partners/SUP-001'],
    [getPurchaseReceiptColumns, 'businessPartnerName', '/basic/business-partners/SUP-001'],
    [getOrderColumns, 'businessPartnerName', '/basic/business-partners/CUS-001'],
    [getSalesDeliveryColumns, 'businessPartnerName', '/basic/business-partners/CUS-001'],
  ])('單一供應商／客戶 Link 由直接 TableText 保留互動', (getConfigs, name, expectedPath) => {
    const column = findColumn(getConfigs(), name);
    const rendered = column.render('長名稱', { businessPartnerCode: expectedPath.split('/').pop() });
    expect(React.isValidElement(rendered)).toBe(true);
    expect(rendered.type).toBe(TableText);
    const link = rendered.props.renderContent('長名稱');
    expect(link.type).toBe(Link);
    expect(link.props.to).toBe(expectedPath);
    expect(link.props.children).toBe('長名稱');
  });
});
