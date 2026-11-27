import { client } from '@/api/generated/client.gen';

export interface MaterialEstimatedCostRecalculationItemDto {
  materialCode: string;
  materialName?: string | null;
  previousUnitPrice: number;
  updatedUnitPrice: number;
  windowTotalAmount: number;
  windowTotalAreaSqm: number;
  hasInboundData: boolean;
}

export interface MaterialEstimatedCostRecalculationResultDto {
  recentCostWindowDays: number;
  processedCount: number;
  updatedCount: number;
  preservedCount: number;
  items: MaterialEstimatedCostRecalculationItemDto[];
}

export interface MaterialEstimatedCostRecalculationApiResponse {
  success?: boolean;
  message?: string | null;
  data?: MaterialEstimatedCostRecalculationResultDto;
}

export const recalculateAllMaterialEstimatedCosts = () =>
  client.post<MaterialEstimatedCostRecalculationApiResponse, unknown>({
    responseType: 'json',
    security: [{ name: 'Authorization', type: 'apiKey' },],
    url: '/api/v1/Material/recalculate-estimated-cost',
  });

export const recalculateMaterialEstimatedCost = (code: string) =>
  client.post<MaterialEstimatedCostRecalculationApiResponse, unknown>({
    responseType: 'json',
    security: [{ name: 'Authorization', type: 'apiKey' },],
    url: `/api/v1/Material/${encodeURIComponent(code)}/recalculate-estimated-cost`,
  });

export const getEstimatedCostRecalculationMessage = (
  result: MaterialEstimatedCostRecalculationResultDto,
): string => `近 ${result.recentCostWindowDays} 天估算成本重算完成：已更新 ${result.updatedCount} 筆，無進貨資料保留原值 ${result.preservedCount} 筆（處理 ${result.processedCount} 筆）。`;
