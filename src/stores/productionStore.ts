import { createListQueryStore } from './useListQueryStore';

export const useMoldQueryStore = createListQueryStore('mold', {
  CodeOrName: '',
  Type: null,
  SupplierCode: null,
  Shape: null,
});

export const useMachineQueryStore = createListQueryStore('machine', {
  CodeOrName: '',
});
