import { client } from '@/api/generated/client.gen';

/**
 * 暫時相容多態 BOM API；SDK 重新產生後改用產生的 BOM 函式與 DTO。
 */
export type BomOutputType = 'P' | 'M';

export interface BomItemContract {
  code: string;
  materialCode: string;
  materialName?: string | null;
  quantity: number;
  scrapPercentage?: number | null;
  width?: number | null;
  specification?: string | null;
  notes?: string | null;
}

export interface BomContract {
  outputType: BomOutputType;
  outputCode: string;
  outputName?: string | null;
  isActive: boolean;
  defaultMachineType?: string | null;
  defaultToolingRangeMm?: number | null;
  defaultPunchHolesCount?: number | null;
  pcsPerSheet?: number | null;
  notes?: string | null;
  items?: BomItemContract[];
}

export interface CreateBomPayload {
  outputType: BomOutputType;
  outputCode: string;
  defaultMachineType?: string | null;
  defaultToolingRangeMm?: number | null;
  defaultPunchHolesCount?: number | null;
  pcsPerSheet?: number | null;
  notes?: string | null;
}

export interface UpdateBomPayload {
  isActive?: boolean;
  defaultMachineType?: string | null;
  defaultToolingRangeMm?: number | null;
  defaultPunchHolesCount?: number | null;
  pcsPerSheet?: number | null;
  notes?: string | null;
}

export type BomItemPayload = Omit<BomItemContract, 'code' | 'materialName'>;

const bomPath = (outputType: BomOutputType, outputCode: string) =>
  `/api/v1/Bom/${encodeURIComponent(outputType)}/${encodeURIComponent(outputCode)}`;

export const getBom = (outputType: BomOutputType, outputCode: string) =>
  client.get<any, unknown>({
    responseType: 'json',
    security: [{ name: 'Authorization', type: 'apiKey' }],
    url: bomPath(outputType, outputCode),
  });

export const createBom = (body: CreateBomPayload) =>
  client.post<any, unknown>({
    body,
    headers: { 'Content-Type': 'application/json' },
    responseType: 'json',
    security: [{ name: 'Authorization', type: 'apiKey' }],
    url: '/api/v1/Bom',
  });

export const updateBom = (outputType: BomOutputType, outputCode: string, body: UpdateBomPayload) =>
  client.put<any, unknown>({
    body,
    headers: { 'Content-Type': 'application/json' },
    responseType: 'json',
    security: [{ name: 'Authorization', type: 'apiKey' }],
    url: bomPath(outputType, outputCode),
  });

export const createBomItem = (outputType: BomOutputType, outputCode: string, body: BomItemPayload) =>
  client.post<any, unknown>({
    body,
    headers: { 'Content-Type': 'application/json' },
    responseType: 'json',
    security: [{ name: 'Authorization', type: 'apiKey' }],
    url: `${bomPath(outputType, outputCode)}/items`,
  });

export const updateBomItem = (outputType: BomOutputType, outputCode: string, code: string, body: BomItemPayload) =>
  client.put<any, unknown>({
    body,
    headers: { 'Content-Type': 'application/json' },
    responseType: 'json',
    security: [{ name: 'Authorization', type: 'apiKey' }],
    url: `${bomPath(outputType, outputCode)}/items/${encodeURIComponent(code)}`,
  });

export const deleteBomItem = (outputType: BomOutputType, outputCode: string, code: string) =>
  client.delete<any, unknown>({
    responseType: 'json',
    security: [{ name: 'Authorization', type: 'apiKey' }],
    url: `${bomPath(outputType, outputCode)}/items/${encodeURIComponent(code)}`,
  });
