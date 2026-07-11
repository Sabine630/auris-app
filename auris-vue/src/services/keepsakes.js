// ── 回憶收藏盒（P106 D2）─────────────────────────────────────────────────────
// 長按訊息「收藏」→ 存快照（不存引用）：清空聊天、刪除訊息後收藏仍在。
// 存 settings `keepsakes`（免 migration），入口＝關係主頁「我們的回憶」。
// V1 不注入 prompt（未來可作 D4 默契素材）。
import { getSetting, setSetting } from './db.js';

// 全部收藏（新→舊）；帶 charId 只回該角色的
export async function listKeepsakes(charId) {
  const all = (await getSetting('keepsakes')) || [];
  const list = charId ? all.filter(k => k.charId === charId) : all;
  return list.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

// 收藏一則訊息快照。回傳新收藏；同一則訊息（msgId）重複收藏回 null 不重複入列。
export async function addKeepsake({ msgId, charId, charName, role, content, note, msgAt }) {
  if (!content) return null;
  const all = (await getSetting('keepsakes')) || [];
  if (msgId && all.some(k => k.msgId === msgId)) return null;
  const item = {
    id: `ks_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    msgId: msgId || '',
    charId,
    charName: charName || '',
    role: role || 'assistant',   // 說話者：assistant＝角色、user＝我
    content,
    note: (note || '').trim(),
    msgAt: msgAt || Date.now(),  // 原訊息時間（顯示用）
    savedAt: Date.now(),
  };
  all.push(item);
  await setSetting('keepsakes', all);
  return item;
}

export async function removeKeepsake(id) {
  const all = (await getSetting('keepsakes')) || [];
  await setSetting('keepsakes', all.filter(k => k.id !== id));
}

export async function updateKeepsakeNote(id, note) {
  const all = (await getSetting('keepsakes')) || [];
  const item = all.find(k => k.id === id);
  if (!item) return;
  item.note = (note || '').trim();
  await setSetting('keepsakes', all);
}
