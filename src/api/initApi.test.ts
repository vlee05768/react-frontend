import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import { client } from './generated/client.gen';
import { initializeApi } from './initApi';

describe('initializeApi', () => {
  it('應將 Dayjs 日期區間序列化為重複的 YYYY-MM-DD 查詢參數', () => {
    initializeApi();

    const serializer = client.instance.defaults.paramsSerializer as {
      serialize: (params: Record<string, unknown>) => string;
    };

    expect(serializer.serialize({
      orderDate: [dayjs('2026-08-01'), dayjs('2026-09-29')],
    })).toBe('orderDate=2026-08-01&orderDate=2026-09-29');
  });
});
