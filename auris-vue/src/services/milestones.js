import { calendarDaysSince } from './date.js';

// 關係里程碑（P129，A1 定案規格）：只慶「在一起」天數，相識日不做；
// 週年由既有年度紀念日機制涵蓋，兩軌互補、互不取代。
export const MILESTONE_DAYS = [100, 200, 300, 520, 1000];

// 回傳 togetherDate 的里程碑狀態：
//   { days, isToday, next: { target, daysLeft } | null }
// togetherDate 無效或在未來 → null（畫面與 prompt 都不顯示，交往日填錯不炸）。
// 1000 天後 next 為 null，只剩年度紀念日機制。
export function getMilestoneInfo(togetherDate, now = new Date()) {
  const days = calendarDaysSince(togetherDate, now);
  if (days === null || days < 0) return null;
  const target = MILESTONE_DAYS.find(m => m > days) ?? null;
  return {
    days,
    isToday: MILESTONE_DAYS.includes(days),
    next: target === null ? null : { target, daysLeft: target - days },
  };
}
