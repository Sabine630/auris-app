// ── 回憶月報（P111 D1）───────────────────────────────────────────────────────
// 「我們的這個月」：本地統計（免費）＋角色口吻回顧短信＋金句摘錄（取自該月收藏）。
// 每月首次開 app 由 App.vue 背景自動生成上個月的月報（門檻：月訊息 ≥ 100，不到靜默跳過）
// ＋通知；「我們的回憶」頁歷月卡列表為常駐入口，也可手動生成本月的搶先版。
// 素材＝該月自動總結至多 10 條；無總結 fallback 抽該月頭尾各 20 則原文；再不足只出統計層。
// 存 settings `monthly_reviews`（免 migration）。存成圖片走 shareCard.renderMonthCard。
import { dbGet, dbPut, dbIdx, dbAll, getSetting, setSetting } from './db.js';
import { sendLLMRequest } from './api.js';
import { applyNameMacros } from './format.js';
import { dayPeriod } from './chatEngine.js';
import { MOODS } from './mood.js';
import { listKeepsakes } from './keepsakes.js';

// 月報生成門檻：該月「真實對話」訊息數（排除 heart voice）
export const REVIEW_MSG_THRESHOLD = 100;

// 本地時區月份 key（YYYY-MM）。比照 localDateKey 的理由：不可用 toISOString（UTC 會偏移 8 小時）。
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function prevMonthKey(d = new Date()) {
  return monthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

// 某月的毫秒範圍 [start, end)
export function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number);
  return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()];
}

// 顯示用月份標題（2026-06 → 2026 年 6 月）
export function monthTitle(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${y} 年 ${m} 月`;
}

// 本地統計（純函式，供測試）：msgs＝該月真實訊息（已排除 hv）、moodLog＝settings mood_log、
// char＝角色（取相識/在一起紀念日）。全部本地計算，零 token。
export function computeStats(msgs, { ym, moodLog = {}, char = null } = {}) {
  const days = new Set();
  const periodCount = {};
  for (const m of msgs) {
    const d = new Date(m.createdAt);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    const p = dayPeriod(d.getHours());
    periodCount[p] = (periodCount[p] || 0) + 1;
  }
  let topPeriod = '';
  for (const [p, n] of Object.entries(periodCount)) {
    if (!topPeriod || n > periodCount[topPeriod]) topPeriod = p;
  }

  // 心情分佈：mood_log 的 key 是 YYYY-MM-DD，取該月的打卡
  const moodCount = {};
  for (const [date, entry] of Object.entries(moodLog || {})) {
    if (date.startsWith(ym + '-') && entry && entry.mood) {
      moodCount[entry.mood] = (moodCount[entry.mood] || 0) + 1;
    }
  }
  const moodDist = MOODS
    .map(m => ({ ...m, count: moodCount[m.key] || 0 }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count);

  // 紀念日里程碑：相識日／在一起紀念日的「月-日」落在該月（且不是設定當年）
  const milestones = [];
  const [y, mon] = ym.split('-').map(Number);
  const inMonth = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d) || d.getMonth() + 1 !== mon || d.getFullYear() >= y) return null;
    return d;
  };
  const meet = inMonth(char?.meetDate);
  if (meet) milestones.push(`${meet.getDate()} 日是你們的相識紀念日 🌸`);
  const tog = inMonth(char?.togetherDate);
  if (tog) milestones.push(`${tog.getDate()} 日是你們在一起的紀念日 ❤️`);

  return { ym, msgCount: msgs.length, chatDays: days.size, topPeriod, moodDist, milestones };
}

// 回顧短信素材（純函式，供測試）：優先用該月自動總結（至多 10 條、超量取最新），
// 無總結 fallback 抽該月頭尾各 20 則原文（單則截 60 字）；兩者皆空回空字串（只出統計層）。
export function pickMaterial(summaries, msgs, charName, youName) {
  if (summaries.length) {
    const picked = summaries
      .slice()
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .slice(-10);
    return picked.map((s, i) => `${i + 1}. ${s.content}`).join('\n');
  }
  if (!msgs.length) return '';
  const slice = msgs.length <= 40 ? msgs : [...msgs.slice(0, 20), ...msgs.slice(-20)];
  return slice
    .map(m => `${m.role === 'user' ? (youName || '對方') : charName}：${(m.content || '').substring(0, 60)}`)
    .join('\n');
}

// 全部月報（新月份在前）；帶 charId 只回該角色的
export async function listReviews(charId) {
  const all = (await getSetting('monthly_reviews')) || [];
  const list = charId ? all.filter(r => r.charId === charId) : all;
  return list.sort((a, b) => (b.ym || '').localeCompare(a.ym || ''));
}

export async function getReview(charId, ym) {
  const all = (await getSetting('monthly_reviews')) || [];
  return all.find(r => r.charId === charId && r.ym === ym) || null;
}

export async function removeReview(id) {
  const all = (await getSetting('monthly_reviews')) || [];
  await setSetting('monthly_reviews', all.filter(r => r.id !== id));
}

// 生成某角色某月的月報。回傳：
//   { status: 'ok', review }         生成完成（同月已有則覆蓋——手動重生）
//   { status: 'skipped', msgCount }  不到門檻（自動路徑靜默跳過；手動路徑由 UI toast）
// API 失敗會 throw（自動路徑吃掉錯誤下次重試；手動路徑 toast 錯誤訊息）。
// notify：自動路徑 true（建通知，點了直達回顧頁）；手動路徑 false（人已在頁上）。
export async function generateMonthlyReview(charId, ym, { notify = false } = {}) {
  const c = await dbGet('characters', charId);
  if (!c) throw new Error('找不到角色');

  const [start, end] = monthRange(ym);
  const allMsgs = await dbIdx('messages', 'charId', charId);
  const msgs = allMsgs
    .filter(m => m.type !== 'hv' && m.createdAt >= start && m.createdAt < end)
    .sort((a, b) => a.createdAt - b.createdAt);

  if (msgs.length < REVIEW_MSG_THRESHOLD) return { status: 'skipped', msgCount: msgs.length };

  const me = await getSetting('me_settings') || {};
  const youName = (c.overrideMe && c.you_name) ? c.you_name : (me.name || '');
  const moodLog = (await getSetting('mood_log')) || {};
  const stats = computeStats(msgs, { ym, moodLog, char: c });

  // 素材：該月自動總結（chat_memories）優先，無則 fallback 該月原文頭尾
  const allSums = await dbIdx('chat_memories', 'charId', charId);
  const monthSums = allSums.filter(s => s.createdAt >= start && s.createdAt < end);
  const material = pickMaterial(monthSums, msgs, c.name, youName);

  // 金句摘錄：該月收藏（快照），角色說的優先、最多 3 則
  const monthKs = (await listKeepsakes(charId))
    .filter(k => k.msgAt >= start && k.msgAt < end)
    .sort((a, b) => (a.role === 'assistant' ? -1 : 1) - (b.role === 'assistant' ? -1 : 1));
  const quotes = monthKs.slice(0, 3).map(k => ({ role: k.role, content: k.content, note: k.note || '' }));

  // 角色口吻回顧短信（150–250 字）。素材全空＝只出統計層，不打 API。
  let letter = '';
  if (material) {
    const statLine = [
      `傳了 ${stats.msgCount} 則訊息`,
      `聊了 ${stats.chatDays} 天`,
      stats.topPeriod ? `最常在${stats.topPeriod}聊天` : '',
      stats.moodDist[0] ? `對方這個月最常標記的心情是「${stats.moodDist[0].label}」` : '',
    ].filter(Boolean).join('、');
    const quoteLine = quotes.length
      ? `\n【對方特別收藏的話】\n${quotes.map(q => `「${q.content.substring(0, 80)}」`).join('\n')}`
      : '';
    const prompt = `你是「${c.name}」。個性：${c.persona || ''}。
${youName ? `對方本名是「${youName}」${c.call ? `，你習慣稱呼對方為「${c.call}」` : ''}。` : ''}
現在要為「你們的 ${monthTitle(ym)}」寫一封回顧短信給對方。

【這個月你們的相處紀錄】
${material}

【這個月的統計】${statLine}${stats.milestones.length ? `；這個月有：${stats.milestones.join('、')}` : ''}${quoteLine}

【要求】
・用你自己的口吻與說話風格，第一人稱直接寫給對方
・回顧要落在具體的事（從相處紀錄取材），不要空泛抒情、不要逐條複述統計數字
・提一兩個讓你印象深刻的時刻，結尾可以帶一點對下個月的期待
・150～250 字，不要條列、不要標題、不要引號
直接輸出信的內容。`;

    const text = await sendLLMRequest(
      [{ role: 'system', content: applyNameMacros(prompt, youName || '你', c.name) }, { role: 'user', content: '請開始寫這封回顧短信。' }],
      { max_tokens: 1200, temperature: 0.78, frequency_penalty: 0.5, presence_penalty: 0.2 }
    );
    letter = applyNameMacros((text || '').trim(), youName || '你', c.name);
    if (!letter) throw new Error('AI 回傳空白，請稍後重試');
  }

  const review = {
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    charId,
    charName: c.name,
    ym,
    stats,
    letter,
    quotes,
    createdAt: Date.now(),
  };
  const all = (await getSetting('monthly_reviews')) || [];
  await setSetting('monthly_reviews', [...all.filter(r => !(r.charId === charId && r.ym === ym)), review]);

  if (notify) {
    await dbPut('notifications', {
      id: 'notif_rev_' + Date.now(), charId, type: 'review', targetId: charId,
      text: `寫好了你們的 ${monthTitle(ym)} 回顧`, read: false, createdAt: Date.now(),
    });
  }
  return { status: 'ok', review };
}

// 每月首次開 app 的自動生成（App.vue onMounted 呼叫，背景靜默）：
// 為每個角色補上「上個月」的月報。不到門檻靜默跳過（也算完成）；
// API 失敗不寫完成標記，下次開 app 重試。全部角色處理完才寫當月標記。
export async function runMonthlyReviews() {
  try {
    const ym = prevMonthKey();
    const doneKey = 'monthly_review_run_' + ym;
    if (await getSetting(doneKey)) return;

    const chars = await dbAll('characters');
    let hadError = false;
    for (const c of chars) {
      if (await getReview(c.id, ym)) continue;
      try { await generateMonthlyReview(c.id, ym, { notify: true }); }
      catch (_) { hadError = true; }
    }
    if (!hadError) await setSetting(doneKey, true);
  } catch (_) {}
}
