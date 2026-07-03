import { describe, it, expect } from 'vitest';
import { localDateKey } from '../date.js';

// 用本地元件建構、用本地元件讀回，故此測試不受執行環境時區影響（正是這個 helper 的用意）。
describe('localDateKey', () => {
  it('月/日補零成 YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('雙位數月日不補零', () => {
    expect(localDateKey(new Date(2026, 11, 25))).toBe('2026-12-25');
  });

  it('採本地日期元件（半夜也回當地當天，不會因 UTC 偏移）', () => {
    // 本地 00:30 → 仍是當地當天（若用 toISOString 在 UTC+8 會變前一天）
    expect(localDateKey(new Date(2026, 6, 3, 0, 30))).toBe('2026-07-03');
  });
});
