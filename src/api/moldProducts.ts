import { client } from './generated/client.gen';

/** Issue #77 / CONTEXT.md §7.3.2. Replace with SDK after managed regeneration. */
export interface MoldProduct {
  code: string;
  name: string | null;
}

export interface MoldProductPage {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  data: MoldProduct[];
}

export interface MoldProductsResponse {
  success: boolean;
  code: number;
  message: string;
  data: MoldProductPage;
  errors: unknown;
}

export async function getMoldProducts(code: string, pageNumber: number, signal: AbortSignal): Promise<MoldProductPage> {
  // Use the managed client method so baseURL/config and auth/error interceptors
  // are identical to generated SDK calls (not a second Axios client).
  const response = await client.get<{ 200: MoldProductsResponse }, unknown, true>({
    url: '/api/v1/Mold/{code}/products',
    path: { code },
    query: { pageNumber, pageSize: 100 },
    signal,
    throwOnError: true,
  });
  if (!response.data.success) throw new Error(response.data.message);
  return response.data.data;
}
