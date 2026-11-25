import { App } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBrandModels } from './useBrandModels';

const { createGeneralType } = vi.hoisted(() => ({ createGeneralType: vi.fn() }));

vi.mock('@/api/generated', () => ({
  getApiV1GeneralTypes: vi.fn().mockResolvedValue({ data: { success: true, data: { data: [] } } }),
  deleteApiV1GeneralTypesById: vi.fn(),
  putApiV1GeneralTypesById: vi.fn(),
  postApiV1GeneralTypes: createGeneralType,
}));
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: () => ({ hasPermission: () => true }) }));

function Harness() {
  const hook = useBrandModels();
  return (
    <>
      <button onClick={hook.handleAddBrand}>新增廠牌</button>
      <button onClick={() => { hook.brandForm.setFieldsValue({ code: 'DUPLICATE', desc: '測試' }); void hook.onBrandModalOk(); }}>送出廠牌</button>
      <button onClick={() => hook.setSelectedBrand({ code: 'BRAND' })}>選擇廠牌</button>
      <button onClick={hook.handleAddModel}>新增型號</button>
      <button onClick={() => { hook.modelForm.setFieldsValue({ code: 'DUPLICATE', desc: '測試' }); void hook.onModelModalOk(); }}>送出型號</button>
      <div data-testid="brand-modal-open">{String(hook.brandModalVisible)}</div>
      <div data-testid="model-modal-open">{String(hook.modelModalVisible)}</div>
    </>
  );
}

describe('useBrandModels mutation failures', () => {
  afterEach(() => createGeneralType.mockReset());

  it.each([
    ['brand', '送出廠牌', '新增廠牌', 'brand-modal-open'],
    ['model', '送出型號', '新增型號', 'model-modal-open'],
  ])('displays the API reason and keeps the %s dialog open on failure', async (_kind, submit, open, modalState) => {
    createGeneralType.mockRejectedValue({ response: { data: {
      message: '無法儲存，資料已存在或代碼重複。',
      errorCode: 'BUSINESS_RULE_ERROR',
      correlationId: 'qa-correlation-123',
    } } });

    render(<App><Harness /></App>);
    const user = userEvent.setup();
    if (submit === '送出型號') await user.click(screen.getByRole('button', { name: '選擇廠牌' }));
    await user.click(screen.getByRole('button', { name: open }));
    await user.click(screen.getByRole('button', { name: submit }));

    const notices = await screen.findAllByText(/無法儲存，資料已存在或代碼重複/);
    expect(notices.length).toBeGreaterThan(0);
    expect(document.body).toHaveTextContent('qa-correlation-123');
    expect(screen.getByTestId(modalState)).toHaveTextContent('true');
    await waitFor(() => expect(createGeneralType).toHaveBeenCalledOnce());
  });
});
