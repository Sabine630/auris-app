// P129 關係里程碑：calendarDaysSince（本地日曆日）與 getMilestoneInfo 邊界。
// 天數規則＝交往日當天為第 0 天，經過 100 個完整日曆日才是「在一起 100 天」。
import { describe, it, expect } from 'vitest';
import { calendarDaysSince } from '../date.js';
import { MILESTONE_DAYS, getMilestoneInfo } from '../milestones.js';

// 固定「今天」：2026-07-19（本地）。用本地時間建構，避免測試機時區影響。
const NOW = new Date(2026, 6, 19, 14, 30);

// 回推 n 個日曆日的 YYYY-MM-DD
function dateNDaysAgo(n) {
  const d = new Date(2026, 6, 19 - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('calendarDaysSince', () => {
  it('當天為 0、昨天為 1、跨月正確', () => {
    expect(calendarDaysSince('2026-07-19', NOW)).toBe(0);
    expect(calendarDaysSince('2026-07-18', NOW)).toBe(1);
    expect(calendarDaysSince('2026-06-19', NOW)).toBe(30);
  });

  it('凌晨（本地 00:30）天數不因 UTC 解析少一天——舊算法的回歸案例', () => {
    const earlyMorning = new Date(2026, 6, 19, 0, 30);
    expect(calendarDaysSince('2026-07-18', earlyMorning)).toBe(1);
  });

  it('未來日期回負數，由呼叫端處理', () => {
    expect(calendarDaysSince('2026-07-20', NOW)).toBe(-1);
  });

  it('無效輸入回 null（非字串、格式錯、02-30 溢位）', () => {
    expect(calendarDaysSince(null, NOW)).toBeNull();
    expect(calendarDaysSince(undefined, NOW)).toBeNull();
    expect(calendarDaysSince('', NOW)).toBeNull();
    expect(calendarDaysSince('abc', NOW)).toBeNull();
    expect(calendarDaysSince('2026/07/19', NOW)).toBeNull();
    expect(calendarDaysSince('2026-02-30', NOW)).toBeNull();
  });
});

describe('getMilestoneInfo', () => {
  it('99／100／101 天：倒數 1 天 → 當天里程碑 → 指向 200', () => {
    expect(getMilestoneInfo(dateNDaysAgo(99), NOW)).toEqual({ days: 99, isToday: false, next: { target: 100, daysLeft: 1 } });
    expect(getMilestoneInfo(dateNDaysAgo(100), NOW)).toEqual({ days: 100, isToday: true, next: { target: 200, daysLeft: 100 } });
    expect(getMilestoneInfo(dateNDaysAgo(101), NOW)).toEqual({ days: 101, isToday: false, next: { target: 200, daysLeft: 99 } });
  });

  it('519／520 天與 1000 天；1000 天後 next 為 null', () => {
    expect(getMilestoneInfo(dateNDaysAgo(519), NOW)).toEqual({ days: 519, isToday: false, next: { target: 520, daysLeft: 1 } });
    expect(getMilestoneInfo(dateNDaysAgo(520), NOW).isToday).toBe(true);
    expect(getMilestoneInfo(dateNDaysAgo(1000), NOW)).toEqual({ days: 1000, isToday: true, next: null });
    expect(getMilestoneInfo(dateNDaysAgo(1001), NOW)).toEqual({ days: 1001, isToday: false, next: null });
  });

  it('第 0 天不是里程碑，下一站 100 天（倒數 100 > 90，關係頁尚不顯示）', () => {
    expect(getMilestoneInfo(dateNDaysAgo(0), NOW)).toEqual({ days: 0, isToday: false, next: { target: 100, daysLeft: 100 } });
  });

  it('未來日期與無效日期回 null（填錯交往日不炸、不注入 prompt）', () => {
    expect(getMilestoneInfo('2027-01-01', NOW)).toBeNull();
    expect(getMilestoneInfo('', NOW)).toBeNull();
    expect(getMilestoneInfo(null, NOW)).toBeNull();
    expect(getMilestoneInfo('2026-13-01', NOW)).toBeNull();
  });

  it('里程碑集合維持 A1 定案：100/200/300/520/1000', () => {
    expect(MILESTONE_DAYS).toEqual([100, 200, 300, 520, 1000]);
  });
});
