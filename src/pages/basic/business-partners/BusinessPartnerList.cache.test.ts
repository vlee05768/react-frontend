import { describe, expect, it, vi } from 'vitest';
import {
  SUPPLIER_AUTOCOMPLETE_KEYS,
  invalidateSupplierAutocompleteQueries,
} from './BusinessPartnerList';

describe('business partner supplier autocomplete cache', () => {
  it('invalidates all supplier autocomplete query prefixes after a successful mutation', () => {
    const invalidateQueries = vi.fn();

    invalidateSupplierAutocompleteQueries({ invalidateQueries } as never);

    expect(invalidateQueries.mock.calls).toEqual(
      SUPPLIER_AUTOCOMPLETE_KEYS.map((configKey) => [{ queryKey: ['async-select', configKey] }]),
    );
  });
});
