import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PurchaseOrderDto } from '@/api/generated/types.gen';
import PurchaseOrderItemsTab from './PurchaseOrderItemsTab';

const materials = {
  'OX-SS-0.1-S': {
    code: 'OX-SS-0.1-S',
    name: '不鏽鋼片料',
    materialForm: 'S',
    width: 500,
    length: 600,
  },
  'OX-SS-0.1-R': {
    code: 'OX-SS-0.1-R',
    name: '不鏽鋼卷料',
    materialForm: 'R',
    width: 500,
    length: 100,
  },
} as const;

vi.mock('@/components/Form/AsyncSelect', () => ({
  AsyncSelect: ({ value, onChange, id, disabled }: any) => (
    <select
      id={id}
      aria-label="原料編碼"
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => {
        const code = event.target.value as keyof typeof materials;
        const originalData = materials[code];
        onChange?.(code || undefined, originalData ? { value: code, originalData } : undefined);
      }}
    >
      <option value="">請選擇原料</option>
      {Object.values(materials).map((material) => (
        <option key={material.code} value={material.code}>{material.code}</option>
      ))}
    </select>
  ),
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const baseOrder = (items: PurchaseOrderDto['items'] = []): PurchaseOrderDto => ({
  code: 'PO-109',
  purchaseOrderType: 'Material',
  status: 'DRAFT',
  expectedArrivalDate: '2026-11-20',
  items,
} as PurchaseOrderDto);

const renderTab = (purchaseOrderData = baseOrder()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <App>
          <PurchaseOrderItemsTab
            purchaseOrderData={purchaseOrderData}
            isMasterViewMode
            onEditingChange={() => undefined}
          />
        </App>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const selectMaterial = (code: keyof typeof materials) => {
  fireEvent.change(screen.getByRole('combobox', { name: '原料編碼' }), { target: { value: code } });
};
const changeNumber = (id: string, value: string) => {
  fireEvent.change(input(id), { target: { value } });
  fireEvent.blur(input(id));
};

const expectSheetPresentation = async () => {
  await waitFor(() => expect(input('unit')).toHaveValue('pcs'));
  expect(screen.getByText('片料長度(mm)')).toBeInTheDocument();
  expect(input('length')).toHaveAttribute('placeholder', '請輸入片料長度(mm)');
  expect(screen.getByText('單價 (pcs)')).toBeInTheDocument();
  expect(screen.getByText('數量')).toBeInTheDocument();
  expect(input('quantity')).toHaveAttribute('placeholder', '請輸入數量');
  expect(screen.queryByText('每卷單價')).not.toBeInTheDocument();
  expect(screen.queryByText('採購卷數')).not.toBeInTheDocument();
  expect(screen.queryByText('每卷長度(m)')).not.toBeInTheDocument();
  expect(input('unit')).not.toHaveValue('卷');
};

const expectRollPresentation = async () => {
  await waitFor(() => expect(input('unit')).toHaveValue('卷'));
  expect(screen.getByText('每卷長度(m)')).toBeInTheDocument();
  expect(input('length')).toHaveAttribute('placeholder', '請輸入每卷長度(m)');
  expect(screen.getByText('每卷單價')).toBeInTheDocument();
  expect(screen.getByText('採購卷數')).toBeInTheDocument();
  expect(input('quantity')).toHaveAttribute('placeholder', '請輸入採購卷數');
  expect(screen.queryByText('片料長度(mm)')).not.toBeInTheDocument();
  expect(screen.queryByText('單價 (pcs)')).not.toBeInTheDocument();
};

describe('PurchaseOrderItemsTab 採購明細卷片連動', () => {
  it('新增片料後持續顯示 pcs 與片料欄位，小計不被重置', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /新增明細項目/ }));

    selectMaterial('OX-SS-0.1-S');
    await expectSheetPresentation();

    changeNumber('unitPrice', '25');
    changeNumber('quantity', '4');

    await waitFor(() => expect(input('subTotal')).toHaveValue('100'));
    await expectSheetPresentation();
    expect(input('subTotal')).toHaveValue('100');
  });

  it('同一新增表單在卷料、片料、卷料間切換時同步更新且保留小計', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: /新增明細項目/ }));

    selectMaterial('OX-SS-0.1-R');
    await expectRollPresentation();
    changeNumber('unitPrice', '1200');
    changeNumber('quantity', '3');
    await waitFor(() => expect(input('subTotal')).toHaveValue('3,600'));

    selectMaterial('OX-SS-0.1-S');
    await expectSheetPresentation();
    expect(input('subTotal')).toHaveValue('3,600');

    selectMaterial('OX-SS-0.1-R');
    await expectRollPresentation();
    expect(input('subTotal')).toHaveValue('3,600');
  });

  it('編輯既有片料與切換料號時欄位標示、單位及數值皆正確', async () => {
    renderTab(baseOrder([{
      lineNumber: '1',
      purchaseOrderType: 'Material',
      goodsCode: 'OX-SS-0.1-S',
      goodsName: '不鏽鋼片料',
      materialForm: 'S',
      unit: 'pcs',
      width: 500,
      length: 600,
      unitPrice: 25,
      quantity: 4,
      subTotal: 100,
      requestedDeliveryDate: '2026-11-20',
    }]));

    fireEvent.click(screen.getByRole('img', { name: 'edit' }).closest('button')!);
    await expectSheetPresentation();
    expect(input('unitPrice')).toHaveValue('25');
    expect(input('quantity')).toHaveValue('4');
    expect(input('subTotal')).toHaveValue('100');

    selectMaterial('OX-SS-0.1-R');
    await expectRollPresentation();
    expect(input('unitPrice')).toHaveValue('25');
    expect(input('quantity')).toHaveValue('4');
    expect(input('subTotal')).toHaveValue('100');
  });
});
