import { describe, expect, it } from 'vitest';

import { parseBomShortageError } from './workOrderError';

describe('parseBomShortageError', () => {
  it('只保留 BOM shortage allowlist 欄位', () => {
    expect(parseBomShortageError('備料失敗: {"isBOMError":true,"title":"任意標題","details":[{"code":"MAT-01","type":"捲材","requisitioned":2,"required":5,"secret":"ignore"}]}'))
      .toEqual({ details: [{ code: 'MAT-01', type: '捲材', requisitioned: 2, required: 5 }] });
  });

  it('拒絕未允許的類型與非數字數值，避免任意資料進入 render', () => {
    expect(parseBomShortageError('{"isBOMError":true,"details":[{"code":"MAT-01","type":"<script>","requisitioned":"2","required":5}]}'))
      .toBeUndefined();
  });

  it('不是 BOM 錯誤或不是合法 JSON 時回傳 undefined', () => {
    expect(parseBomShortageError('一般錯誤 {"details":[]}')).toBeUndefined();
    expect(parseBomShortageError('一般錯誤')).toBeUndefined();
  });
});