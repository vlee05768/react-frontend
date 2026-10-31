import { cleanup, render, screen } from '@testing-library/react';
import { App } from 'antd';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { getIqcFormFields, mainTableColumns } from './IqcConfig';

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(cleanup);

it('shows unset and disables production specification inputs in the actual form', () => {
  const fields = getIqcFormFields({ isRollMaterial: true, isReadOnly: false, detail: { inspectionType: 'Production' }, setRolls: vi.fn(), inspectorId: '', setInspectorId: vi.fn(), headerCoreDia: null, setHeaderCoreDia: vi.fn(), incomingStorageCode: '', setIncomingStorageCode: vi.fn(), totalLength: null });
  render(<App><DynamicForm fields={fields.filter(f => ['standardThickness', 'standardWidth', 'standardLength', 'totalActualQty'].includes(f.name))} defaultValues={{}} onSubmit={() => {}} /></App>);
  const inputs = screen.getAllByPlaceholderText('未設定');
  expect(inputs).toHaveLength(3);
  inputs.forEach(input => expect(input).toBeDisabled());
  expect(screen.getByDisplayValue('未設定')).toBeDisabled();
});

it('does not present Production list values as a specification', () => {
  const column = mainTableColumns().find(c => c.name === 'standardSpec')!;
  expect(column.render!(null, { inspectionType: 'Production', standardWidth: 150, standardLength: 300 }, 0)).toBe('未設定');
});
