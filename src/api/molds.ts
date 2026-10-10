import { getApiV1Mold } from './generated/sdk.gen';
import type { GetApiV1MoldData, MoldDto } from './generated/types.gen';

/** The generated contract now includes the additive related-product count. */
export type MoldListRecord = MoldDto;

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
