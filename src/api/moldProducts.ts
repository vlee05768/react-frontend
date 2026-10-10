import { getApiV1MoldByCodeProducts } from './generated/sdk.gen';
import type { MoldProductDto, MoldProductDtoPagedResult } from './generated/types.gen';

export type MoldProduct = MoldProductDto;
export type MoldProductPage = MoldProductDtoPagedResult;

export interface MoldProductsResponse {
  success: boolean;
  code: number;
  message: string;
  data: MoldProductPage;
  errors: unknown;
}

export async function getMoldProducts(code: string, pageNumber: number, signal: AbortSignal): Promise<MoldProductPage> {
  const response = await getApiV1MoldByCodeProducts({
    path: { code },
    query: { pageNumber, pageSize: 100 },
    signal,
    throwOnError: true,
  });
  if (!response.data?.success || !response.data.data) throw new Error(response.data?.message ?? '取得模具關聯產品失敗');
  return response.data.data;
}
