import { render, screen } from '@testing-library/react';
import { Button, Tag } from 'antd';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TableText } from '@/components/Table/TableTextContent';
import { normalizeTableColumns } from '@/components/Table/tableText';
import { mainTableColumns as productColumns } from '@/pages/basic/products/ProductConfig';
import { itemTableColumns as adjustmentItemColumns } from '@/pages/warehouse/inventory-adjustments/InventoryAdjustmentConfig';
import { mainTableColumns as receiptColumns } from '@/pages/warehouse/customer-material-receipt/CustomerMaterialReceiptConfig';

const batch2Files = [
  'src/pages/basic/products/ProductConfig.tsx',
  'src/pages/warehouse/inventory/StorageInventoryList.tsx',
  'src/pages/warehouse/inventory-movements/StorageTransactionsList.tsx',
  'src/pages/warehouse/inventory-adjustments/InventoryAdjustmentConfig.tsx',
  'src/pages/warehouse/customer-material-receipt/CustomerMaterialReceiptConfig.tsx',
  'src/pages/warehouse/customer-material-receipt/CustomerMaterialPickerModal.tsx',
];

describe('Batch 2 table text regressions', () => {
  it('removes duplicate EllipsisText wrappers from every Batch 2 file', () => {
    for (const file of batch2Files) {
      expect(readFileSync(file, 'utf8'), file).not.toContain('EllipsisText');
    }
  });

  it('uses direct TableText for fixed-width product and adjustment text', () => {
    const productName = productColumns().find(column => column.name === 'name')!;
    const customer = productColumns().find(column => column.name === 'businessPartnerName')!;
    const adjustmentName = adjustmentItemColumns().find(column => column.name === 'inventoryName')!;
    const adjustmentNotes = adjustmentItemColumns().find(column => column.name === 'notes')!;

    expect(productName.render?.('長產品名稱', {}, 0)).toMatchObject({ type: TableText });
    expect(customer.render?.('客戶', { businessPartnerCode: 'BP-1' }, 0)).toMatchObject({ type: TableText });
    expect(adjustmentName.render?.('原料', { inventoryType: 'M', extraData: { widthMm: 120 } }, 0)).toMatchObject({ type: TableText });
    expect(adjustmentNotes.render?.('', {}, 0)).toMatchObject({ type: TableText });
  });

  it('keeps long text wrapping, empty values, and zero visible', () => {
    const { container, rerender } = render(<TableText value={'第一行\n第二行'} maxLines={2} maxWidth={120} />);
    expect(container.querySelector('[data-table-text]')).toHaveClass('erp-table-text-preview--multi-line');

    rerender(<TableText value={null} emptyText="-" />);
    expect(screen.getByText('-')).toBeInTheDocument();

    rerender(<TableText value={0} format={value => Number(value).toLocaleString('zh-TW')} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('uses TableText for a single receipt link but preserves composite Button and Tag renderers', () => {
    const reference = receiptColumns().find(column => column.name === 'referenceNumber')!;
    expect(reference.render?.('WO-001', { subType: 'SEMI' }, 0)).toMatchObject({ type: TableText });

    const columns = normalizeTableColumns([
      {
        title: '複合操作',
        render: () => <div><Button>操作</Button><Tag>狀態</Tag></div>,
      },
    ]);
    const rendered = columns[0].render?.(undefined, {}, 0);
    const { container } = render(<>{rendered}</>);
    expect(screen.getByRole('button', { name: /操\s*作/ })).toBeInTheDocument();
    expect(screen.getByText('狀態')).toBeInTheDocument();
    expect(container.querySelector('[data-table-text]')).toBeNull();
  });
});
