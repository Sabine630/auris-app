// ── 時間膠囊（P111 D3）───────────────────────────────────────────────────────
// 「我們的回憶」頁「⏳ 寫給未來」：寫一段話封存、設定開啟日（最短 30 天）。
// 「他也寫一封」預設勾選——埋的當下用此刻脈絡生成、立即封存不顯示，到期一起拆。
// 到期由 App.vue 背景派發角色主動訊息＋通知；拆封當天兩封信注入對話 context
// （chatEngine 讀 settings 自行注入，避免循環依賴）。存 settings `capsules`（免 migration）。
import { getSetting, setSetting } from './db.js';

// 開啟日下限：埋下後至少 30 天（儀式感來自「真的等了一段時間」）
export const MIN_OPEN_DELAY_MS = 30 * 86400000;

// 開啟日預設選項（毫秒偏移）：3 個月／半年／一年
export const OPEN_PRESETS = [
  { key: '3m', label: '3 個月後', months: 3 },
  { key: '6m', label: '半年後', months: 6 },
  { key: '1y', label: '一年後', months: 12 },
];

// 全部膠囊（未拆在前、各依開啟日近→遠；已拆依拆封時間新→舊）；帶 charId 只回該角色的
export async function listCapsules(charId) {
  const all = (await getSetting('capsules')) || [];
  const list = charId ? all.filter(k => k.charId === charId) : all;
  return list.sort((a, b) => {
    if (!!a.opened !== !!b.opened) return a.opened ? 1 : -1;
    return a.opened ? (b.openedAt || 0) - (a.openedAt || 0) : (a.openAt || 0) - (b.openAt || 0);
  });
}

// 埋一顆膠囊。openAt 需距現在至少 30 天（呼叫端 UI 已限制，這裡是最後防線）。
// aiLetter：角色同時寫下的信（呼叫端先生成好傳入；沒勾或生成失敗傳空字串）。
export async function buryCapsule({ charId, charName, text, openAt, aiLetter }) {
  const content = (text || '').trim();
  if (!content) return null;
  if (!openAt || openAt - Date.now() < MIN_OPEN_DELAY_MS) return null;
  const all = (await getSetting('capsules')) || [];
  const item = {
    id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    charId,
    charName: charName || '',
    mine: content,                 // 我寫的信（快照）
    aiLetter: (aiLetter || '').trim(), // 角色寫的信（埋下即封存，拆封前 UI 不顯示）
    buriedAt: Date.now(),
    openAt,                        // 開啟日（當日 00:00 的毫秒時間戳）
    opened: false,
    openedAt: 0,
    dueNotified: false,            // 到期主動訊息已送達（背景派發去重）
    dueTries: 0,                   // 到期訊息生成重試計數（3 次放棄，膠囊仍可手動拆）
  };
  all.push(item);
  await setSetting('capsules', all);
  return item;
}

// 到期且還沒送過主動訊息的膠囊（背景派發用；每輪最多處理一顆由呼叫端控制）
export async function dueCapsules(now = Date.now()) {
  const all = (await getSetting('capsules')) || [];
  return all.filter(k => !k.opened && !k.dueNotified && k.openAt && k.openAt <= now);
}

// 到期主動訊息派發結果回寫：成功記 dueNotified；失敗累計 dueTries，滿 3 次視同已通知
// （不再重打 API——膠囊本身在頁面上仍是「可拆開」狀態，不影響拆封）。
export async function markDueResult(id, ok) {
  const all = (await getSetting('capsules')) || [];
  const item = all.find(k => k.id === id);
  if (!item) return;
  item.dueTries = (item.dueTries || 0) + 1;
  if (ok || item.dueTries >= 3) item.dueNotified = true;
  await setSetting('capsules', all);
}

// 拆封：標記 opened＋openedAt（chatEngine 依 openedAt 判定「拆封當天」注入對話 context）。
// 未到期不可拆（UI 已擋，這裡是最後防線）。回傳拆封後的膠囊。
export async function openCapsule(id, now = Date.now()) {
  const all = (await getSetting('capsules')) || [];
  const item = all.find(k => k.id === id);
  if (!item || item.opened || !item.openAt || item.openAt > now) return null;
  item.opened = true;
  item.openedAt = now;
  await setSetting('capsules', all);
  return item;
}

export async function removeCapsule(id) {
  const all = (await getSetting('capsules')) || [];
  await setSetting('capsules', all.filter(k => k.id !== id));
}
