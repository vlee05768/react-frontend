import { apiClient } from '@/api/client';
import type { ApiResponse } from './workOrderWorkflowApi';

export type SettlementOutputType = 'P' | 'M';

export interface WorkOrderCostSettlementRequestDto {
  startDate?: string | null;
  endDate?: string | null;
  outputType?: SettlementOutputType | null;
  outputCode?: string | null;
  workOrderNumbers?: string[] | null;
}

export interface SettledWorkOrderCostItemDto {
  workOrderNumber: string;
  workOrderType: string;
  outputType: SettlementOutputType;
  outputCode: string;
  outputName: string | null;
  materialForm: 'R' | 'S' | null;
  warehousingCompleteDate: string | null;
  goodQuantity: number;
  isAllScrapped: boolean;
  previousActualMaterialCost: number;
  actualMaterialCost: number;
  previousUnitMaterialCost: number;
  unitMaterialCost: number;
  costPerSqm: number | null;
  costPerPiece: number | null;
  isUpstreamTraced: boolean;
  isDownstreamSynced: boolean;
}

export type SkippedWorkOrderReasonCode =
  | 'PENDING_WIP_ROLLS'
  | 'MISSING_CONFIRMED_REQUISITION'
  | 'PENDING_QC_INSPECTION'
  | 'PENDING_IQC_INSPECTION'
  | 'UPSTREAM_SEMI_UNSETTLED';

export interface SkippedWorkOrderCostItemDto {
  workOrderNumber: string;
  workOrderType: string;
  outputType: SettlementOutputType;
  outputCode: string;
  outputName: string | null;
  warehousingCompleteDate: string | null;
  reasonCode: SkippedWorkOrderReasonCode;
  reasonMessage: string;
}

export interface UpdatedProductCostItemDto {
  productCode: string;
  productName: string | null;
  previousUnitCost: number;
  updatedUnitCost: number;
  windowGoodQuantity: number;
  windowTotalMaterialCost: number;
}

export interface WorkOrderCostSettlementResultDto {
  isPreview: boolean;
  recentCostWindowDays: number;
  settledCount: number;
  skippedCount: number;
  upstreamTracedCount: number;
  downstreamSyncedCount: number;
  updatedProductCount: number;
  settledItems: SettledWorkOrderCostItemDto[];
  skippedItems: SkippedWorkOrderCostItemDto[];
  updatedProducts: UpdatedProductCostItemDto[];
}

export async function previewWorkOrderCostSettlement(
  payload: WorkOrderCostSettlementRequestDto,
): Promise<WorkOrderCostSettlementResultDto> {
  const res = await apiClient.post<ApiResponse<WorkOrderCostSettlementResultDto>>(
    '/api/v1/WorkOrderCostSettlement/preview',
    payload,
  );
  return res.data.data;
}

export async function executeWorkOrderCostSettlement(
  payload: WorkOrderCostSettlementRequestDto,
): Promise<WorkOrderCostSettlementResultDto> {
  const res = await apiClient.post<ApiResponse<WorkOrderCostSettlementResultDto>>(
    '/api/v1/WorkOrderCostSettlement/execute',
    payload,
  );
  return res.data.data;
}
