import { client } from '@/api/generated/client.gen';

export interface QueryDeletionAuditDto {
  page?: number;
  pageNumber?: number;
  pageSize?: number;
  sortRules?: string;
  SortRules?: string;
  startDate?: string;
  StartDate?: string;
  endDate?: string;
  EndDate?: string;
  actor?: string;
  Actor?: string;
  actorUserId?: number;
  ActorUserId?: number;
  entityType?: string;
  EntityType?: string;
  entityCode?: string;
  EntityCode?: string;
  relatedDocumentCode?: string;
  RelatedDocumentCode?: string;
  outcome?: string;
  Outcome?: string;
  deletionMode?: 'HardDelete' | 'SoftDelete' | string;
  DeletionMode?: 'HardDelete' | 'SoftDelete' | string;
  dateRange?: [string, string] | any[];
  [key: string]: any;
}

export interface DeletionAuditDto {
  id?: number;
  eventId: string;
  eventVersion: number;
  occurredAtUtc: string;
  eventType: string;
  outcome: string;
  actorUserId?: number | null;
  actorName?: string | null;
  entityType: string;
  entityCode?: string | null;
  deletionMode?: 'HardDelete' | 'SoftDelete' | string | null;
  relatedDocumentCode?: string | null;
  detailLineNumber?: string | null;
  correlationId: string;
  transactionId?: string | null;
  source: string;
  beforeSnapshotJson?: string | null;
  failureReason?: string | null;
}

export interface PagedResult<T> {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  data: T[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data: T;
}

export async function getDeletionAudits(
  query: QueryDeletionAuditDto,
  signal?: AbortSignal
): Promise<ApiResponse<PagedResult<DeletionAuditDto>>> {
  const normalizedQuery: Record<string, any> = {
    pageNumber: query.pageNumber ?? query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    SortRules: query.SortRules ?? query.sortRules,
    StartDate: query.StartDate ?? query.startDate,
    EndDate: query.EndDate ?? query.endDate,
    Actor: query.Actor ?? query.actor,
    ActorUserId: query.ActorUserId ?? query.actorUserId,
    EntityType: query.EntityType ?? query.entityType,
    EntityCode: query.EntityCode ?? query.entityCode,
    RelatedDocumentCode: query.RelatedDocumentCode ?? query.relatedDocumentCode,
    Outcome: query.Outcome ?? query.outcome,
    DeletionMode: query.DeletionMode ?? query.deletionMode,
  };

  Object.keys(normalizedQuery).forEach((key) => {
    if (normalizedQuery[key] === undefined || normalizedQuery[key] === null || normalizedQuery[key] === '') {
      delete normalizedQuery[key];
    }
  });

  const response = await client.get<ApiResponse<PagedResult<DeletionAuditDto>>, unknown, true>({
    url: '/api/v1/AuditEvent/deletions',
    query: normalizedQuery,
    signal,
    throwOnError: true,
  });

  return response.data;
}
