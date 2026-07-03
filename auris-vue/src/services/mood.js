import { getSetting, setSetting } from './db.js';
import { localDateKey } from './date.js';

// ── 心情打卡（P96）──────────────────────────────────────────────────────────
// 使用者每天在首頁標記心情（5 選項＋選填備註），存 settings 表單一 key `mood_log`：
// { 'YYYY-MM-DD': { mood: 'tired', note: '報告被退回了' } }
// 有打卡才注入 prompt（moodContext），沒打卡零影響。日期界線沿用全站既有的
// toISOString 慣例（與每日一問/日記的「一天」判定一致）。

export const MOODS = [
  { key: 'happy',   emoji: '😊', label: '開心' },
  { key: 'calm',    emoji: '😌', label: '平靜' },
  { key: 'tired',   emoji: '😴', label: '累了' },
  { key: 'down',    emoji: '😞', label: '低落' },
  { key: 'annoyed', emoji: '😤', label: '煩躁' }
];

export function moodTodayKey() {
  return localDateKey();
}

export async function getTodayMood() {
  const log = await getSetting('mood_log') || {};
  return log[moodTodayKey()] || null;
}

// 覆寫當天紀錄（同日重選即修改）；順手清掉 60 天前的舊紀錄防無限成長。
export async function setTodayMood(moodKey, note = '') {
  const log = await getSetting('mood_log') || {};
  log[moodTodayKey()] = { mood: moodKey, note: (note || '').trim() };
  const cutoff = Date.now() - 60 * 86400000;
  for (const d of Object.keys(log)) {
    if (new Date(d + 'T00:00:00').getTime() < cutoff) delete log[d];
  }
  await setSetting('mood_log', log);
}

// Prompt 注入（易變段）：語氣指示比照 cycleCareContext——自然體貼、不句句提及。
export function moodContext(entry) {
  if (!entry) return '';
  const m = MOODS.find(x => x.key === entry.mood);
  if (!m) return '';
  const noteStr = entry.note ? `，並寫下：「${entry.note}」` : '';
  return `\n【對方今天的心情】對方今天標記了心情「${m.label}${m.emoji}」${noteStr}。請把這份狀態放在心上，語氣與話題自然貼合（低落時放輕柔、開心時可以一起開心），在合適的時機關心一句即可，不要每句都提及、不要質問。`;
}
