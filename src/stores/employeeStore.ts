import { createListQueryStore } from './useListQueryStore';

export const useEmployeeQueryStore = createListQueryStore('employee', {
  employeeNo: '',
  name: '',
  status: null,
  departmentCode: null,
});
