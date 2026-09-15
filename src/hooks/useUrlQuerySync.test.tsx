import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useUrlQuerySync } from './useUrlQuerySync';

type 查詢條件 = {
  orderDate?: string[];
  keyword?: string;
  isClosed?: boolean;
};

function 查詢同步測試元件({
  初始查詢條件,
  初始頁碼 = 1,
  初始每頁筆數 = 20,
}: {
  初始查詢條件: 查詢條件;
  初始頁碼?: number;
  初始每頁筆數?: number;
}) {
  const [query, setStoredQuery] = useState(初始查詢條件);
  const [pagination, setStoredPagination] = useState({
    page: 初始頁碼,
    pageSize: 初始每頁筆數,
  });
  const location = useLocation();

  useUrlQuerySync({
    query,
    page: pagination.page,
    pageSize: pagination.pageSize,
    setQuery: (nextQuery) => setStoredQuery((currentQuery) => ({ ...currentQuery, ...nextQuery })),
    setPagination: (page, pageSize) => setStoredPagination({ page, pageSize }),
  });

  return (
    <>
      <output data-testid="網址查詢字串">{location.search}</output>
      <output data-testid="查詢條件">{JSON.stringify(query)}</output>
      <output data-testid="分頁">{JSON.stringify(pagination)}</output>
    </>
  );
}

describe('useUrlQuerySync', () => {
  it('應以重複參數同步日期區間，並在重新掛載時完整還原陣列', async () => {
    const 日期區間 = ['2026-07-01', '2026-09-30'];
    const 預期網址 = '?page=6&pageSize=20&orderDate=2026-07-01&orderDate=2026-09-30';

    const 初次掛載 = render(
      <MemoryRouter initialEntries={['/orders']}>
        <查詢同步測試元件
          初始查詢條件={{ orderDate: 日期區間 }}
          初始頁碼={6}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('網址查詢字串')).toHaveTextContent(預期網址);
    });
    初次掛載.unmount();

    render(
      <MemoryRouter initialEntries={[`/orders${預期網址}`]}>
        <查詢同步測試元件 初始查詢條件={{}} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('查詢條件')).toHaveTextContent(JSON.stringify({ orderDate: 日期區間 }));
      expect(screen.getByTestId('分頁')).toHaveTextContent(JSON.stringify({ page: 6, pageSize: 20 }));
      expect(screen.getByTestId('網址查詢字串')).toHaveTextContent(預期網址);
    });
  });

  it('應忽略歷史逗號串接的日期區間，且保留標量與布林查詢條件', async () => {
    render(
      <MemoryRouter initialEntries={['/orders?page=6&pageSize=50&keyword=急件&isClosed=false&orderDate=2026-07-01%2C2026-09-30']}>
        <查詢同步測試元件 初始查詢條件={{}} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('查詢條件')).toHaveTextContent(JSON.stringify({ keyword: '急件', isClosed: false }));
      expect(screen.getByTestId('分頁')).toHaveTextContent(JSON.stringify({ page: 6, pageSize: 50 }));
      expect(screen.getByTestId('網址查詢字串')).not.toHaveTextContent('orderDate=');
    });
  });
});
