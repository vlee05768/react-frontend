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

it.each([['R', 'm'], ['S', 'mm']])('顯示 Production %s 快照尺寸及單位', (materialForm, unit) => {
  const column = mainTableColumns().find(c => c.name === 'standardSpec')!;
  const result = column.render!(null, { inspectionType: 'Production', materialForm, standardWidth: 150, standardLength: 300 }, 0);
  render(<>{result}</>);
  expect(screen.getByText('150 mm')).toBeTruthy();
  expect(screen.getByText(`300 ${unit}`)).toBeTruthy();
});

it.each([[null, 300], [150, null], [null, null]])('Production 快照缺少尺寸時顯示未設定', (standardWidth, standardLength) => {
  const column = mainTableColumns().find(c => c.name === 'standardSpec')!;
  expect(column.render!(null, { inspectionType: 'Production', standardWidth, standardLength }, 0)).toBe('未設定');
});

it('非 Production 缺少尺寸時維持原有顯示', () => {
  const column = mainTableColumns().find(c => c.name === 'standardSpec')!;
  expect(column.render!(null, { inspectionType: 'Purchase', standardWidth: null, standardLength: 300 }, 0)).toBe('-');
});
