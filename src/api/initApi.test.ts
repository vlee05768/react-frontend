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

  it('重複初始化不會重複註冊 request/response interceptors', () => {
    const requestHandlers = (client.instance.interceptors.request as unknown as { handlers: unknown[] }).handlers;
    const responseHandlers = (client.instance.interceptors.response as unknown as { handlers: unknown[] }).handlers;
    const requestCount = requestHandlers.length;
    const responseCount = responseHandlers.length;

    initializeApi();
    initializeApi();

    expect(requestHandlers.length).toBe(requestCount);
    expect(responseHandlers.length).toBe(responseCount);
  });
});
