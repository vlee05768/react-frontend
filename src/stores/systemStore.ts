import { createListQueryStore } from './useListQueryStore';

export const useUserQueryStore = createListQueryStore('user', {
  name: '',
});

export const useRoleQueryStore = createListQueryStore('role', {});
