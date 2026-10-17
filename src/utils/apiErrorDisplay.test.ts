import { describe, expect, it } from 'vitest';
import {
  getApiMutationErrorContent,
  getApiMutationErrorMessage,
  getAuthErrorMessage,
  getMaterialDeleteNotice,
} from './apiErrorDisplay';

describe('getApiMutationErrorContent', () => {
  it('renders operation and safe diagnostic fields', () => {
    expect(getApiMutationErrorContent({
      response: { data: {
        message: '訂單尚未建立 BOM', errorCode: 'BUSINESS_RULE_ERROR', correlationId: 'corr-order-123',
      } },
    }, '確認訂單')).toBe(
      '操作失敗：確認訂單\n原因：訂單尚未建立 BOM\n錯誤代碼：BUSINESS_RULE_ERROR\n關聯識別碼：corr-order-123',
    );
  });

  it('uses the caller fallback instead of a raw Error.message', () => {
    expect(getApiMutationErrorContent(new Error('raw internal exception'), '結案訂單'))
      .toBe('操作失敗：結案訂單\n原因：結案訂單失敗');
  });

  it('hides account existence details while retaining safe diagnostics for login', () => {
    expect(getAuthErrorMessage({
      error: { message: '帳號不存在', errorCode: 'AUTH_FAILURE', correlationId: 'corr-login-1' },
    }, '登入失敗，請確認帳號與密碼後再試', { hideReason: true }))
      .toBe('登入失敗，請確認帳號與密碼後再試\n錯誤代碼：AUTH_FAILURE\n關聯識別碼：corr-login-1');
  });

  it('keeps corrective reset reasons but masks token and identity details', () => {
    expect(getAuthErrorMessage({ error: { message: '重設連結已過期' } }, '重設失敗'))
      .toBe('重設連結已過期');
    expect(getAuthErrorMessage({ error: { message: 'token=secret-value' } }, '重設失敗'))
      .toBe('重設失敗');
    expect(getAuthErrorMessage({ error: { message: 'User not found for identity lookup' } }, '啟用失敗'))
      .toBe('啟用失敗');
  });

  it('keeps corrective attachment delete reasons and safe diagnostics', () => {
    expect(getApiMutationErrorMessage({
      response: { data: {
        message: '檔案已被使用，請先移除關聯',
        errorCode: 'ATTACHMENT_IN_USE',
        correlationId: 'corr-attachment-123',
      } },
    }, '刪除失敗')).toBe(
      '原因：檔案已被使用，請先移除關聯\n錯誤代碼：ATTACHMENT_IN_USE\n關聯識別碼：corr-attachment-123',
    );
  });

  it('masks unsafe attachment errors instead of exposing raw exception details', () => {
    expect(getApiMutationErrorMessage({
      response: { data: {
        message: 'select * from attachments where token=secret-value; stack trace at Db.Connection',
        errorCode: 'ATTACHMENT_DELETE_ERROR',
        correlationId: 'corr-attachment-safe',
      } },
    }, '刪除失敗')).toBe(
      '原因：刪除失敗\n錯誤代碼：ATTACHMENT_DELETE_ERROR\n關聯識別碼：corr-attachment-safe',
    );
  });

  it('correctly maps material deletion business blocking rules to warnings', () => {
    const error = {
      response: {
        data: {
          message: '無法刪除此原料：此原料已被採購單明細引用',
          errorCode: 'MATERIAL_REFERENCED_BY_PURCHASE_ORDER',
          correlationId: 'corr-mat-po-123',
        },
      },
    };
    const notice = getMaterialDeleteNotice(error);
    expect(notice.isBlocked).toBe(true);
    expect(notice.title).toBe('無法刪除原料（業務規則限制）');
    expect(notice.content).toBe(
      '原因：無法刪除此原料：此原料已被採購單明細引用\n錯誤代碼：MATERIAL_REFERENCED_BY_PURCHASE_ORDER\n關聯識別碼：corr-mat-po-123',
    );
  });

  it('uses default friendly message when material blocked error has no safe message', () => {
    const error = {
      response: {
        data: {
          errorCode: 'MATERIAL_HAS_ROLL',
          correlationId: 'corr-mat-roll-456',
        },
      },
    };
    const notice = getMaterialDeleteNotice(error);
    expect(notice.isBlocked).toBe(true);
    expect(notice.title).toBe('無法刪除原料（業務規則限制）');
    expect(notice.content).toBe(
      '原因：該原料已存在實體 LPN 捲卡/片包庫存記錄，無法刪除。\n錯誤代碼：MATERIAL_HAS_ROLL\n關聯識別碼：corr-mat-roll-456',
    );
  });

  it('falls back to standard error title and content for non-blocked material deletion failure', () => {
    const error = new Error('Network error');
    const notice = getMaterialDeleteNotice(error);
    expect(notice.isBlocked).toBe(false);
    expect(notice.title).toBe('錯誤提示');
    expect(notice.content).toBe('原因：刪除失敗');
  });
});