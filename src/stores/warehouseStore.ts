import { createListQueryStore } from './useListQueryStore';

export const useStorageQueryStore = createListQueryStore('storage', {
  CodeOrName: '',
  Type: null,
  Location: null,
  IsActive: null,
});
