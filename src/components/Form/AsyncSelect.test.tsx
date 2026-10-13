import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type React from 'react';
import { AsyncSelect } from './AsyncSelect';
import { AUTO_COMPLETE_REGISTRY } from '@/config/autoCompleteRegistry';

vi.mock('@/config/autoCompleteRegistry', () => ({
  AUTO_COMPLETE_REGISTRY: {
    TEST_SUPPLIER: {
      queryFn: vi.fn(async (keyword: string) => [{ supplierCode: 'SUP-001', name: keyword }]),
      fieldNames: { label: 'name', value: 'supplierCode' },
      triggerLength: 2,
    },
  },
}));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

function renderSelect(props: Partial<React.ComponentProps<typeof AsyncSelect>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AsyncSelect configKey={'TEST_SUPPLIER' as keyof typeof AUTO_COMPLETE_REGISTRY} {...props} />
    </QueryClientProvider>,
  );
}

describe('AsyncSelect', () => {
  it('shows the minimum search length state before querying', () => {
    renderSelect();

    fireEvent.mouseDown(screen.getByRole('combobox'));

    expect(screen.getByText('請至少輸入 2 個字元，以啟動搜尋')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /更新選項/ })).toBeDisabled();
    expect((AUTO_COMPLETE_REGISTRY.TEST_SUPPLIER.queryFn as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('provides a manual refresh button that refetches the active search', async () => {
    renderSelect();
    const input = screen.getByRole('combobox');

    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: 'ab' } });

    await waitFor(() => expect(AUTO_COMPLETE_REGISTRY.TEST_SUPPLIER.queryFn).toHaveBeenCalledWith('ab', undefined));
    const callsBeforeRefresh = (AUTO_COMPLETE_REGISTRY.TEST_SUPPLIER.queryFn as ReturnType<typeof vi.fn>).mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: /更新選項/ }));

    await waitFor(() => expect(AUTO_COMPLETE_REGISTRY.TEST_SUPPLIER.queryFn).toHaveBeenCalledTimes(callsBeforeRefresh + 1));
  });

  it('keeps the refresh action when a caller customizes popup rendering', () => {
    renderSelect({ popupRender: (menu) => <div data-testid="custom-popup">{menu}</div> });

    fireEvent.mouseDown(screen.getByRole('combobox'));

    expect(screen.getByTestId('custom-popup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /更新選項/ })).toBeInTheDocument();
  });

  it('keeps the refresh action in a dedicated popup footer', () => {
    renderSelect();

    fireEvent.mouseDown(screen.getByRole('combobox'));

    const footer = screen.getByTestId('async-select-refresh-footer');
    expect(footer).toContainElement(screen.getByRole('button', { name: /更新選項/ }));
    expect(screen.getByTestId('async-select-popup')).toContainElement(footer);
  });

  it('can hide the manual refresh action when explicitly disabled', () => {
    renderSelect({ showRefresh: false });

    fireEvent.mouseDown(screen.getByRole('combobox'));

    expect(screen.queryByRole('button', { name: /更新選項/ })).not.toBeInTheDocument();
  });
});
