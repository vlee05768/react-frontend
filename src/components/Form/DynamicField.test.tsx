import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useForm } from 'react-hook-form';
import { DynamicField } from './DynamicField';
import type { FieldConfig } from './types';

vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

vi.mock('@/config/autoCompleteRegistry', () => ({
  AUTO_COMPLETE_REGISTRY: {
    TEST_SUPPLIER: {
      queryFn: vi.fn(async () => [{ supplierCode: 'SUP-001', name: '測試供應商' }]),
      fieldNames: { label: 'name', value: 'supplierCode' },
      triggerLength: 2,
    },
  },
}));

function renderAsyncField(clearErrors: ReturnType<typeof vi.fn>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const config = {
    name: 'supplierCode',
    label: '供應商',
    componentType: 'AsyncSelect',
    componentProps: { configKey: 'TEST_SUPPLIER' },
    required: true,
  } as FieldConfig<any>;

  function Harness() {
    const methods = useForm({ defaultValues: { supplierCode: '' } });
    return (
      <DynamicField
        config={config}
        control={methods.control as any}
        setValue={methods.setValue}
        clearErrors={clearErrors as any}
        trigger={methods.trigger}
        context={{ values: methods.watch() }}
      />
    );
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe('DynamicField AsyncSelect validation state', () => {
  it('clears the previous validation error when a valid option is selected', async () => {
    const clearErrors = vi.fn();
    renderAsyncField(clearErrors);

    const input = screen.getByRole('combobox');
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: 'su' } });

    await waitFor(() => expect(screen.getByText('SUP-001 (測試供應商)')).toBeInTheDocument());
    fireEvent.click(screen.getByText('SUP-001 (測試供應商)'));

    expect(clearErrors).toHaveBeenCalledWith('supplierCode');
  });
});
