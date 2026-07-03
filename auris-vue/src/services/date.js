// 本地時區的日期 key（YYYY-MM-DD）。全站「每天一次」的判定一律用這個，
// 不可用 toISOString（那是 UTC，台灣 UTC+8 早上 8 點才換日——會讓早上打的卡、
// 每日一問/自動日記的「今天」整整偏移 8 小時）。
export function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
