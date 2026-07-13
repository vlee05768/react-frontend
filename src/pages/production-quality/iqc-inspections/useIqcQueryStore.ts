import { createListQueryStore } from '@/stores/useListQueryStore';
import { type BaseQueryParams } from '@/stores/useListQueryStore';

export interface IqcQueryParams extends BaseQueryParams {
  iqcRecordId?: string;
  lotNo?: string;
  inspectionStatus?: string;
  materialCode?: string;
  checkDateRange?: any;
  inspectorId?: string;
}

export const useIqcQueryStore = createListQueryStore<IqcQueryParams>('iqcInspection', {
  iqcRecordId: undefined,
  lotNo: undefined,
  inspectionStatus: undefined,
  materialCode: undefined,
  checkDateRange: undefined,
  inspectorId: undefined,
});
