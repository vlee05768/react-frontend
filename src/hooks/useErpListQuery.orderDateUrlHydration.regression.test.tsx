import { Modal } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import DynamicSearchForm from '@/components/Form/DynamicSearchForm';
import { useErpListQuery } from './useErpListQuery';

const orderDateSearchConfig = [{
  name: 'orderDate',
  label: '訂單日期',
  componentType: 'DateRangePicker' as const,
  colSpan: 2,
}];

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

afterAll(() => vi.unstubAllGlobals());

function 訂單日期查詢測試頁() {
  const [params, setStoredParams] = useState<Record<string, unknown>>({
    pageNumber: 1,
    pageSize: 20,
  });
  const listQuery = useErpListQuery({
    params,
    setParams: (nextParams) => setStoredParams((currentParams) => ({
      ...currentParams,
      ...nextParams,
    })),
    searchConfig: orderDateSearchConfig,
  });

  return (
    <>
      <output data-testid="已還原的訂單日期">{JSON.stringify(params.orderDate)}</output>
      <button type="button" onClick={listQuery.openSearchModal}>查詢</button>
      <Modal open={listQuery.isSearchModalOpen} footer={null}>
        <DynamicSearchForm config={orderDateSearchConfig} form={listQuery.searchForm} />
      </Modal>
    </>
  );
}

describe('useErpListQuery orderDate URL hydration regression', () => {
  it('將重複 orderDate URL 參數帶入查詢視窗的實際 AntD RangePicker 時會觸發 isValid error', async () => {
    render(
      <MemoryRouter initialEntries={[
        '/sales/orders?page=1&pageSize=20&orderDate=2026-08-01&orderDate=2026-09-29',
      ]}>
        <訂單日期查詢測試頁 />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('已還原的訂單日期')).toHaveTextContent(
        '["2026-08-01","2026-09-29"]',
      );
    });

    await userEvent.setup().click(screen.getByRole('button', { name: '查詢' }));
  });
});
