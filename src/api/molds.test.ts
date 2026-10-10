import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { client } from './generated/client.gen';
import { getMolds, type MoldListRecord, type MoldListResponse } from './molds';

const originalConfig = client.getConfig();
afterEach(() => { client.setConfig(originalConfig); });

describe('typed mold list response without generated SDK edits', () => {
  it('preserves paged response and readonly nullable counts in one existing list request', async () => {
    const body: MoldListResponse = {
      success: true, message: '操作成功',
      data: { pageNumber: 1, pageSize: 20, totalPages: 1, totalRecords: 4, data: [
        { code: 'M-001', relatedProductCount: 7 },
        { code: 'M-002', relatedProductCount: 0 },
        { code: 'M-003', relatedProductCount: null },
        { code: 'M-004' },
      ] },
    };
    const adapter = vi.fn(async (config) => ({ data: body, status: 200, statusText: 'OK', headers: {}, config }));
    client.setConfig({ adapter, baseURL: '' });
    const signal = new AbortController().signal;
    const result = await getMolds({ pageNumber: 1, pageSize: 20 }, signal);
    expect(result).toEqual(body);
    expect(result.data.data.map((record) => record.relatedProductCount)).toEqual([7, 0, null, undefined]);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].url).toBe('/api/v1/Mold?pageNumber=1&pageSize=20');
    expect(adapter.mock.calls[0][0].signal).toBe(signal);
    expectTypeOf(result.data.data[0].relatedProductCount).toEqualTypeOf<number | null | undefined>();
    expectTypeOf<Pick<MoldListRecord, 'relatedProductCount'>>().toEqualTypeOf<{ relatedProductCount?: number | null }>();
  });
});
