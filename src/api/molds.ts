import { getApiV1Mold } from './generated/sdk.gen';
import type { GetApiV1MoldData, MoldDto } from './generated/types.gen';

/** CONTEXT.md §7.3.2 additive readonly field, pending managed SDK regeneration. */
export type MoldListRecord = MoldDto & {
  readonly relatedProductCount?: number | null;
};

export interface MoldListPage {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  data: MoldListRecord[];
}

export interface MoldListResponse {
  success: boolean;
  message: string | null;
  data: MoldListPage;
}

export async function getMolds(query: GetApiV1MoldData['query'], signal: AbortSignal): Promise<MoldListResponse> {
  const response = await getApiV1Mold({ query, signal, throwOnError: true });
  // Generated GET currently describes data as unknown (ObjectApiResponse).
  // Keep the SDK transport; explicitly describe the documented paged response.
  return response.data as MoldListResponse;
}
