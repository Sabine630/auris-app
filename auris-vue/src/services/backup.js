// ── 備份服務（P105 M1）───────────────────────────────────────────────────────
// 就地備份 + 備份提醒判斷。背景：iOS Safari 對未加桌面的網站 7 天未造訪可能整站
// 清資料，而 Auris 所有資料只存本地——備份是唯一防線。
// 匯出邏輯抽自 SettingsView（設定頁與首頁提醒卡共用同一條路徑）。
import { getSetting, setSetting, exportAllData, dbCount } from './db.js';

export const REMIND_INTERVAL_DAYS = 14;  // 上次備份超過 14 天 → 提醒
export const SNOOZE_DAYS = 3;            // 「稍後」壓 3 天
export const FIRST_REMIND_MIN_MSGS = 50; // 從未備份者：訊息總數 ≥ 50 才首次提醒

const DAY_MS = 24 * 60 * 60 * 1000;

// 就地備份：匯出全站資料成 JSON 下載檔（不含 API 金鑰），成功即重置提醒計時。
export async function doBackup() {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  // YYYYMMDD-HHMM format
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  a.download = `auris_backup_${y}${m}${day}-${h}${min}.json`;
  a.click();
  URL.revokeObjectURL(url);
  await markBackedUp();
}

// 匯出／匯入成功都呼叫這裡重置計時（匯入代表使用者手上有一份新鮮備份檔）。
export async function markBackedUp() {
  await setSetting('last_backup_at', Date.now());
}

// 「稍後」：snooze 3 天（跨 session 持續，當次 session 自然也不再出現）。
export async function snoozeBackupReminder() {
  await setSetting('backup_snooze_until', Date.now() + SNOOZE_DAYS * DAY_MS);
}

// 首頁提醒卡是否該出現。回傳 null（不提醒）或 { kind: 'first' | 'overdue', days }：
// first＝從未備份且訊息總數已 ≥ 50；overdue＝距上次備份超過 14 天（days 為天數）。
export async function shouldRemindBackup() {
  const snoozeUntil = await getSetting('backup_snooze_until');
  if (snoozeUntil && Date.now() < snoozeUntil) return null;

  const lastAt = await getSetting('last_backup_at');
  if (!lastAt) {
    const msgCount = await dbCount('messages');
    if (msgCount >= FIRST_REMIND_MIN_MSGS) return { kind: 'first', days: 0 };
    return null;
  }
  const days = Math.floor((Date.now() - lastAt) / DAY_MS);
  if (days >= REMIND_INTERVAL_DAYS) return { kind: 'overdue', days };
  return null;
}
