// ── P131 待續記憶：純函式核心 ────────────────────────────────────────────────
// 本檔只放「不碰 IO」的純邏輯：候選閘門、日期建構與驗證、followUpAfter 計算、
// operation schema／狀態轉換、fingerprint 去重、matchKeywords 停用詞過濾與提及
// 判定、每日清理分類。擷取器、per-character queue、DB 落庫、cleanup 的 IO 包裝在
// 後續批次接上 chatEngine／App.vue，不放這裡——純函式才好單元測試、也不牽進聊天鏈。
//
// 領域詞彙（kind/owner/status/precision 白名單、日期字串驗證）沿用 importValidation.js
// 的單一真相來源，不重抄（防呆原則 3：漂移）。
import {
  THREAD_KINDS, THREAD_OWNERS, THREAD_STATUSES, THREAD_PRECISIONS,
  MAX_THREAD_KEYWORDS, MAX_THREAD_KEYWORD_CHARS,
  MAX_THREAD_TITLE_CHARS, MAX_THREAD_TEXT_CHARS,
  THREAD_KEYWORD_STOPWORDS as STOPWORDS,
  isValidLocalDateString, isValidLocalTimeString,
} from './importValidation.js';
import { calendarDaysSince } from './date.js';

// 冷卻常數（計畫 §13.4 定案，不留待施工調校）
export const OFFER_MISS_LIMIT = 3;   // 連續 3 輪注入未被提及即進冷卻
export const COOLDOWN_DAYS = 7;      // 冷卻 7 天，期間不選為 action 候選
const DAY_MS = 86400000;

// 事件日相對來源訊息本地日的合理範圍（計畫 §10.3）
const MAX_DAYS_BEFORE_SOURCE = 14;   // 不得早於來源日超過 14 天
const MAX_DAYS_AFTER_SOURCE = 366;   // 不得晚於來源日超過 366 天

// 清理門檻（計畫 §15）
const EXPIRE_DATED_AFTER_DAYS = 14;  // 有日期：followUpAfter 過期逾 14 天 → expired
const EXPIRE_UNDATED_AFTER_DAYS = 90;// 無日期：updatedAt 逾 90 天無更新 → expired
const PURGE_AFTER_CLOSED_DAYS = 30;  // closedAt 逾 30 天 → 刪除結構化紀錄

// ── 1. 本地候選閘門（§8）────────────────────────────────────────────────────
// 低成本 regex：判定單一 text 是否帶「值得呼叫擷取器」的訊號。不做語意理解，
// 寧可略寬（未命中就零 API 呼叫，命中才進 queue，擷取器會再嚴格判斷）。
const SIGNAL_PATTERNS = [
  // 時間：今天、明天、後天、下週/下星期、下個月、星期幾、月底/月初、日期、幾點
  /今天|明天|後天|大後天|下週|下星期|下个?月|下個月|這週|本週|週[一二三四五六日天]|星期[一二三四五六日天]|禮拜[一二三四五六日天]|月底|月初|月中|\d{1,2}\s*[月\/-]\s*\d{1,2}|\d{1,2}\s*號|\d{1,2}\s*點/,
  // 計畫：要去、預計、打算、準備、約了、安排
  /要去|要參加|預計|打算|準備要|準備去|約了|約好|安排|排了|報名/,
  // 約定：答應、說好、約定、下次一起、記得
  /答應|說好|約定|下次一起|下次要|記得要|說要/,
  // 狀態更新：改期、延後、提前、取消、完成、結束、考完、回來了、結果
  /改期|延後|延到|提前|取消|完成了?|結束了?|考完|面試完|回來了|結果|順利嗎|怎麼樣了/,
];

export function looksLikeThreadCandidate(text) {
  const t = (text || '').trim();
  if (!t) return false;
  return SIGNAL_PATTERNS.some((re) => re.test(t));
}

// 確認／否定詞：本輪 user 訊息只是回應上一則、本身不帶訊號時，用來接確認式對話。
// 錨定在句首、後接標點／空白／句尾即可（不要求整句都是確認詞），故計畫 §8 明列的
// 「對啊，好緊張」也算確認；而「對了我要說」「好久不見」因確認詞後非邊界不誤判。
// 放寬前綴不會憑空製造候選——rule2 仍要求「緊鄰的上一則角色訊息帶訊號」才成立。
// 長詞排在短詞前（對啊 先於 對），確保優先吃較長的確認詞。
const CONFIRM_PATTERN = /^(對啊|對呀|對|是啊|是的|是|沒錯|嗯+|好啊|好的|好|ok|OK|要|沒有|沒|不用|不是|還沒有|還沒)([。！!，,、～~\s]|$)/;

export function isConfirmationText(text) {
  const t = (text || '').trim();
  if (!t) return false;
  return CONFIRM_PATTERN.test(t);
}

// 依 §8 錨定規則判定「本輪是否為候選」。窗口只提供上下文，命中判定必須錨定在本輪
// 新的 user 訊息，不得把最近數則合併後 regex（否則窗口留著「明天面試」會讓後續閒聊
// 一路命中，違反 §22 第 6 條）。回傳判定與要餵給擷取器的合併文字。
//   - newUserText：本輪新的 user 訊息
//   - prevCharText：緊鄰的上一則「角色」訊息（可空）
//   - prevUserText：緊鄰的上一則「user」訊息（可空，供拆句）
// rule 3（拆句）是否應觸發由此回傳，但「同一組不重複觸發」的去重屬呼叫端狀態，
// 不在純函式內判斷。
export function evaluateCandidateTurn({ newUserText = '', prevCharText = '', prevUserText = '' } = {}) {
  const cur = (newUserText || '').trim();
  if (!cur) return { candidate: false, reason: 'empty', text: '' };

  // rule 1：本輪 user 訊息自身命中
  if (looksLikeThreadCandidate(cur)) {
    return { candidate: true, reason: 'self', text: cur };
  }
  // rule 2：本輪是確認/否定詞，且緊鄰上一則角色訊息命中
  if (isConfirmationText(cur) && looksLikeThreadCandidate(prevCharText)) {
    return { candidate: true, reason: 'confirm', text: `${prevCharText}\n${cur}` };
  }
  // rule 3：與緊鄰上一則 user 訊息相接後才命中（拆句）
  if (prevUserText && !looksLikeThreadCandidate(prevUserText)) {
    const joined = `${prevUserText}${cur}`;
    if (looksLikeThreadCandidate(joined)) {
      return { candidate: true, reason: 'split', text: joined };
    }
  }
  return { candidate: false, reason: 'no-signal', text: '' };
}

// 最近 n 則非 hv 訊息的小窗口（§7）：只留擷取器需要的欄位（role／msgId／createdAt／content）。
// 時間格式化交給呼叫端（需本地時區）。
export function buildRecentThreadWindow(msgs, n = 4) {
  return (msgs || [])
    .filter((m) => m && m.type !== 'hv')
    .slice(-n)
    .map((m) => ({ role: m.role, msgId: m.id, createdAt: m.createdAt, content: m.content || '' }));
}

// 由已排序訊息取「本輪判定」所需的三段文字（§8 錨定規則）：
//   - newUserText：最後一則（必須是 user，否則本輪非新 user 訊息，回空）
//   - prevCharText／prevUserText：緊鄰的上一則（嚴格相鄰，才符合「緊鄰上一則」語意）
// 供 evaluateCandidateTurn 使用。呼叫端傳入的 msgs 應已濾 hv 並依 createdAt 升冪。
export function deriveTurnTexts(msgs) {
  const arr = msgs || [];
  const last = arr[arr.length - 1];
  if (!last || last.role !== 'user') return { newUserText: '', prevCharText: '', prevUserText: '' };
  const prev = arr[arr.length - 2];
  return {
    newUserText: last.content || '',
    prevCharText: prev && prev.role === 'assistant' ? (prev.content || '') : '',
    prevUserText: prev && prev.role === 'user' ? (prev.content || '') : '',
  };
}

// ── 2. 本地日期建構與 round-trip 驗證（§10）──────────────────────────────────
// 分開解析年月日，一律 new Date(y, m-1, d)，禁止 new Date('YYYY-MM-DD')（UTC 午夜偏移）。
export function parseLocalDateParts(dateStr) {
  if (!isValidLocalDateString(dateStr)) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

// 由本地日曆字串（＋可選時間）建 Date；無效回 null。timeStr 缺省為 00:00。
export function buildLocalDate(dateStr, timeStr = null) {
  const parts = parseLocalDateParts(dateStr);
  if (!parts) return null;
  let hh = 0, mm = 0;
  if (timeStr != null) {
    if (!isValidLocalTimeString(timeStr)) return null;
    const tm = /^(\d{2}):(\d{2})$/.exec(timeStr);
    hh = Number(tm[1]); mm = Number(tm[2]);
  }
  return new Date(parts.y, parts.mo - 1, parts.d, hh, mm);
}

// 事件日是否落在來源訊息本地日的合理範圍內（§10.3）。
// 有效 iff  -366 ≤ (來源日 - 事件日) ≤ 14。
export function isEventDateWithinWindow(dateStr, sourceCreatedAt) {
  if (dateStr == null) return true; // 無日期不受此限
  const days = calendarDaysSince(dateStr, new Date(sourceCreatedAt));
  if (days == null) return false;
  return days <= MAX_DAYS_BEFORE_SOURCE && days >= -MAX_DAYS_AFTER_SOURCE;
}

// 事件日是否落在「來源時間範圍」的合理窗口內（§10.3）。即時擷取只有單點（earliest==latest），
// 總結補漏的 transcript 橫跨多天，需以「最早訊息日」判過去界、「最晚訊息日」判未來界，
// 否則 7/1 說的「明天(7/2)」在 7/20 總結時會被誤判成距最後訊息 18 天而降為無日期。
// 有效 iff (最早日 - 事件日) ≤ 14  且  (最晚日 - 事件日) ≥ -366。
export function isEventDateWithinRange(dateStr, earliestMs, latestMs) {
  if (dateStr == null) return true;
  const beforeDays = calendarDaysSince(dateStr, new Date(earliestMs)); // 最早日 - 事件日
  const afterDays = calendarDaysSince(dateStr, new Date(latestMs));    // 最晚日 - 事件日
  if (beforeDays == null || afterDays == null) return false;
  return beforeDays <= MAX_DAYS_BEFORE_SOURCE && afterDays >= -MAX_DAYS_AFTER_SOURCE;
}

// ── 3. followUpAfter 本地計算（§10.4）────────────────────────────────────────
// 無日期 → null；只有日期 → 事件日隔天 08:00；有明確時間 → 事件時間後 3 小時。
// 算不出合理時間就回 null（＝降為無日期），不信任模型猜的時間戳。
export function computeFollowUpAfter({ eventDate = null, eventTime = null, datePrecision = 'unknown' } = {}) {
  if (eventDate == null) return null;
  const parts = parseLocalDateParts(eventDate);
  if (!parts) return null;

  if (datePrecision === 'time' && eventTime != null) {
    const base = buildLocalDate(eventDate, eventTime);
    if (!base) return null;
    return base.getTime() + 3 * 60 * 60 * 1000;
  }
  // 只有日期（或精度不足）：隔天 08:00。d+1 交給 Date 處理跨月/跨年進位。
  const next = new Date(parts.y, parts.mo - 1, parts.d + 1, 8, 0);
  return next.getTime();
}

// ── 4. operation schema／狀態轉換（§5.3、§9.3）──────────────────────────────
export const THREAD_OPS = new Set(['ADD', 'UPDATE', 'RESOLVE', 'CANCEL', 'NONE']);
export const TERMINAL_STATUSES = new Set(['resolved', 'cancelled', 'expired']);

// 允許的狀態轉換：由 op 觸發。expired 只能由本地每日清理產生，模型不得輸出。
const OP_TARGET_STATUS = {
  RESOLVE: 'resolved',
  CANCEL: 'cancelled',
};

// 某個 op 是否可套用在目前狀態的 thread 上。
export function canApplyOp(op, currentStatus) {
  if (op === 'ADD' || op === 'NONE') return true;
  // 終止狀態不接受一般 UPDATE/RESOLVE/CANCEL 重開（§5.3）
  if (TERMINAL_STATUSES.has(currentStatus)) return false;
  return op === 'UPDATE' || op === 'RESOLVE' || op === 'CANCEL';
}

// 套用 op 後的新狀態；UPDATE 維持 planned（改期回 planned），RESOLVE/CANCEL 進終止態。
export function nextStatusForOp(op, currentStatus) {
  if (op === 'RESOLVE') return 'resolved';
  if (op === 'CANCEL') return 'cancelled';
  if (op === 'UPDATE') return 'planned'; // 改期/補充一律回到 planned
  return currentStatus;
}

// ── 5. Fingerprint 去重與防復活（§12）────────────────────────────────────────
// 正規化只用於比對，不覆寫使用者看到的原文。容忍全半形空白與常見標點，不做過度合併。
export function normalizeForFingerprint(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    // 全形/半形常見標點一律去除，避免「面試。」與「面試」被視為不同
    .replace(/[。，、！？：；~～·．…「」『』（）()【】\[\]{}"'`,.!?:;-]/g, '');
}

// 本地 fingerprint：charId + 正規化 kind/owner/title + eventDate。
export function threadFingerprint({ charId, kind, owner, title, eventDate }) {
  return [
    charId || '',
    normalizeForFingerprint(kind),
    normalizeForFingerprint(owner),
    normalizeForFingerprint(title),
    eventDate || '',
  ].join('|');
}

// 同日期事件的輕微措辭差異比對：兩邊必須有共同主題詞，且不能「各自」都有互斥的
// 額外主題詞。例：「週一參加面試」與「下週一要去面試」都只剩「面試」→ 相同；
// 「Google 面試」與「Apple 面試」兩邊各有不同公司詞 → 不在本地強行合併。
function hasEquivalentTopic(a, b) {
  const ak = deriveMatchKeywords({ title: a.title, detail: a.detail, provided: a.matchKeywords });
  const bk = deriveMatchKeywords({ title: b.title, detail: b.detail, provided: b.matchKeywords });
  if (!ak.length || !bk.length) return false;
  const as = new Set(ak), bs = new Set(bk);
  const shared = ak.some((k) => bs.has(k));
  if (!shared) return false;
  const aHasUnique = ak.some((k) => !bs.has(k));
  const bHasUnique = bk.some((k) => !as.has(k));
  return !(aHasUnique && bHasUnique);
}

// 防復活：先比完整 fingerprint；若標題只是輕微改寫，再以「同角色／類型／owner／非空日期
// ＋相同主題」補一道去重。無日期事件不做模糊合併，避免兩場不同但同主題的事件被誤吃掉。
export function isDuplicateThread(candidate, existingThreads) {
  const fp = threadFingerprint(candidate);
  return (existingThreads || []).some((t) => {
    if (threadFingerprint(t) === fp) return true;
    if (!candidate.eventDate || candidate.eventDate !== t.eventDate) return false;
    if ((candidate.charId || '') !== (t.charId || '')) return false;
    if (normalizeForFingerprint(candidate.kind) !== normalizeForFingerprint(t.kind)) return false;
    if (normalizeForFingerprint(candidate.owner) !== normalizeForFingerprint(t.owner)) return false;
    return hasEquivalentTopic(candidate, t);
  });
}

// ── 6. matchKeywords 停用詞過濾與提及判定（§13.4）───────────────────────────
// 停用詞清單（STOPWORDS）以 importValidation.js 為單一真相來源，runtime 與匯入驗證共用。
// 把候選詞經停用詞與長度過濾；至多 3 個、每個 2–8 字。
function filterKeywords(list) {
  const out = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    // 去全部空白（不只 trim）：提及判定的 hay 也會去空白，帶內部空白的關鍵詞永遠命不中
    const kw = raw.replace(/\s+/g, '');
    if (kw.length < 2 || kw.length > MAX_THREAD_KEYWORD_CHARS) continue;
    if (STOPWORDS.has(kw)) continue;
    if (out.includes(kw)) continue;
    out.push(kw);
    if (out.length >= MAX_THREAD_KEYWORDS) break;
  }
  return out;
}

// 時間片語與常見安排動詞：從 title「整段移除」後剩下的殘段才拿去推主題名詞。
// 直接截頭尾行不通——會把「週一」「月底」當關鍵詞（角色隨口提時間就誤消耗），或在
// 「下週面試改到月底」這種主題被時間包夾時取不到「面試」。先剔除完整時間片語可兩者兼治。
// 含帶數字的日期，故作用在原字串（未去數字）上。
const TITLE_TIME_PHRASE = /今天|明天|後天|大後天|昨天|前天|下星期|下個月|這個月|上個月|下週|這週|本週|上週|月底|月初|月中|週末|平日|最近|早上|中午|下午|晚上|週[一二三四五六日天]|星期[一二三四五六日天]|禮拜[一二三四五六日天]|\d+\s*[月/\-]\s*\d+|\d+\s*[月號點]|安排在|安排|排在|排到|排了|改到|改期|延到|延後|提前|約在|約好|約了|報名|參加|要去|預計|打算|準備/g;

// 由 title 粗切主題名詞（fallback，僅當模型未給可用 matchKeywords 時走）。CJK 無詞界：
// 先移除時間片語，再把殘段切 2→3→4 字子串。2 字最易被角色回覆逐字命中
// （didMentionContinuityThread 用 reply.includes(keyword)），故短的優先、尾端優先
// （中文賓語多在句尾）。刻意不取跨段中段視窗——那會塞進泛動詞碎片抬高「誤判已提及」的
// 假陽性；假陽性＝事件永久靜默消失，是最危險方向（§13.4），漏命中只是多給一次機會，安全。
function deriveFromTitle(title) {
  const segments = (title || '')
    .replace(TITLE_TIME_PHRASE, ' ')
    .replace(/[。，、！？：；~～·．…「」『』（）()【】\[\]{}"'`,.!?:;]/g, ' ')
    .split(/\s+/)
    .map((s) => s.replace(/[0-9A-Za-z]/g, ''))
    .filter((s) => s.length >= 2);
  const cands = [];
  const add = (sub) => { if (sub.length >= 2 && !cands.includes(sub)) cands.push(sub); };
  for (const seg of segments) {
    const n = seg.length;
    for (let len = 2; len <= Math.min(4, n); len++) {
      add(seg.slice(n - len));   // 尾端優先
      add(seg.slice(0, len));    // 再補開頭
    }
  }
  return filterKeywords(cands);
}

// 推導 matchKeywords（§13.4、§9.3）：模型提議 provided 先經本地過濾；過濾後為空
// 則退回由 title（必要時併 detail）推導。凡 title/detail 變更必須重算、不得沿用舊值。
export function deriveMatchKeywords({ title = '', detail = '', provided = null } = {}) {
  if (Array.isArray(provided)) {
    const filtered = filterKeywords(provided);
    if (filtered.length) return filtered;
  }
  const fromTitle = deriveFromTitle(title);
  if (fromTitle.length) return fromTitle;
  return deriveFromTitle(detail);
}

// 提及判定（§13.4）：作用於角色本輪回覆的純文字，去空白後比對。
// matchKeywords 任一命中 → 已提及；皆未命中 → 未提及（無論多少關心語意訊號）。
// 已知可接受漏判：代稱追問（「那邊後來怎麼樣了？」）不命中，判未提及，失敗方向安全。
export function didMentionContinuityThread(replyText, matchKeywords) {
  if (!Array.isArray(matchKeywords) || !matchKeywords.length) return false;
  const hay = (replyText || '').replace(/\s+/g, '');
  if (!hay) return false;
  return matchKeywords.some((kw) => typeof kw === 'string' && kw && hay.includes(kw));
}

// 關心語意訊號：僅供診斷計數，不參與判定（§13.4）。
const CARE_SIGNAL_PATTERN = /怎麼樣|順利嗎|還順利|結果如何|後來|有消息|有結果|還好嗎|加油/;
export function hasCareSignal(replyText) {
  return CARE_SIGNAL_PATTERN.test((replyText || '').replace(/\s+/g, ''));
}

// ── 7. 落庫後消耗與冷卻的狀態轉移（§13.4）───────────────────────────────────
// 依「角色是否確實提及」計算 thread 要打的 patch（純函式，回傳增量，呼叫端負責寫）。
//   - mentioned=true ：設 lastPromptedAt、promptedCount+1、planned→waiting_result
//   - mentioned=false：只 offeredCount+1；達 OFFER_MISS_LIMIT 設 cooldownUntil
// contextThreads 永不走這裡（永不因注入而消耗）。
export function computeMentionPatch(thread, mentioned, nowMs = Date.now()) {
  if (mentioned) {
    const patch = {
      lastPromptedAt: nowMs,
      promptedCount: (thread.promptedCount || 0) + 1,
      updatedAt: nowMs,
    };
    if (thread.status === 'planned') patch.status = 'waiting_result';
    return patch;
  }
  // 冷卻已到期後又漏提：視為新一輪重新起算——offeredCount 歸零重數、清掉舊 cooldownUntil，
  // 而不是在 3 之上再 +1 立刻回鍋冷卻（否則到期後只給一次機會，違反 §13.4「歸零、恢復候選」）。
  const cooldownExpired = thread.cooldownUntil != null && thread.cooldownUntil <= nowMs;
  const offered = (cooldownExpired ? 0 : (thread.offeredCount || 0)) + 1;
  const patch = { offeredCount: offered, updatedAt: nowMs };
  if (cooldownExpired) patch.cooldownUntil = null;
  if (offered >= OFFER_MISS_LIMIT) {
    patch.cooldownUntil = nowMs + COOLDOWN_DAYS * DAY_MS;
  }
  return patch;
}

// 主題編輯後：重算 matchKeywords 並一併解除冷卻（§13.4 兩動作同一次完成）。
// 用於 UI 編輯與模型 UPDATE 改主題；不得保留舊關鍵詞。
export function computeKeywordRefreshPatch({ title = '', detail = '', provided = null } = {}, nowMs = Date.now()) {
  return {
    matchKeywords: deriveMatchKeywords({ title, detail, provided }),
    offeredCount: 0,
    cooldownUntil: null,
    updatedAt: nowMs,
  };
}

// 是否可作為「本輪可行動」action 候選（§13.2）。相關性排序另由呼叫端處理。
export function isActionEligible(thread, nowMs = Date.now()) {
  if (!thread || thread.enabled === false) return false;
  if (thread.status !== 'planned') return false;
  if (thread.followUpAfter == null || thread.followUpAfter > nowMs) return false;
  if (thread.lastPromptedAt != null) return false;
  if (thread.cooldownUntil != null && thread.cooldownUntil > nowMs) return false;
  return true;
}

// ── 8. 每日清理分類（§15）────────────────────────────────────────────────────
// 純分類：回傳 'expire' | 'purge' | 'backfill-closed' | 'keep'。IO 由呼叫端執行。
//   - 'expire'         ：仍為 planned/waiting_result 但已逾期 → 轉 expired 並寫 closedAt
//   - 'purge'          ：closedAt 距今達 30 天 → 刪除結構化紀錄
//   - 'backfill-closed'：終止態卻缺 closedAt 的舊資料 → 以 updatedAt 回填一次（§15），回填後
//                        下輪才可能 purge；不可直接拿 updatedAt 當刪除基準（事後編輯會推後）
//   - 'keep'           ：維持現狀
// closedAt 三種終止狀態共用，不得依賴 updatedAt（使用者事後編輯會把它推後，永遠刪不掉）。
export function classifyThreadCleanup(thread, nowMs = Date.now()) {
  if (!thread) return 'keep';

  // 已關閉：看 closedAt 是否到刪除年限
  if (TERMINAL_STATUSES.has(thread.status)) {
    // 缺 closedAt 的舊資料（§15）：先以 updatedAt 回填一次，不可依 updatedAt 直接算刪除
    if (thread.closedAt == null) return 'backfill-closed';
    if (nowMs - thread.closedAt >= PURGE_AFTER_CLOSED_DAYS * DAY_MS) {
      return 'purge';
    }
    return 'keep';
  }

  // 進行中：判斷是否逾期
  if (thread.status === 'planned' || thread.status === 'waiting_result') {
    if (thread.followUpAfter != null) {
      // 有日期：followUpAfter 過期逾 14 天
      if (nowMs - thread.followUpAfter >= EXPIRE_DATED_AFTER_DAYS * DAY_MS) return 'expire';
    } else {
      // 無日期：updatedAt 逾 90 天無更新
      const base = thread.updatedAt || thread.createdAt || 0;
      if (nowMs - base >= EXPIRE_UNDATED_AFTER_DAYS * DAY_MS) return 'expire';
    }
  }
  return 'keep';
}

// 產生 expire patch（含 closedAt）。清理判定為 'expire' 時用，一律把狀態設成 expired。
export function expirePatch(nowMs = Date.now()) {
  return { status: 'expired', closedAt: nowMs, updatedAt: nowMs };
}

// 缺 closedAt 的終止紀錄回填（§15，classifyThreadCleanup 回 'backfill-closed' 時走這裡）：
// 以 updatedAt（缺則 createdAt，再缺才 now）回填一次。刻意不動 status——故 resolved／cancelled／
// expired 皆適用，不像 expirePatch 會把狀態強制改成 expired。不改 updatedAt，讓 closedAt 忠實
// 反映當初關閉時點、purge 判定不受影響。
export function backfillClosedAtPatch(thread, nowMs = Date.now()) {
  return { closedAt: thread.updatedAt || thread.createdAt || nowMs };
}

// ── 9. Operation parse / normalize（§9.3、§11.4、§18）─────────────────────────
export const MAX_THREAD_OPS = 3; // 每次最多套用 3 個 operations（§18.3）

// 從第一個 `[` 起做括號配對取出完整 JSON 陣列字串（容忍字串內的括號與跳脫、以及巢狀
// matchKeywords 陣列，故不可用貪婪/非貪婪 regex）。找不到平衡陣列回 null。
function extractFirstJsonArray(s) {
  const start = s.indexOf('[');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return s.slice(start, i + 1); }
  }
  return null;
}

// 從模型輸出擷取 operations 原始陣列。相容兩種來源：
//   - 即時擷取器：整段輸出就是 JSON 陣列（可能含 ```json 圍欄或前後贅字）
//   - 總結補漏：尾端 `THREAD_OPS: [...]` 行（比照 BONDS）
// 壞格式一律回 []（§18 安全放棄：不影響聊天／摘要本體）。回傳未正規化的物件陣列。
export function parseThreadOps(text) {
  const s = text || '';
  if (!s.trim()) return [];
  const mk = s.match(/THREAD_OPS[:：]/i);
  const scope = mk ? s.slice(mk.index + mk[0].length) : s;
  const jsonStr = extractFirstJsonArray(scope);
  if (!jsonStr) return [];
  let arr;
  try { arr = JSON.parse(jsonStr); } catch (_) { return []; }
  return Array.isArray(arr) ? arr : [];
}

// 字串欄位正規化：去頭尾空白、空字串回 null、超長截斷到上限（§18.3）。
function clampText(v, max) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

// 填入 ADD／UPDATE 共用的可編輯欄位。title 一併帶入（缺席不設，ADD 由呼叫端驗必填）。
// eventDate 三態：字串合法 → 設；明確 null → 設 null（清除舊日期）；缺席／非法字串 → 不動。
// datePrecision 缺省依有無時間推定。sourcePreview／時間戳／status 一律不收模型值（本地決定）。
function fillEditableFields(out, raw) {
  const title = clampText(raw.title, MAX_THREAD_TITLE_CHARS);
  if (title) out.title = title;
  const detail = clampText(raw.detail, MAX_THREAD_TEXT_CHARS);
  if (detail) out.detail = detail;
  if (raw.eventDate === null) {
    out.eventDate = null; // 明確清除日期（無日期更新）
  } else if (typeof raw.eventDate === 'string' && isValidLocalDateString(raw.eventDate)) {
    out.eventDate = raw.eventDate;
    out.eventTime = (typeof raw.eventTime === 'string' && isValidLocalTimeString(raw.eventTime)) ? raw.eventTime : null;
    out.datePrecision = THREAD_PRECISIONS.has(raw.datePrecision) ? raw.datePrecision : (out.eventTime ? 'time' : 'date');
  }
  if (Array.isArray(raw.matchKeywords)) out.matchKeywords = raw.matchKeywords; // 交給 deriveMatchKeywords 過濾
  if (THREAD_KINDS.has(raw.kind)) out.kind = raw.kind;
  if (THREAD_OWNERS.has(raw.owner)) out.owner = raw.owner;
}

// 把單一 raw op 正規化＋驗證為安全 op；不合規回 null（§18 安全放棄）。
export function normalizeThreadOp(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const op = typeof raw.op === 'string' ? raw.op.trim().toUpperCase() : '';
  if (!THREAD_OPS.has(op)) return null;
  if (op === 'NONE') return { op: 'NONE' };

  if (op === 'ADD') {
    const out = { op };
    fillEditableFields(out, raw);
    if (!out.title) return null; // ADD 必須有標題
    return out;
  }
  // UPDATE / RESOLVE / CANCEL 必須帶 id
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id) return null;
  const out = { op, id };
  if (op === 'UPDATE') fillEditableFields(out, raw);
  else { // RESOLVE / CANCEL 可附結果文字
    const result = clampText(raw.result, MAX_THREAD_TEXT_CHARS);
    if (result) out.result = result;
  }
  return out;
}

// 正規化整批 ops：濾掉不合規與 NONE，至多保留 MAX_THREAD_OPS 個。
export function normalizeThreadOps(rawArray) {
  const out = [];
  for (const raw of Array.isArray(rawArray) ? rawArray : []) {
    if (out.length >= MAX_THREAD_OPS) break;
    const op = normalizeThreadOp(raw);
    if (op && op.op !== 'NONE') out.push(op);
  }
  return out;
}

// ── 10. 寫前重讀後的原子套用計畫（§12.3）─────────────────────────────────────
function defaultGenId(now, seq) {
  return `thread_${now.toString(36)}_${seq}_${Math.random().toString(36).slice(2, 7)}`;
}

// 純函式：吃「目前 threads 快照（含最近關閉者，供防復活）＋ 已正規化 ops ＋ 來源脈絡」，
// 回傳要寫回 DB 的 thread 陣列（puts）與略過原因（skipped）。呼叫端負責重讀與 dbPut。
// ops 依序處理且後續 op 看得到前面 op 的結果（同一 queue 內一致）。idempotent：ADD 靠
// fingerprint 去重（第二次重跑會看到第一次已寫入的 thread → 略過），UPDATE/RESOLVE/CANCEL
// 天生冪等；per-character queue 保證同角色不會並發套用（見 enqueueThreadTask）。
// sourceCreatedAtEnd：總結補漏傳「transcript 最晚訊息時間」，即時擷取不傳（單點＝earliest==latest）。
// 事件日以 [最早, 最晚] 範圍驗證，避免橫跨多天的總結把早期正確日期誤降為無日期（§10.3）。
export function planThreadApply({
  operations = [], existingThreads = [], charId,
  sourceMsgId = null, sourceCreatedAt = Date.now(), sourceCreatedAtEnd = null, sourcePreview = null,
  now = Date.now(), genId = defaultGenId,
} = {}) {
  const endMs = sourceCreatedAtEnd == null ? sourceCreatedAt : sourceCreatedAtEnd;
  const srcEarliest = Math.min(sourceCreatedAt, endMs);
  const srcLatest = Math.max(sourceCreatedAt, endMs);
  const dateInRange = (d) => d != null && isEventDateWithinRange(d, srcEarliest, srcLatest);

  const working = (existingThreads || []).map((t) => ({ ...t }));
  const byId = new Map(working.map((t) => [t.id, t]));
  const puts = [];
  const skipped = [];
  let addSeq = 0;

  const record = (thread) => {
    byId.set(thread.id, thread);
    const wi = working.findIndex((t) => t.id === thread.id);
    if (wi >= 0) working[wi] = thread; else working.push(thread);
    const pi = puts.findIndex((t) => t.id === thread.id);
    if (pi >= 0) puts[pi] = thread; else puts.push(thread);
  };

  for (const op of operations) {
    if (op.op === 'ADD') {
      const kind = op.kind || 'event';
      const owner = op.owner || 'user';
      // 事件日超出來源日合理範圍 → 視為無日期（不信任離譜時間，§10.3）
      const finalDate = dateInRange(op.eventDate) ? op.eventDate : null;
      const eventTime = finalDate ? (op.eventTime || null) : null;
      const datePrecision = finalDate ? (op.datePrecision || (eventTime ? 'time' : 'date')) : 'unknown';
      const matchKeywords = deriveMatchKeywords({
        title: op.title, detail: op.detail || '', provided: op.matchKeywords || null,
      });
      // 可用 thread 必須至少有一個可判定提及的主題詞；否則永遠無法被消耗，只會反覆注入後冷卻。
      if (!matchKeywords.length) { skipped.push({ op: 'ADD', reason: 'no-keywords', title: op.title }); continue; }
      const candidate = {
        charId, kind, owner, title: op.title, detail: op.detail || '',
        eventDate: finalDate, matchKeywords,
      };
      if (isDuplicateThread(candidate, working)) { skipped.push({ op: 'ADD', reason: 'duplicate', title: op.title }); continue; }
      const thread = {
        id: genId(now, addSeq++), charId, kind, owner,
        title: op.title, detail: op.detail || '',
        matchKeywords,
        eventDate: finalDate, eventTime, datePrecision,
        followUpAfter: computeFollowUpAfter({ eventDate: finalDate, eventTime, datePrecision }),
        status: 'planned', result: null,
        sourceMsgId, sourcePreview,
        enabled: true, lastPromptedAt: null, promptedCount: 0, offeredCount: 0, cooldownUntil: null,
        createdAt: now, updatedAt: now, closedAt: null,
      };
      record(thread);
      continue;
    }

    // UPDATE / RESOLVE / CANCEL
    const cur = byId.get(op.id);
    if (!cur) { skipped.push({ op: op.op, reason: 'not-found', id: op.id }); continue; }
    if (cur.charId !== charId) { skipped.push({ op: op.op, reason: 'char-mismatch', id: op.id }); continue; }
    if (!canApplyOp(op.op, cur.status)) { skipped.push({ op: op.op, reason: 'terminal', id: op.id }); continue; }

    const next = { ...cur, updatedAt: now };
    if (op.op === 'UPDATE') {
      let topicChanged = false, scheduleChanged = false, kwChanged = false; // topic＝title/detail；schedule＝日期/時間/精度
      if (op.title && op.title !== cur.title) { next.title = op.title; topicChanged = true; }
      if (op.detail != null && op.detail !== cur.detail) { next.detail = op.detail; topicChanged = true; }
      if (op.eventDate !== undefined) {
        const finalDate = dateInRange(op.eventDate) ? op.eventDate : null;
        const finalTime = finalDate ? (op.eventTime || null) : null;
        const finalPrec = finalDate ? (op.datePrecision || (finalTime ? 'time' : 'date')) : 'unknown';
        // 同日改時間、改精度都算改期（followUpAfter 依三者算），不能只比日期
        if (finalDate !== cur.eventDate || finalTime !== (cur.eventTime ?? null) || finalPrec !== cur.datePrecision) scheduleChanged = true;
        next.eventDate = finalDate;
        next.eventTime = finalTime;
        next.datePrecision = finalPrec;
      }
      if (scheduleChanged) {
        next.followUpAfter = computeFollowUpAfter({ eventDate: next.eventDate, eventTime: next.eventTime, datePrecision: next.datePrecision });
        next.lastPromptedAt = null; // 改期＝可重新關心一次
      }
      if (topicChanged) {
        const refresh = computeKeywordRefreshPatch({
          title: next.title, detail: next.detail, provided: op.matchKeywords || null,
        }, now);
        if (!refresh.matchKeywords.length) {
          skipped.push({ op: 'UPDATE', reason: 'no-keywords', id: op.id });
          continue;
        }
        Object.assign(next, refresh);
      } else if (Array.isArray(op.matchKeywords)) {
        const newKw = deriveMatchKeywords({ title: next.title, detail: next.detail, provided: op.matchKeywords });
        // 只在推導出非空且與現值不同時才更新：keywords-only 的 UPDATE 絕不能把主題詞清空
        // （與 ADD／改標題的 no-keywords 防線一致——清空＝事件永遠判「未提及」、無法消耗）。
        if (newKw.length && JSON.stringify(newKw) !== JSON.stringify(cur.matchKeywords || [])) { next.matchKeywords = newKw; kwChanged = true; }
      }
      // 空 UPDATE（無任何實際變更）不寫入、不刷新 updatedAt——否則無日期事件會一直逃過 90 天清理，
      // 且重跑同一 UPDATE 不再冪等（§21.4）。
      if (!topicChanged && !scheduleChanged && !kwChanged) { skipped.push({ op: 'UPDATE', reason: 'no-op', id: op.id }); continue; }
      // §5.3：只有改期才把 waiting_result 拉回 planned、重新開放追問；純補充/改標題維持原狀態。
      next.status = scheduleChanged ? nextStatusForOp('UPDATE', cur.status) : cur.status;
    } else {
      next.status = op.op === 'RESOLVE' ? 'resolved' : 'cancelled';
      if (op.result) next.result = op.result;
      next.closedAt = now;
    }
    record(next);
  }
  return { puts, skipped };
}

// ── 11. Per-character 序列化 queue（§12.3）───────────────────────────────────
// 即時擷取與總結補漏對「同一角色」的套用必須串接，避免兩者同時讀到舊狀態後重複新增。
// 每角色維持一條 Promise 鏈；任一 task 失敗只斷開自己、不影響後續（回傳會 reject 供呼叫端
// 自行處理，但鏈本身以吞錯的 tail 續接）。
const threadQueues = new Map();

export function enqueueThreadTask(charId, task) {
  const prev = threadQueues.get(charId) || Promise.resolve();
  const run = prev.then(() => task());
  threadQueues.set(charId, run.catch(() => {}));
  return run;
}

// 測試用：清掉某角色（或全部）的 queue 狀態。
export function _resetThreadQueues(charId = null) {
  if (charId == null) threadQueues.clear();
  else threadQueues.delete(charId);
}
