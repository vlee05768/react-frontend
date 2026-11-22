import { createListQueryStore } from './useListQueryStore';

export const useUserQueryStore = createListQueryStore('user', {
  name: '',
});

export const useRoleQueryStore = createListQueryStore('role', {});

export const useDeletionAuditQueryStore = createListQueryStore('deletionAudit', {
  StartDate: undefined,
  EndDate: undefined,
  Actor: undefined,
  ActorUserId: undefined,
  EntityType: undefined,
  EntityCode: undefined,
  RelatedDocumentCode: undefined,
  Outcome: undefined,
  DeletionMode: undefined,
  dateRange: undefined,
});
