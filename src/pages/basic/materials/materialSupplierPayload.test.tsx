import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { mainFormConfig } from './MaterialConfig';

vi.mock('@/components/Form/FieldRegistry', () => ({
  FIELD_REGISTRY: {
    AsyncSelect: (props: { value?: string | null; onChange?: (value: string) => void }) => (
      <button type="button" onClick={() => props.onChange?.('SUP-001')}>
        select supplier ({props.value ?? 'none'})
      </button>
    ),
  },
}));

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
});

describe('material supplier edit payload', () => {
  it('keeps the selected supplierCode in the DynamicForm submit payload', async () => {
    const onSubmit = vi.fn();
    const supplierField = mainFormConfig().find((field) => field.name === 'supplierCode');

    expect(supplierField).toMatchObject({
      name: 'supplierCode',
      componentType: 'AsyncSelect',
      componentProps: { configKey: 'MATERIAL_SUPPLIER' },
    });

    render(
      <DynamicForm
        fields={[supplierField as any]}
        defaultValues={{ supplierCode: null }}
        isUpdateMode
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /select supplier/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /select supplier/ })).toHaveTextContent('SUP-001'));
    fireEvent.click(screen.getByRole('button', { name: /儲\s*存/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ supplierCode: 'SUP-001' }));
  });
});
