// 本地時區的日期 key（YYYY-MM-DD）。全站「每天一次」的判定一律用這個，
// 不可用 toISOString（那是 UTC，台灣 UTC+8 早上 8 點才換日——會讓早上打的卡、
// 每日一問/自動日記的「今天」整整偏移 8 小時）。
export function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 「YYYY-MM-DD」到今天經過的完整本地日曆日（當天＝0）。在一起／相識天數與里程碑
// 一律用這個（P129 起關係頁與 chatEngine 共用，不可各算一套）。
// 不可用 new Date('YYYY-MM-DD') 直接相減——那是 UTC 午夜，UTC+8 下天數要到早上
// 8 點才 +1，凌晨會與里程碑判定差一天。無效日期（含 02-30 這類溢位）回 null；
// 未來日期回負數，由呼叫端決定怎麼處理。
export function calendarDaysSince(dateStr, now = new Date()) {
  if (typeof dateStr !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const start = new Date(y, mo - 1, d);
  if (start.getFullYear() !== y || start.getMonth() !== mo - 1 || start.getDate() !== d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // round 而非 floor：跨日光節約時差一小時時 floor 會少一天
  return Math.round((today - start) / 86400000);
}
