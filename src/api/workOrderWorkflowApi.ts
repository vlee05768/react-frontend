import { apiClient } from '@/api/client';
import type { WorkOrderDto, WorkOrderMaterialDto, WorkOrderPersonnelHourDto } from '@/api/generated/types.gen';

export interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  data: T;
  errors?: unknown;
  errorCode?: string | null;
  correlationId?: string | null;
}

export type MaterialFormType = 'R' | 'S';

export interface AvailableMaterialWidthDto {
  widthMm: number;
  lengthMm: number | null;
  materialForm: MaterialFormType;
  availableRollCount: number;
  availableQuantity: number;
  availableAreaSqm: number;
}

export interface WorkOrderMaterialExtendedDto extends Omit<WorkOrderMaterialDto, 'materialForm'> {
  bomWidth?: number;
  bomRequiredQuantity?: number;
  materialForm?: MaterialFormType | null;
}

export interface WorkOrderExtendedDto extends Omit<WorkOrderDto, 'items'> {
  materialSpecConfirmDate?: string | null;
  materialSpecConfirmUser?: string | null;
  isAllMaterialConsumed?: boolean;
  actualMaterialCost?: number;
  unitMaterialCost?: number;
  items?: WorkOrderMaterialExtendedDto[];
}

export interface CreateWorkOrderMaterialPayload {
  materialCode: string;
  materialName?: string | null;
  materialWidth: number;
  requiredAmount: number;
  totalLength: number;
  specification?: string | null;
  storageCode?: string | null;
}

export interface UpdateWorkOrderMaterialPayload {
  materialCode?: string | null;
  materialName?: string | null;
  materialWidth?: number | null;
  requiredAmount?: number | null;
  totalLength?: number | null;
  specification?: string | null;
  storageCode?: string | null;
}

export interface SemiFinishedPackagePayload {
  packageSeq: string;
  materialForm: MaterialFormType;
  measuredWidthMm: number;
  measuredLength?: number | null;
  quantity: number;
}

export interface ProductionCompletePayload {
  defectReason?: string | null;
  productionDate?: string | null;
  actualQuantity: number;
  storageCode?: string | null;
  notes?: string | null;
  personnelWorkingHours?: WorkOrderPersonnelHourDto[] | null;
  semiFinishedPackages?: SemiFinishedPackagePayload[] | null;
  isAllMaterialConsumed?: boolean | null;
}

export interface RequisitionFifoRollDto {
  rollNo: string;
  widthMm: number;
  qtyAux: number;
  costPerSqm?: number;
}

export interface SelectableRollItemDto {
  rollNo: string;
  lotNo?: string | null;
  currentQtyAux: number;
  widthMm: number;
  measuredThicknessMm?: number | null;
  checkDate?: string | null;
  costPerSqm?: number;
  matchStatus: 'Exact' | 'Wider' | 'Narrower' | string;
}

export async function getAvailableMaterialWidths(
  workOrderNumber: string,
  materialCode: string,
): Promise<AvailableMaterialWidthDto[]> {
  const res = await apiClient.get<ApiResponse<AvailableMaterialWidthDto[]>>(
    `/api/v1/WorkOrder/${encodeURIComponent(workOrderNumber)}/materials/${encodeURIComponent(materialCode)}/available-widths`,
  );
  return res.data.data ?? [];
}

export async function createWorkOrderMaterial(
  workOrderNumber: string,
  payload: CreateWorkOrderMaterialPayload,
): Promise<WorkOrderMaterialExtendedDto> {
  const res = await apiClient.post<ApiResponse<WorkOrderMaterialExtendedDto>>(
    `/api/v1/WorkOrder/${encodeURIComponent(workOrderNumber)}/materials`,
    payload,
  );
  return res.data.data;
}

export async function updateWorkOrderMaterialByLine(
  workOrderNumber: string,
  lineNumber: string,
  payload: UpdateWorkOrderMaterialPayload,
): Promise<WorkOrderMaterialExtendedDto> {
  const res = await apiClient.put<ApiResponse<WorkOrderMaterialExtendedDto>>(
    `/api/v1/WorkOrder/${encodeURIComponent(workOrderNumber)}/materials/line/${encodeURIComponent(lineNumber)}`,
    payload,
  );
  return res.data.data;
}

export async function deleteWorkOrderMaterialByLine(
  workOrderNumber: string,
  lineNumber: string,
): Promise<void> {
  await apiClient.delete<ApiResponse<unknown>>(
    `/api/v1/WorkOrder/${encodeURIComponent(workOrderNumber)}/materials/line/${encodeURIComponent(lineNumber)}`,
  );
}

export async function confirmWorkOrderMaterialSpec(
  workOrderNumber: string,
): Promise<WorkOrderExtendedDto> {
  const res = await apiClient.post<ApiResponse<WorkOrderExtendedDto>>(
    `/api/v1/WorkOrder/${encodeURIComponent(workOrderNumber)}/material-spec-confirm`,
  );
  return res.data.data;
}

export async function cancelWorkOrderMaterialSpec(
  workOrderNumber: string,
): Promise<WorkOrderExtendedDto> {
  const res = await apiClient.post<ApiResponse<WorkOrderExtendedDto>>(
    `/api/v1/WorkOrder/${encodeURIComponent(workOrderNumber)}/material-spec-confirm/cancel`,
  );
  return res.data.data;
}

export async function completeWorkOrderProduction(
  workOrderNumber: string,
  payload: ProductionCompletePayload,
): Promise<WorkOrderExtendedDto> {
  const res = await apiClient.post<ApiResponse<WorkOrderExtendedDto>>(
    `/api/v1/WorkOrder/${encodeURIComponent(workOrderNumber)}/production-complete`,
    payload,
  );
  return res.data.data;
}

export async function getFifoAllocatedRolls(params: {
  materialCode: string;
  requiredLength: number;
  requiredWidth?: number;
  workOrderNumber?: string;
}): Promise<RequisitionFifoRollDto[]> {
  const res = await apiClient.get<ApiResponse<RequisitionFifoRollDto[]>>(
    '/api/v1/WorkOrderRequisition/fifo',
    { params },
  );
  return res.data.data ?? [];
}

export async function getSelectableRolls(params: {
  materialCode: string;
  requiredWidth?: number;
  workOrderNumber?: string;
}): Promise<SelectableRollItemDto[]> {
  const res = await apiClient.get<ApiResponse<SelectableRollItemDto[]>>(
    '/api/v1/WorkOrderRequisition/selectable-rolls',
    { params },
  );
  return res.data.data ?? [];
}
