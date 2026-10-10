import { describe, expect, it } from 'vitest';
import { getApiErrorDetails, getApiErrorMessage } from './apiError';

describe('getApiErrorDetails', () => {
  it('reads ApiResponse fields from an Axios response', () => {
    expect(getApiErrorDetails({
      response: { data: { message: 'BOM 已停用', errorCode: 'BUSINESS_RULE_ERROR', correlationId: 'corr-123' } },
    })).toEqual({
      message: 'BOM 已停用',
      errorCode: 'BUSINESS_RULE_ERROR',
      correlationId: 'corr-123',
    });
  });

  it('flattens ProblemDetails validation errors without leaking the object', () => {
    expect(getApiErrorDetails({
      response: { data: {
        title: 'Validation failed',
        errors: { orderItems: ['至少需要一筆明細'], requestedDeliveryDate: '日期格式錯誤' },
      } },
    })).toEqual({ message: '至少需要一筆明細\n日期格式錯誤' });
  });

  it('supports the @hey-api error property and preserves safe metadata', () => {
    expect(getApiErrorDetails({
      error: { detail: '確認失敗', errorCode: 'BUSINESS_RULE_ERROR', correlationId: 'corr-456' },
    })).toEqual({
      message: '確認失敗',
      errorCode: 'BUSINESS_RULE_ERROR',
      correlationId: 'corr-456',
    });
  });

  it('reads hey-api response.error message without exposing the original response object', () => {
    expect(getApiErrorDetails({
      error: { message: '驗證連結已失效', errorCode: 'AUTH_LINK_INVALID', correlationId: 'corr-auth-123' },
    })).toEqual({
      message: '驗證連結已失效',
      errorCode: 'AUTH_LINK_INVALID',
      correlationId: 'corr-auth-123',
    });
  });

  it('replaces token-shaped authentication messages with a generic message', () => {
    expect(getApiErrorDetails({
      error: { message: 'token=secret-token-value', errorCode: 'AUTH_FAILURE', correlationId: 'corr-auth-safe' },
    })).toEqual({
      message: '系統發生錯誤',
      errorCode: 'AUTH_FAILURE',
      correlationId: 'corr-auth-safe',
    });
  });

  it('falls back safely and never serializes arbitrary error objects', () => {
    expect(getApiErrorMessage({ response: { data: { error: { secret: 'do-not-display' } } } }, '操作失敗'))
      .toBe('操作失敗');
  });

  it.each([
    'SQL syntax error near SELECT * FROM users',
    'System.InvalidOperationException at MyApp.Service.Run()\\nStack trace: ...',
    'connection string Server=db;User Id=app;Password=secret',
    'Authorization: Bearer abc.def.ghi; password=secret',
    'https://storage.example/file.csv?sv=2026-01-01&sig=secret',
  ])('replaces sensitive message content with a generic message: %s', (message) => {
    expect(getApiErrorDetails({ response: { data: { message, errorCode: 'INTERNAL_ERROR', correlationId: 'corr-safe' } } }))
      .toEqual({ message: '系統發生錯誤', errorCode: 'INTERNAL_ERROR', correlationId: 'corr-safe' });
  });

  it('rejects sensitive validation entries instead of rendering the remaining object', () => {
    expect(getApiErrorMessage({ response: { data: {
      errors: { code: ['料號錯誤'], debug: ['password=secret'] },
    } } })).toBe('系統發生錯誤');
  });

  it('reads correlation id from the response header without serializing response data', () => {
    expect(getApiErrorDetails({
      response: { headers: { 'x-correlation-id': 'header-corr' }, data: { detail: { unexpected: true } } },
    })).toEqual({ correlationId: 'header-corr' });
  });

  it('accepts only bounded diagnostic identifiers with safe formats', () => {
    expect(getApiErrorDetails({ response: { data: {
      message: '業務規則錯誤', errorCode: 'BUSINESS_RULE_ERROR', correlationId: 'corr-2026-01',
    } } })).toMatchObject({ errorCode: 'BUSINESS_RULE_ERROR', correlationId: 'corr-2026-01' });
    expect(getApiErrorDetails({ response: { data: {
      message: '業務規則錯誤', errorCode: 'password=secret', correlationId: 'Bearer token with unsafe content',
    } } })).toEqual({ message: '業務規則錯誤' });
    expect(getApiErrorDetails({ response: { data: {
      message: '業務規則錯誤', errorCode: 'A'.repeat(65), correlationId: 'a'.repeat(129),
    } } })).toEqual({ message: '業務規則錯誤' });
  });

  it('does not use arbitrary Error.message without a safe API payload message', () => {
    expect(getApiErrorMessage(new Error('資料庫連線密碼 secret'), '訂單更新失敗')).toBe('訂單更新失敗');
    expect(getApiErrorMessage(new Error('任意原始例外訊息'), '訂單更新失敗')).toBe('訂單更新失敗');
  });
});
