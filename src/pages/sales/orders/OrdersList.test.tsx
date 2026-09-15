import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import OrdersList from './OrdersList';
import useOrderQueryStore from './useOrderQueryStore';

const { getOrders } = vi.hoisted(() => ({
  getOrders: vi.fn(),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    Modal: ({ open, children, footer }: any) => open ? <div role="dialog">{children}{footer}</div> : null,
  };
});

vi.mock('@/api/generated/sdk.gen', () => ({
  getApiV1Orders: getOrders,
  deleteApiV1OrdersByOrderNumber: vi.fn(),
}));

vi.mock('@/components/common/PageCard', () => ({
  default: ({ children, extra }: { children: React.ReactNode; extra: React.ReactNode }) => <div>{extra}{children}</div>,
}));

vi.mock('@/components/Form/DynamicSearchForm', () => ({
  default: ({ onSearch }: { onSearch: (values: unknown) => void }) => (
    <form id="search-form" onSubmit={(event) => {
      event.preventDefault();
      onSearch({
        orderDate: [dayjs('2026-08-01'), dayjs('2026-09-29')],
      });
    }}>
      <label htmlFor="order-date-range">訂單日期</label>
      <input id="order-date-range" value="2026-08-01 至 2026-09-29" readOnly />
    </form>
  ),
}));

vi.mock('@/components/Table/StandardErpTable', () => ({
  default: () => <div />,
}));

vi.mock('@/components/Table/ActiveQueryAndSortTags', () => ({
  default: () => null,
}));

vi.mock('@/components/common/DocumentWatchButton', () => ({
  DocumentWatchButton: () => null,
}));

vi.mock('@/hooks/useUrlQuerySync', () => ({
  useUrlQuerySync: () => undefined,
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ hasPermission: () => false }),
}));

describe('OrdersList', () => {
  afterEach(() => {
    getOrders.mockClear();
    useOrderQueryStore.getState().resetParams();
  });

  it('執行訂單日期區間查詢時，應以 YYYY-MM-DD 日期傳送給訂單 API', async () => {
    getOrders.mockResolvedValue({ data: { data: [], totalRecords: 0 } });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter>
        <App>
          <QueryClientProvider client={queryClient}>
            <OrdersList />
          </QueryClientProvider>
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => expect(getOrders).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /查詢$/ }));
    expect(await screen.findByLabelText('訂單日期')).toHaveValue('2026-08-01 至 2026-09-29');
    await user.click(screen.getByRole('button', { name: /執行查詢$/ }));

    await waitFor(() => expect(getOrders).toHaveBeenCalledTimes(2));
    expect(getOrders).toHaveBeenLastCalledWith({
      query: expect.objectContaining({
        orderDate: ['2026-08-01', '2026-09-29'],
      }),
    });
  });
});
