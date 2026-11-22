import { describe, expect, it } from 'vitest';
import {
  formatTaipeiDateTime,
  getDeletionModeTag,
  getOutcomeTag,
  deletionAuditTableColumns,
  buildActionColumn,
  deletionAuditSearchConfig,
} from './DeletionAuditConfig';

describe('DeletionAuditConfig', () => {
  describe('formatTaipeiDateTime', () => {
    it('空值或無效字串應回傳 -', () => {
      expect(formatTaipeiDateTime(null)).toBe('-');
      expect(formatTaipeiDateTime(undefined)).toBe('-');
      expect(formatTaipeiDateTime('')).toBe('-');
      expect(formatTaipeiDateTime('invalid-date')).toBe('-');
    });

    it('應準確轉換 UTC 時間為台北時間（UTC+8）', () => {
      // 2026-11-22 00:00:00 UTC -> 2026-11-22 08:00:00 (UTC+8)
      expect(formatTaipeiDateTime('2026-11-22T00:00:00.000Z')).toBe('2026-11-22 08:00:00 (UTC+8)');
      // 跨日轉換：2026-11-22 20:15:30 UTC -> 2026-11-23 04:15:30 (UTC+8)
      expect(formatTaipeiDateTime('2026-11-22T20:15:30.000Z')).toBe('2026-11-23 04:15:30 (UTC+8)');
    });
  });

  describe('Tags', () => {
    it('刪除模式 Tag 正確顯示實體刪除與軟刪除', () => {
      const hardTag = getDeletionModeTag('HardDelete');
      expect(hardTag.props.children).toBe('實體刪除');
      expect(hardTag.props.color).toBe('error');

      const softTag = getDeletionModeTag('SoftDelete');
      expect(softTag.props.children).toBe('軟刪除');
      expect(softTag.props.color).toBe('warning');
    });

    it('操作結果 Tag 正確顯示成功與失敗', () => {
      const successTag = getOutcomeTag('Success');
      expect(successTag.props.children).toBe('成功');
      expect(successTag.props.color).toBe('success');

      const failedTag = getOutcomeTag('Failed');
      expect(failedTag.props.children).toBe('失敗');
      expect(failedTag.props.color).toBe('error');
    });
  });

  describe('Table Columns', () => {
    it('提供所有必備稽核欄位設定且符合 ADR 0002 容器規範', () => {
      const columns = deletionAuditTableColumns();
      const names = columns.map((col) => col.name);

      expect(names).toContain('occurredAtUtc');
      expect(names).toContain('entityType');
      expect(names).toContain('entityCode');
      expect(names).toContain('deletionMode');
      expect(names).toContain('outcome');
      expect(names).toContain('actorName');
      expect(names).toContain('relatedDocumentCode');
      expect(names).toContain('detailLineNumber');
      expect(names).toContain('eventType');
      expect(names).toContain('source');
      expect(names).toContain('correlationId');
    });

    it('操作欄位固定置左且寬度為 120px', () => {
      const action = buildActionColumn(() => undefined);
      expect(action.fixed).toBe('left');
      expect(action.width).toBe(120);
      expect(action.title).toBe('操作');
    });
  });

  describe('Search Config', () => {
    it('包含起訖時間、操作者、資料類型、單號識別碼、上層單據、結果與模式等篩選條件', () => {
      const searchConfig = deletionAuditSearchConfig();
      const fieldNames = searchConfig.map((field) => field.name);

      expect(fieldNames).toContain('dateRange');
      expect(fieldNames).toContain('actor');
      expect(fieldNames).toContain('entityType');
      expect(fieldNames).toContain('entityCode');
      expect(fieldNames).toContain('relatedDocumentCode');
      expect(fieldNames).toContain('outcome');
      expect(fieldNames).toContain('deletionMode');
    });
  });
});
