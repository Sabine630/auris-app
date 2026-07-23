// ── P131 待續記憶純函式核心測試（批次 2）─────────────────────────────────────
// 對應計畫 §21 測試矩陣：本地閘門、日期、operations/狀態、提及判定正反例、清理。
import { describe, it, expect } from 'vitest';
import {
  looksLikeThreadCandidate, isConfirmationText, evaluateCandidateTurn,
  parseLocalDateParts, buildLocalDate, isEventDateWithinWindow, isEventDateWithinRange, computeFollowUpAfter,
  canApplyOp, nextStatusForOp, THREAD_OPS, TERMINAL_STATUSES,
  normalizeForFingerprint, threadFingerprint, isDuplicateThread,
  deriveMatchKeywords, didMentionContinuityThread, hasCareSignal,
  computeMentionPatch, computeKeywordRefreshPatch, isActionEligible,
  classifyThreadCleanup, expirePatch, backfillClosedAtPatch,
  parseThreadOps, normalizeThreadOp, normalizeThreadOps, planThreadApply,
  enqueueThreadTask, _resetThreadQueues, MAX_THREAD_OPS,
  OFFER_MISS_LIMIT, COOLDOWN_DAYS,
} from '../continuity.js';

const DAY = 86400000;

// ── §21.1 本地閘門 ──────────────────────────────────────────────────────────
describe('looksLikeThreadCandidate', () => {
  it('單句計畫命中', () => {
    expect(looksLikeThreadCandidate('我明天下午要面試')).toBe(true);
    expect(looksLikeThreadCandidate('下週一要去看牙醫')).toBe(true);
    expect(looksLikeThreadCandidate('我答應下次一起去看電影')).toBe(true);
  });
  it('狀態更新命中', () => {
    expect(looksLikeThreadCandidate('面試改期了')).toBe(true);
    expect(looksLikeThreadCandidate('考完了好累')).toBe(true);
    expect(looksLikeThreadCandidate('結果出來了')).toBe(true);
  });
  it('普通閒聊不命中', () => {
    expect(looksLikeThreadCandidate('哈哈你好可愛')).toBe(false);
    expect(looksLikeThreadCandidate('我喜歡你')).toBe(false);
    expect(looksLikeThreadCandidate('謝謝你陪我聊天')).toBe(false);
    expect(looksLikeThreadCandidate('')).toBe(false);
    expect(looksLikeThreadCandidate(null)).toBe(false);
  });
  it('閘門刻意略寬：含時間詞的閒聊也會命中（未命中才零 API，命中交擷取器再判）', () => {
    expect(looksLikeThreadCandidate('今天天氣真好')).toBe(true); // 「今天」是訊號，寧可略寬
  });
});

describe('isConfirmationText', () => {
  it('確認/否定詞命中', () => {
    for (const t of ['對', '對啊', '嗯嗯', '好', '是的', '沒有', '不用', '還沒']) {
      expect(isConfirmationText(t)).toBe(true);
    }
  });
  it('帶內容的句子不算純確認', () => {
    expect(isConfirmationText('對啊我很緊張')).toBe(false);
    expect(isConfirmationText('好的我明天去')).toBe(false);
  });
});

describe('evaluateCandidateTurn — §8 錨定規則', () => {
  it('rule1 本輪自身命中', () => {
    const r = evaluateCandidateTurn({ newUserText: '我明天要面試' });
    expect(r.candidate).toBe(true);
    expect(r.reason).toBe('self');
  });

  it('rule2 確認式：計畫 §8 明列的「對啊，好緊張」＋上一則角色訊息命中', () => {
    // 確認詞起頭、後接標點即算確認，故此正是計畫範例（不再退回較弱的純「對」）
    const r = evaluateCandidateTurn({
      newUserText: '對啊，好緊張',
      prevCharText: '你不是說明天要面試嗎？',
    });
    expect(r.candidate).toBe(true);
    expect(r.reason).toBe('confirm');
    expect(r.text).toContain('面試');
    // 純確認詞同樣成立
    const r2 = evaluateCandidateTurn({
      newUserText: '對',
      prevCharText: '你不是說明天要面試嗎？',
    });
    expect(r2.candidate).toBe(true);
    expect(r2.reason).toBe('confirm');
  });

  it('確認詞後非邊界不誤判：「對了我要說」「好久不見」不是確認', () => {
    expect(isConfirmationText('對了我要說')).toBe(false);
    expect(isConfirmationText('好久不見')).toBe(false);
  });

  it('rule3 拆句：兩半各自不命中、合併才命中（數字日期被拆成兩泡泡）', () => {
    // 「號」單獨無數字不命中；「生日聚會在28」無訊號；合併「...28號」命中日期
    const r = evaluateCandidateTurn({
      newUserText: '號',
      prevUserText: '生日聚會在28',
    });
    expect(r.candidate).toBe(true);
    expect(r.reason).toBe('split');
    expect(r.text).toBe('生日聚會在28號');
  });

  it('第二句自帶訊號時走 rule1（self），不需要拆句', () => {
    // 計畫範例「我下週一」＋「要去面試」：「要去面試」含「要去」，rule1 即接住
    const r = evaluateCandidateTurn({
      newUserText: '要去面試',
      prevUserText: '我下週一',
    });
    expect(r.candidate).toBe(true);
    expect(r.reason).toBe('self');
  });

  it('關鍵：上一則 user 已自帶訊號時，rule3 不重複觸發（交給呼叫端去重，這裡回 no-signal）', () => {
    const r = evaluateCandidateTurn({
      newUserText: '好緊張',
      prevUserText: '我明天要面試', // 已自帶訊號
    });
    expect(r.candidate).toBe(false);
  });

  it('普通閒聊不命中：窗口留著舊訊號也不靠合併命中', () => {
    const r = evaluateCandidateTurn({
      newUserText: '哈哈你好好笑',
      prevCharText: '你明天要面試對吧', // 上一則角色命中，但本輪不是確認詞
      prevUserText: '早安',
    });
    expect(r.candidate).toBe(false);
  });

  it('空的本輪訊息回 empty', () => {
    expect(evaluateCandidateTurn({ newUserText: '  ' }).candidate).toBe(false);
  });
});

// ── §21.2 日期 ──────────────────────────────────────────────────────────────
describe('parseLocalDateParts / buildLocalDate — round-trip', () => {
  it('合法日期解析', () => {
    expect(parseLocalDateParts('2026-07-27')).toEqual({ y: 2026, mo: 7, d: 27 });
  });
  it('2026-02-30 判 invalid，不滾成 3 月', () => {
    expect(parseLocalDateParts('2026-02-30')).toBeNull();
    expect(buildLocalDate('2026-02-30')).toBeNull();
  });
  it('閏年 2 月 29 有效、平年無效', () => {
    expect(parseLocalDateParts('2028-02-29')).toEqual({ y: 2028, mo: 2, d: 29 }); // 2028 閏
    expect(parseLocalDateParts('2027-02-29')).toBeNull(); // 2027 平
  });
  it('buildLocalDate 用本地建構，不受 UTC 午夜偏移', () => {
    const d = buildLocalDate('2026-07-27');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // 7 月 = index 6
    expect(d.getDate()).toBe(27);
    expect(d.getHours()).toBe(0);
  });
  it('buildLocalDate 帶時間', () => {
    const d = buildLocalDate('2026-07-27', '14:30');
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });
  it('非法時間回 null', () => {
    expect(buildLocalDate('2026-07-27', '25:00')).toBeNull();
    expect(buildLocalDate('2026-07-27', '12:60')).toBeNull();
  });
});

describe('isEventDateWithinWindow — §10.3 相對來源日的範圍', () => {
  // 來源訊息本地時間：2026-07-20 中午
  const src = new Date(2026, 6, 20, 12, 0).getTime();
  it('未來 366 天內接受，超過拒絕', () => {
    expect(isEventDateWithinWindow('2026-07-27', src)).toBe(true);
    expect(isEventDateWithinWindow('2027-07-20', src)).toBe(true);  // 剛好 365 天
    expect(isEventDateWithinWindow('2027-07-22', src)).toBe(false); // 逾 366 天
  });
  it('早於來源日 14 天內接受，更早拒絕', () => {
    expect(isEventDateWithinWindow('2026-07-10', src)).toBe(true);  // 早 10 天
    expect(isEventDateWithinWindow('2026-07-06', src)).toBe(true);  // 早 14 天
    expect(isEventDateWithinWindow('2026-07-01', src)).toBe(false); // 早 19 天
  });
  it('無日期不受限', () => {
    expect(isEventDateWithinWindow(null, src)).toBe(true);
  });
  it('壞日期字串拒絕', () => {
    expect(isEventDateWithinWindow('2026-02-30', src)).toBe(false);
  });
});

describe('isEventDateWithinRange — 橫跨多天以最早/最晚界判定（§10.3 總結補漏）', () => {
  const early = new Date(2026, 6, 1, 12, 0).getTime();  // 7/1
  const late = new Date(2026, 6, 20, 12, 0).getTime();  // 7/20
  it('相對最早日的近未來（7/1 的明天 7/2）接受', () => {
    expect(isEventDateWithinRange('2026-07-02', early, late)).toBe(true);
  });
  it('早於最早日超過 14 天拒絕', () => {
    expect(isEventDateWithinRange('2026-06-10', early, late)).toBe(false); // 早 21 天
  });
  it('晚於最晚日超過 366 天拒絕', () => {
    expect(isEventDateWithinRange('2027-08-01', early, late)).toBe(false);
  });
  it('單點退化＝與 isEventDateWithinWindow 一致', () => {
    expect(isEventDateWithinRange('2026-07-02', late, late)).toBe(isEventDateWithinWindow('2026-07-02', late));
  });
  it('無日期不受限', () => {
    expect(isEventDateWithinRange(null, early, late)).toBe(true);
  });
});

describe('computeFollowUpAfter — §10.4', () => {
  it('無日期 → null', () => {
    expect(computeFollowUpAfter({ eventDate: null })).toBeNull();
  });
  it('只有日期 → 隔天 08:00', () => {
    const ts = computeFollowUpAfter({ eventDate: '2026-07-27', datePrecision: 'date' });
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(28); // 隔天
    expect(d.getHours()).toBe(8);
  });
  it('跨月/跨年：月底事件隔天進下月/下年', () => {
    const ts = computeFollowUpAfter({ eventDate: '2026-12-31', datePrecision: 'date' });
    const d = new Date(ts);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0); // 1 月
    expect(d.getDate()).toBe(1);
  });
  it('有明確時間 → 事件時間後 3 小時', () => {
    const ts = computeFollowUpAfter({ eventDate: '2026-07-27', eventTime: '14:00', datePrecision: 'time' });
    const d = new Date(ts);
    expect(d.getDate()).toBe(27);
    expect(d.getHours()).toBe(17); // 14 + 3
  });
  it('壞日期 → null', () => {
    expect(computeFollowUpAfter({ eventDate: '2026-02-30', datePrecision: 'date' })).toBeNull();
  });
});

// ── §21.3 Operations 與狀態 ─────────────────────────────────────────────────
describe('operation 白名單與狀態轉換', () => {
  it('只接受五種 op', () => {
    expect([...THREAD_OPS].sort()).toEqual(['ADD', 'CANCEL', 'NONE', 'RESOLVE', 'UPDATE']);
  });
  it('canApplyOp：終止狀態拒絕一般 op', () => {
    for (const s of TERMINAL_STATUSES) {
      expect(canApplyOp('UPDATE', s)).toBe(false);
      expect(canApplyOp('RESOLVE', s)).toBe(false);
      expect(canApplyOp('CANCEL', s)).toBe(false);
    }
    expect(canApplyOp('ADD', 'resolved')).toBe(true); // ADD 是新事件，不受終止態限制
    expect(canApplyOp('NONE', 'cancelled')).toBe(true);
  });
  it('canApplyOp：planned/waiting_result 可更新', () => {
    expect(canApplyOp('UPDATE', 'planned')).toBe(true);
    expect(canApplyOp('RESOLVE', 'waiting_result')).toBe(true);
  });
  it('nextStatusForOp：UPDATE 回 planned（改期），RESOLVE/CANCEL 進終止', () => {
    expect(nextStatusForOp('UPDATE', 'waiting_result')).toBe('planned');
    expect(nextStatusForOp('RESOLVE', 'waiting_result')).toBe('resolved');
    expect(nextStatusForOp('CANCEL', 'planned')).toBe('cancelled');
    expect(nextStatusForOp('NONE', 'planned')).toBe('planned');
  });
});

// ── §12 Fingerprint 去重與防復活 ────────────────────────────────────────────
describe('fingerprint', () => {
  it('normalize 容忍全半形空白與標點', () => {
    expect(normalizeForFingerprint('週一 參加 面試。')).toBe(normalizeForFingerprint('週一參加面試'));
    expect(normalizeForFingerprint('面試！')).toBe(normalizeForFingerprint('面試'));
  });
  it('同事件不同標點視為重複', () => {
    const a = { charId: 'c1', kind: 'event', owner: 'user', title: '週一參加面試', eventDate: '2026-07-27' };
    const b = { charId: 'c1', kind: 'event', owner: 'user', title: '週一 參加面試！', eventDate: '2026-07-27' };
    expect(threadFingerprint(a)).toBe(threadFingerprint(b));
    expect(isDuplicateThread(b, [a])).toBe(true);
  });
  it('不同角色/不同日期不算重複', () => {
    const a = { charId: 'c1', kind: 'event', owner: 'user', title: '面試', eventDate: '2026-07-27' };
    const b = { charId: 'c2', kind: 'event', owner: 'user', title: '面試', eventDate: '2026-07-27' };
    const c = { charId: 'c1', kind: 'event', owner: 'user', title: '面試', eventDate: '2026-08-01' };
    expect(isDuplicateThread(b, [a])).toBe(false);
    expect(isDuplicateThread(c, [a])).toBe(false);
  });
  it('已關閉事件的 fingerprint 命中即擋 ADD（防復活）', () => {
    const closed = { charId: 'c1', kind: 'event', owner: 'user', title: '面試', eventDate: '2026-07-27', status: 'resolved' };
    const revive = { charId: 'c1', kind: 'event', owner: 'user', title: '面試', eventDate: '2026-07-27' };
    expect(isDuplicateThread(revive, [closed])).toBe(true);
  });
  it('同日同主題的輕微改寫視為重複', () => {
    const a = {
      charId: 'c1', kind: 'event', owner: 'user',
      title: '週一參加面試', eventDate: '2026-07-27', matchKeywords: ['面試'],
    };
    const b = {
      charId: 'c1', kind: 'event', owner: 'user',
      title: '下週一要去面試', eventDate: '2026-07-27', matchKeywords: ['面試'],
    };
    expect(threadFingerprint(a)).not.toBe(threadFingerprint(b));
    expect(isDuplicateThread(b, [a])).toBe(true);
  });
  it('同日但各有不同專名時不做模糊合併', () => {
    const google = {
      charId: 'c1', kind: 'event', owner: 'user',
      title: 'Google 面試', eventDate: '2026-07-27', matchKeywords: ['Google', '面試'],
    };
    const apple = {
      charId: 'c1', kind: 'event', owner: 'user',
      title: 'Apple 面試', eventDate: '2026-07-27', matchKeywords: ['Apple', '面試'],
    };
    expect(isDuplicateThread(apple, [google])).toBe(false);
  });
});

// ── §13.4 matchKeywords 與提及判定 ──────────────────────────────────────────
describe('deriveMatchKeywords — 停用詞過濾', () => {
  it('模型提議先過濾停用詞', () => {
    const kw = deriveMatchKeywords({ title: '週一面試', provided: ['面試', '明天', '工作', '我'] });
    expect(kw).toContain('面試');
    expect(kw).not.toContain('明天'); // 時間詞
    expect(kw).not.toContain('工作'); // 泛用詞
    expect(kw).not.toContain('我');   // 人稱 + 長度不足
  });
  it('至多 3 個', () => {
    const kw = deriveMatchKeywords({ title: 'x', provided: ['面試', '回診', '搬家', '考試', '報到'] });
    expect(kw.length).toBeLessThanOrEqual(3);
  });
  it('過濾後為空 → 由 title 推導出「能被回覆逐字命中」的主題名詞', () => {
    // 關鍵回歸：不只檢查 includes 子字串，而是真的餵進 didMentionContinuityThread。
    // 舊實作優先取 4 字滑動片段（週一參加／一參加面／參加面試），角色說「面試順利嗎」全數落空。
    const kw = deriveMatchKeywords({ title: '週一參加面試', provided: ['明天', '工作'] });
    expect(kw).toContain('面試'); // 尾端 2 字主題名詞排最前
    expect(didMentionContinuityThread('面試順利嗎？', kw)).toBe(true);
    expect(didMentionContinuityThread('面試加油！', kw)).toBe(true);
  });
  it('provided 缺省時由 title 推導，且推導詞能真正命中回覆', () => {
    const kw = deriveMatchKeywords({ title: '月底要去回診' });
    expect(kw.length).toBeGreaterThan(0);
    expect(didMentionContinuityThread('回診結果如何？', kw)).toBe(true);
  });
  it('主題在標題開頭、時間在後也能命中（不只取尾端）', () => {
    // 面試在前、時間在後：舊尾端實作只取「下週一」會漏掉「面試」
    const kw1 = deriveMatchKeywords({ title: '面試改到下週一' });
    expect(kw1).toContain('面試');
    expect(didMentionContinuityThread('面試順利嗎？', kw1)).toBe(true);

    const kw2 = deriveMatchKeywords({ title: '回診安排在月底' });
    expect(kw2).toContain('回診');
    expect(didMentionContinuityThread('回診結果如何？', kw2)).toBe(true);
  });
  it('主題被時間片語包夾（下週面試改到月底）仍取得「面試」', () => {
    const kw = deriveMatchKeywords({ title: '下週面試改到月底' });
    expect(kw).toContain('面試');
    expect(didMentionContinuityThread('面試順利嗎？', kw)).toBe(true);
  });
  it('先移除時間片語 → 時間詞不會變成關鍵詞（角色只提時間不誤消耗）', () => {
    // 「週一參加面試」不得產出「週一」；否則角色說「週一有空嗎」會被誤判已提及
    const kw = deriveMatchKeywords({ title: '週一參加面試' });
    expect(kw).not.toContain('週一');
    expect(didMentionContinuityThread('週一有空嗎？', kw)).toBe(false);
    expect(didMentionContinuityThread('面試順利嗎？', kw)).toBe(true);
  });
  it('內部含空白的候選詞去空白後才存（提及判定才命得中）', () => {
    const kw = deriveMatchKeywords({ provided: ['面 試'] });
    expect(kw).toContain('面試');
    expect(didMentionContinuityThread('面試順利嗎？', kw)).toBe(true);
  });
});

describe('didMentionContinuityThread — §13.4 正反例', () => {
  const kw = ['面試'];
  it('正例：關鍵詞出現即判已提及（含非疑問語氣）', () => {
    expect(didMentionContinuityThread('面試還順利嗎？', kw)).toBe(true);
    expect(didMentionContinuityThread('面試加油！', kw)).toBe(true);       // 無疑問也算提及
    expect(didMentionContinuityThread('面試那天早點出門', kw)).toBe(true);
  });
  it('反例：無關鍵詞不判提及，無論多少關心語意', () => {
    expect(didMentionContinuityThread('你最近工作還好嗎？', kw)).toBe(false);
    expect(didMentionContinuityThread('月底一起去看電影吧', ['回診'])).toBe(false);
  });
  it('已知可接受漏判：代稱追問不命中', () => {
    expect(didMentionContinuityThread('那邊後來怎麼樣了？', kw)).toBe(false);
  });
  it('空關鍵詞或空回覆 → 不提及', () => {
    expect(didMentionContinuityThread('面試順利嗎', [])).toBe(false);
    expect(didMentionContinuityThread('', kw)).toBe(false);
  });
  it('關心語意訊號只作診斷，不影響判定', () => {
    expect(hasCareSignal('面試後來怎麼樣')).toBe(true);
    expect(hasCareSignal('面試加油')).toBe(true);
    // 有訊號但無關鍵詞仍不消耗
    expect(didMentionContinuityThread('後來怎麼樣了', kw)).toBe(false);
  });
});

// ── §13.4 消耗、冷卻與候選資格 ──────────────────────────────────────────────
describe('computeMentionPatch — 消耗與冷卻', () => {
  const now = new Date(2026, 6, 28, 10, 0).getTime();
  it('已提及：planned → waiting_result 並設 lastPromptedAt', () => {
    const p = computeMentionPatch({ status: 'planned', promptedCount: 0 }, true, now);
    expect(p.status).toBe('waiting_result');
    expect(p.lastPromptedAt).toBe(now);
    expect(p.promptedCount).toBe(1);
  });
  it('已提及但已在 waiting_result：不改回 planned', () => {
    const p = computeMentionPatch({ status: 'waiting_result', promptedCount: 1 }, true, now);
    expect(p.status).toBeUndefined();
    expect(p.promptedCount).toBe(2);
  });
  it('未提及：只加 offeredCount，未達上限不冷卻', () => {
    const p = computeMentionPatch({ status: 'planned', offeredCount: 0 }, false, now);
    expect(p.offeredCount).toBe(1);
    expect(p.cooldownUntil).toBeUndefined();
    expect(p.status).toBeUndefined();
    expect(p.lastPromptedAt).toBeUndefined();
  });
  it('未提及達 OFFER_MISS_LIMIT：設冷卻 COOLDOWN_DAYS 天', () => {
    const p = computeMentionPatch({ status: 'planned', offeredCount: OFFER_MISS_LIMIT - 1 }, false, now);
    expect(p.offeredCount).toBe(OFFER_MISS_LIMIT);
    expect(p.cooldownUntil).toBe(now + COOLDOWN_DAYS * DAY);
  });
  it('冷卻到期後再漏提：offeredCount 歸零重新起算、清掉舊冷卻（§13.4，不是在 3 上 +1 立刻回鍋）', () => {
    const thread = { status: 'planned', offeredCount: OFFER_MISS_LIMIT, cooldownUntil: now - DAY };
    const p = computeMentionPatch(thread, false, now);
    expect(p.offeredCount).toBe(1);       // 重新從 1 起算，而非 4
    expect(p.cooldownUntil).toBeNull();   // 舊冷卻清空，未再達上限故不重設
  });
  it('冷卻未到期時（理論上不會被注入）維持累加語意，不歸零', () => {
    const thread = { status: 'planned', offeredCount: OFFER_MISS_LIMIT - 1, cooldownUntil: now + DAY };
    const p = computeMentionPatch(thread, false, now);
    expect(p.offeredCount).toBe(OFFER_MISS_LIMIT);
  });
});

describe('computeKeywordRefreshPatch — 編輯後重算並解除冷卻', () => {
  it('主題改變後舊詞失效、新詞生效，且冷卻清零', () => {
    const now = Date.now();
    const patch = computeKeywordRefreshPatch({ title: '報到', provided: null }, now);
    expect(patch.matchKeywords.some((k) => k.includes('報到'))).toBe(true);
    expect(patch.matchKeywords).not.toContain('面試'); // 舊詞不得殘留
    expect(patch.offeredCount).toBe(0);
    expect(patch.cooldownUntil).toBeNull();
  });
});

describe('isActionEligible — action 候選資格', () => {
  const now = new Date(2026, 6, 28, 10, 0).getTime();
  const base = { enabled: true, status: 'planned', followUpAfter: now - DAY, lastPromptedAt: null, cooldownUntil: null };
  it('全部條件符合 → 合格', () => {
    expect(isActionEligible(base, now)).toBe(true);
  });
  it('followUpAfter 未到 → 不合格', () => {
    expect(isActionEligible({ ...base, followUpAfter: now + DAY }, now)).toBe(false);
  });
  it('已被詢問過 → 不合格', () => {
    expect(isActionEligible({ ...base, lastPromptedAt: now - 100 }, now)).toBe(false);
  });
  it('冷卻中 → 不合格', () => {
    expect(isActionEligible({ ...base, cooldownUntil: now + DAY }, now)).toBe(false);
  });
  it('冷卻已過 → 合格', () => {
    expect(isActionEligible({ ...base, cooldownUntil: now - 100 }, now)).toBe(true);
  });
  it('角色關閉或非 planned → 不合格', () => {
    expect(isActionEligible({ ...base, enabled: false }, now)).toBe(false);
    expect(isActionEligible({ ...base, status: 'waiting_result' }, now)).toBe(false);
  });
});

// ── §15 每日清理分類 ────────────────────────────────────────────────────────
describe('classifyThreadCleanup — §15', () => {
  const now = new Date(2026, 6, 28, 10, 0).getTime();
  it('有日期且 followUpAfter 逾 14 天仍未結案 → expire', () => {
    const t = { status: 'planned', followUpAfter: now - 15 * DAY };
    expect(classifyThreadCleanup(t, now)).toBe('expire');
  });
  it('有日期但逾期未滿 14 天 → keep', () => {
    const t = { status: 'planned', followUpAfter: now - 10 * DAY };
    expect(classifyThreadCleanup(t, now)).toBe('keep');
  });
  it('無日期且 updatedAt 逾 90 天 → expire', () => {
    const t = { status: 'waiting_result', followUpAfter: null, updatedAt: now - 91 * DAY };
    expect(classifyThreadCleanup(t, now)).toBe('expire');
  });
  it('無日期但更新在 90 天內 → keep', () => {
    const t = { status: 'planned', followUpAfter: null, updatedAt: now - 30 * DAY };
    expect(classifyThreadCleanup(t, now)).toBe('keep');
  });
  it('已關閉且 closedAt 逾 30 天 → purge', () => {
    const t = { status: 'resolved', closedAt: now - 31 * DAY };
    expect(classifyThreadCleanup(t, now)).toBe('purge');
  });
  it('已關閉但 closedAt 未滿 30 天 → keep', () => {
    const t = { status: 'cancelled', closedAt: now - 10 * DAY };
    expect(classifyThreadCleanup(t, now)).toBe('keep');
  });
  it('關鍵：purge 依 closedAt 不依 updatedAt（事後編輯不該讓紀錄永遠刪不掉）', () => {
    // updatedAt 很新（使用者剛編輯過），但 closedAt 已逾 30 天 → 仍應 purge
    const t = { status: 'expired', closedAt: now - 31 * DAY, updatedAt: now - 100 };
    expect(classifyThreadCleanup(t, now)).toBe('purge');
  });
  it('expirePatch 一律帶 closedAt', () => {
    const p = expirePatch(now);
    expect(p.status).toBe('expired');
    expect(p.closedAt).toBe(now);
  });
  it('終止態缺 closedAt 的舊資料 → backfill-closed（不是永遠 keep）', () => {
    expect(classifyThreadCleanup({ status: 'resolved', updatedAt: now - 100 * DAY }, now)).toBe('backfill-closed');
    expect(classifyThreadCleanup({ status: 'cancelled', closedAt: null, updatedAt: now }, now)).toBe('backfill-closed');
  });
  it('backfillClosedAtPatch 以 updatedAt 回填 closedAt、不改 status（resolved/cancelled 皆可用）', () => {
    const p = backfillClosedAtPatch({ status: 'cancelled', updatedAt: now - 40 * DAY }, now);
    expect(p.closedAt).toBe(now - 40 * DAY);
    expect(p.status).toBeUndefined(); // 有別於 expirePatch，不強制改 expired
  });
  it('回填後：若回填的 closedAt 已逾 30 天，下一輪即可 purge', () => {
    const backfilled = { status: 'resolved', closedAt: now - 40 * DAY };
    expect(classifyThreadCleanup(backfilled, now)).toBe('purge');
  });
});

// ── §9.3／§11.4 Operation parse／normalize ──────────────────────────────────
describe('parseThreadOps — 容錯擷取 operations 陣列', () => {
  it('即時擷取器：整段就是 JSON 陣列', () => {
    const ops = parseThreadOps('[{"op":"ADD","title":"面試"}]');
    expect(ops).toEqual([{ op: 'ADD', title: '面試' }]);
  });
  it('容忍 ```json 圍欄與前後贅字', () => {
    const ops = parseThreadOps('好的，這是結果：\n```json\n[{"op":"NONE"}]\n```\n謝謝');
    expect(ops).toEqual([{ op: 'NONE' }]);
  });
  it('總結尾段 THREAD_OPS 標記，含巢狀 matchKeywords（不可被非貪婪 regex 截斷）', () => {
    const raw = '這是摘要文字。\nBONDS: ["約定"]\nTHREAD_OPS: [{"op":"ADD","title":"回診","matchKeywords":["回診"]}]';
    const ops = parseThreadOps(raw);
    expect(ops).toEqual([{ op: 'ADD', title: '回診', matchKeywords: ['回診'] }]);
  });
  it('壞 JSON／非陣列／空白 → 空陣列（安全放棄）', () => {
    expect(parseThreadOps('[{op:ADD}')).toEqual([]);
    expect(parseThreadOps('THREAD_OPS: {"op":"ADD"}')).toEqual([]);
    expect(parseThreadOps('')).toEqual([]);
    expect(parseThreadOps('沒有任何陣列')).toEqual([]);
  });
});

describe('normalizeThreadOp／normalizeThreadOps — allowlist 與欄位驗證', () => {
  it('未知 op、缺 title 的 ADD、缺 id 的 UPDATE 皆回 null', () => {
    expect(normalizeThreadOp({ op: 'DELETE', id: 'x' })).toBeNull();
    expect(normalizeThreadOp({ op: 'ADD' })).toBeNull();
    expect(normalizeThreadOp({ op: 'UPDATE' })).toBeNull();
    expect(normalizeThreadOp({ op: 'RESOLVE' })).toBeNull();
  });
  it('op 大小寫容忍、NONE 正規化保留', () => {
    expect(normalizeThreadOp({ op: 'add', title: '面試' })).toMatchObject({ op: 'ADD', title: '面試' });
    expect(normalizeThreadOp({ op: 'none' })).toEqual({ op: 'NONE' });
  });
  it('無效日期整組忽略、datePrecision 依有無時間推定', () => {
    expect(normalizeThreadOp({ op: 'ADD', title: '面試', eventDate: '2026-02-30' }).eventDate).toBeUndefined();
    const withTime = normalizeThreadOp({ op: 'ADD', title: '面試', eventDate: '2026-07-27', eventTime: '14:00' });
    expect(withTime.datePrecision).toBe('time');
    const dateOnly = normalizeThreadOp({ op: 'ADD', title: '面試', eventDate: '2026-07-27' });
    expect(dateOnly.datePrecision).toBe('date');
  });
  it('超長 title/detail 截斷到上限、不整組丟棄', () => {
    const op = normalizeThreadOp({ op: 'ADD', title: '字'.repeat(500), detail: '詳'.repeat(9000) });
    expect(op.title.length).toBe(200);
    expect(op.detail.length).toBe(4000);
  });
  it('UPDATE 經 normalizer 保留 title（回歸：舊版遺失 title 導致標題不變、關鍵詞卻變）', () => {
    const op = normalizeThreadOp({ op: 'UPDATE', id: 'x', title: '新公司報到' });
    expect(op.title).toBe('新公司報到');
  });
  it('UPDATE eventDate 三態：合法字串設值、明確 null 清除、缺席不動', () => {
    expect(normalizeThreadOp({ op: 'UPDATE', id: 'x', eventDate: '2026-07-27' }).eventDate).toBe('2026-07-27');
    expect(normalizeThreadOp({ op: 'UPDATE', id: 'x', eventDate: null }).eventDate).toBeNull();
    expect('eventDate' in normalizeThreadOp({ op: 'UPDATE', id: 'x', title: '改' })).toBe(false);
  });
  it('normalizeThreadOps 濾掉 NONE 與不合規、至多 3 個', () => {
    const ops = normalizeThreadOps([
      { op: 'NONE' },
      { op: 'ADD', title: '面試' },
      { op: 'BOGUS' },
      { op: 'ADD', title: '回診' },
      { op: 'ADD', title: '搬家' },
      { op: 'ADD', title: '考試' }, // 第 4 個合規 → 被 3 個上限擋掉
    ]);
    expect(ops.length).toBe(MAX_THREAD_OPS);
    expect(ops.map(o => o.title)).toEqual(['面試', '回診', '搬家']);
  });
});

// ── §12.3 寫前重讀後的原子套用計畫 ───────────────────────────────────────────
describe('planThreadApply — ADD／UPDATE／RESOLVE／CANCEL', () => {
  const now = new Date(2026, 6, 23, 10, 0).getTime();
  const src = new Date(2026, 6, 23, 9, 0).getTime();
  const genId = (n, seq) => `t_${seq}`;
  const base = { charId: 'c1', sourceMsgId: 'msg_1', sourceCreatedAt: src, sourcePreview: '我下週一要面試', now, genId };

  it('ADD 建出完整 planned thread（含 followUpAfter／matchKeywords／時間戳）', () => {
    const { puts } = planThreadApply({
      ...base, existingThreads: [],
      operations: [{ op: 'ADD', title: '週一參加面試', eventDate: '2026-07-27', datePrecision: 'date' }],
    });
    expect(puts.length).toBe(1);
    const t = puts[0];
    expect(t).toMatchObject({
      id: 't_0', charId: 'c1', kind: 'event', owner: 'user', title: '週一參加面試',
      status: 'planned', eventDate: '2026-07-27', datePrecision: 'date',
      sourceMsgId: 'msg_1', sourcePreview: '我下週一要面試',
      promptedCount: 0, offeredCount: 0, cooldownUntil: null, closedAt: null, enabled: true,
      createdAt: now, updatedAt: now,
    });
    expect(t.matchKeywords).toContain('面試');
    expect(t.followUpAfter).toBeGreaterThan(0);
  });

  it('ADD fingerprint 去重：既有相同 thread → 略過（含最近關閉者，防復活）', () => {
    const existing = { id: 'old', charId: 'c1', kind: 'event', owner: 'user', title: '面試', eventDate: '2026-07-27', status: 'resolved' };
    const { puts, skipped } = planThreadApply({
      ...base, existingThreads: [existing],
      operations: [{ op: 'ADD', title: '面試', eventDate: '2026-07-27' }],
    });
    expect(puts.length).toBe(0);
    expect(skipped[0]).toMatchObject({ op: 'ADD', reason: 'duplicate' });
  });

  it('idempotent：把第一次 ADD 的結果當既有再套一次同樣 ADD → 不重複', () => {
    const first = planThreadApply({ ...base, existingThreads: [], operations: [{ op: 'ADD', title: '面試', eventDate: '2026-07-27' }] });
    const second = planThreadApply({ ...base, existingThreads: first.puts, operations: [{ op: 'ADD', title: '面試', eventDate: '2026-07-27' }] });
    expect(second.puts.length).toBe(0);
  });

  it('即時與總結用不同措辭新增同一事件 → 第二次略過', () => {
    const instant = planThreadApply({
      ...base, existingThreads: [],
      operations: [{ op: 'ADD', title: '週一參加面試', eventDate: '2026-07-27', matchKeywords: ['面試'] }],
    });
    const summary = planThreadApply({
      ...base, sourceMsgId: null, existingThreads: instant.puts,
      operations: [{ op: 'ADD', title: '下週一要去面試', eventDate: '2026-07-27', matchKeywords: ['面試'] }],
    });
    expect(instant.puts).toHaveLength(1);
    expect(summary.puts).toHaveLength(0);
    expect(summary.skipped[0]).toMatchObject({ op: 'ADD', reason: 'duplicate' });
  });

  it('ADD 推不出可用 matchKeywords → 略過，不建立永遠無法消耗的 thread', () => {
    const { puts, skipped } = planThreadApply({
      ...base, existingThreads: [],
      operations: [{ op: 'ADD', title: '事情' }],
    });
    expect(puts).toHaveLength(0);
    expect(skipped[0]).toMatchObject({ op: 'ADD', reason: 'no-keywords' });
  });

  it('事件日超出來源日合理範圍 → 視為無日期（followUpAfter null、precision unknown）', () => {
    const { puts } = planThreadApply({
      ...base, existingThreads: [],
      operations: [{ op: 'ADD', title: '面試', eventDate: '2030-01-01' }], // 遠超 366 天
    });
    expect(puts[0].eventDate).toBeNull();
    expect(puts[0].followUpAfter).toBeNull();
    expect(puts[0].datePrecision).toBe('unknown');
  });

  it('UPDATE 改標題 → 重算 matchKeywords、解除冷卻；未改期故維持原狀態（不回 planned）', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'waiting_result', matchKeywords: ['面試'], offeredCount: 2, cooldownUntil: now + DAY, eventDate: null, detail: '' };
    const { puts } = planThreadApply({ ...base, existingThreads: [existing], operations: [{ op: 'UPDATE', id: 'x', title: '報到' }] });
    expect(puts[0].status).toBe('waiting_result'); // §5.3：純改標題不改回 planned
    expect(puts[0].matchKeywords).not.toContain('面試');
    expect(puts[0].matchKeywords.some(k => k.includes('報到'))).toBe(true);
    expect(puts[0].offeredCount).toBe(0);
    expect(puts[0].cooldownUntil).toBeNull();
  });

  it('端到端（經 normalizer）：UPDATE 改標題 → title 與 keywords 一致更新', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'planned', matchKeywords: ['面試'], eventDate: null, detail: '' };
    const ops = normalizeThreadOps([{ op: 'UPDATE', id: 'x', title: '新公司報到', matchKeywords: ['報到'] }]);
    const { puts } = planThreadApply({ ...base, existingThreads: [existing], operations: ops });
    expect(puts[0].title).toBe('新公司報到'); // 不再只變 keywords 卻留舊標題
    expect(puts[0].matchKeywords.some(k => k.includes('報到'))).toBe(true);
    expect(puts[0].matchKeywords).not.toContain('面試');
  });

  it('UPDATE 改成推不出關鍵詞的主題 → 整筆略過並保留既有資料', () => {
    const existing = {
      id: 'x', charId: 'c1', kind: 'event', owner: 'user',
      title: '面試', status: 'planned', matchKeywords: ['面試'], eventDate: null, detail: '',
    };
    const { puts, skipped } = planThreadApply({
      ...base, existingThreads: [existing],
      operations: [{ op: 'UPDATE', id: 'x', title: '事情', detail: '' }],
    });
    expect(puts).toHaveLength(0);
    expect(skipped[0]).toMatchObject({ op: 'UPDATE', reason: 'no-keywords', id: 'x' });
    expect(existing).toMatchObject({ title: '面試', matchKeywords: ['面試'] });
  });

  it('keywords-only UPDATE 推導為空時不清空既有主題詞（title 為停用詞、詞源自 provided）', () => {
    const existing = {
      id: 'x', charId: 'c1', kind: 'event', owner: 'user',
      title: '工作', status: 'planned', matchKeywords: ['面試'], eventDate: null, detail: '',
    };
    const { puts, skipped } = planThreadApply({
      ...base, existingThreads: [existing],
      operations: [{ op: 'UPDATE', id: 'x', matchKeywords: ['工作'] }], // 停用詞＋title 停用詞 → 推不出詞
    });
    expect(puts).toHaveLength(0); // 不套用（no-op），不把 ['面試'] 清成 []
    expect(skipped[0]).toMatchObject({ op: 'UPDATE', reason: 'no-op', id: 'x' });
    expect(existing.matchKeywords).toEqual(['面試']);
  });

  it('端到端（經 normalizer）：UPDATE eventDate:null 清除舊日期與 followUpAfter', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'planned', eventDate: '2026-07-27', datePrecision: 'date', followUpAfter: 123, detail: '' };
    const ops = normalizeThreadOps([{ op: 'UPDATE', id: 'x', eventDate: null }]);
    const { puts } = planThreadApply({ ...base, existingThreads: [existing], operations: ops });
    expect(puts[0].eventDate).toBeNull();
    expect(puts[0].followUpAfter).toBeNull();
    expect(puts[0].datePrecision).toBe('unknown');
  });

  it('§5.3 純補充內容不改回 planned：waiting_result 補 detail 仍 waiting_result、不清 lastPromptedAt', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'waiting_result', eventDate: '2026-07-27', datePrecision: 'date', lastPromptedAt: now - DAY, detail: '' };
    const { puts } = planThreadApply({ ...base, existingThreads: [existing], operations: [{ op: 'UPDATE', id: 'x', detail: '還在等通知' }] });
    expect(puts[0].status).toBe('waiting_result');
    expect(puts[0].lastPromptedAt).toBe(now - DAY);
  });

  it('同日改時間也算改期：重算 followUpAfter、清 lastPromptedAt、waiting_result 回 planned', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'waiting_result', eventDate: '2026-07-27', eventTime: '10:00', datePrecision: 'time', followUpAfter: 111, lastPromptedAt: now - DAY, detail: '' };
    const { puts } = planThreadApply({ ...base, existingThreads: [existing], operations: [{ op: 'UPDATE', id: 'x', eventDate: '2026-07-27', eventTime: '15:00', datePrecision: 'time' }] });
    expect(puts.length).toBe(1);
    expect(puts[0].eventTime).toBe('15:00');
    expect(puts[0].status).toBe('planned');
    expect(puts[0].lastPromptedAt).toBeNull();
    expect(new Date(puts[0].followUpAfter).getHours()).toBe(18); // 15:00 + 3h
  });

  it('空 UPDATE（無實際變更）→ no-op 略過，不寫入也不刷新 updatedAt', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'waiting_result', eventDate: null, datePrecision: 'unknown', updatedAt: now - 100 * DAY, matchKeywords: ['面試'], detail: '' };
    const { puts, skipped } = planThreadApply({ ...base, existingThreads: [existing], operations: [{ op: 'UPDATE', id: 'x' }] });
    expect(puts.length).toBe(0);
    expect(skipped[0].reason).toBe('no-op');
  });

  it('重跑同一 UPDATE 冪等：第二次成為 no-op（title 已是新值、updatedAt 不再被推後）', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'planned', matchKeywords: ['面試'], eventDate: null, detail: '' };
    const ops = [{ op: 'UPDATE', id: 'x', title: '報到' }];
    const first = planThreadApply({ ...base, existingThreads: [existing], operations: ops });
    expect(first.puts.length).toBe(1);
    const second = planThreadApply({ ...base, existingThreads: first.puts, operations: ops });
    expect(second.puts.length).toBe(0);
    expect(second.skipped[0].reason).toBe('no-op');
  });

  it('總結補漏用 transcript 時間範圍驗證：7/1 說的 7/2 在 7/20 總結仍保留日期', () => {
    const early = new Date(2026, 6, 1, 12, 0).getTime();
    const late = new Date(2026, 6, 20, 12, 0).getTime();
    const { puts } = planThreadApply({
      charId: 'c1', existingThreads: [], now: late, genId: (n, s) => `t_${s}`,
      sourceCreatedAt: early, sourceCreatedAtEnd: late,
      operations: [{ op: 'ADD', title: '面試', eventDate: '2026-07-02' }],
    });
    expect(puts[0].eventDate).toBe('2026-07-02'); // 不因距最後訊息 18 天而被降為無日期
  });

  it('UPDATE 改期 → 重算 followUpAfter 並清 lastPromptedAt', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'waiting_result', eventDate: '2026-07-27', datePrecision: 'date', lastPromptedAt: now - DAY, detail: '' };
    const { puts } = planThreadApply({ ...base, existingThreads: [existing], operations: [{ op: 'UPDATE', id: 'x', eventDate: '2026-08-10' }] });
    expect(puts[0].eventDate).toBe('2026-08-10');
    expect(puts[0].lastPromptedAt).toBeNull();
    expect(puts[0].followUpAfter).toBeGreaterThan(now);
  });

  it('RESOLVE／CANCEL → 終止態並寫 closedAt', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'waiting_result' };
    const r = planThreadApply({ ...base, existingThreads: [existing], operations: [{ op: 'RESOLVE', id: 'x', result: '錄取了' }] });
    expect(r.puts[0]).toMatchObject({ status: 'resolved', result: '錄取了', closedAt: now });
    const c = planThreadApply({ ...base, existingThreads: [existing], operations: [{ op: 'CANCEL', id: 'x' }] });
    expect(c.puts[0]).toMatchObject({ status: 'cancelled', closedAt: now });
  });

  it('終止態 thread 不接受 UPDATE/RESOLVE/CANCEL（略過）', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'resolved' };
    const { puts, skipped } = planThreadApply({ ...base, existingThreads: [existing], operations: [{ op: 'UPDATE', id: 'x', title: '改' }] });
    expect(puts.length).toBe(0);
    expect(skipped[0].reason).toBe('terminal');
  });

  it('跨 charId 的 id 不可更新（略過）', () => {
    const other = { id: 'x', charId: 'c2', kind: 'event', owner: 'user', title: '面試', status: 'planned' };
    const { puts, skipped } = planThreadApply({ ...base, existingThreads: [other], operations: [{ op: 'RESOLVE', id: 'x' }] });
    expect(puts.length).toBe(0);
    expect(skipped[0].reason).toBe('char-mismatch');
  });

  it('id 不存在 → 略過（not-found）', () => {
    const { skipped } = planThreadApply({ ...base, existingThreads: [], operations: [{ op: 'UPDATE', id: 'ghost', title: 'x' }] });
    expect(skipped[0].reason).toBe('not-found');
  });

  it('§21.4 後續 op 看得到前面 op 的最新狀態：先 RESOLVE 後 UPDATE 同 id → UPDATE 因已終止被擋', () => {
    const existing = { id: 'x', charId: 'c1', kind: 'event', owner: 'user', title: '面試', status: 'planned' };
    const { puts, skipped } = planThreadApply({
      ...base, existingThreads: [existing],
      operations: [{ op: 'RESOLVE', id: 'x' }, { op: 'UPDATE', id: 'x', title: '改' }],
    });
    expect(puts.length).toBe(1); // 只留 RESOLVE 後的版本
    expect(puts[0].status).toBe('resolved');
    expect(skipped.some(s => s.op === 'UPDATE' && s.reason === 'terminal')).toBe(true);
  });
});

describe('enqueueThreadTask — per-character 序列化', () => {
  it('同角色的 task 依序執行，第二個看得到第一個的結果', async () => {
    _resetThreadQueues('c1');
    const order = [];
    const p1 = enqueueThreadTask('c1', async () => { await new Promise(r => setTimeout(r, 20)); order.push('a'); return 'a'; });
    const p2 = enqueueThreadTask('c1', async () => { order.push('b'); return order.slice(); });
    const [, r2] = await Promise.all([p1, p2]);
    expect(order).toEqual(['a', 'b']); // b 一定在 a 之後
    expect(r2).toEqual(['a', 'b']);
  });
  it('前一個 task 失敗不影響後續 task 執行', async () => {
    _resetThreadQueues('c2');
    const p1 = enqueueThreadTask('c2', async () => { throw new Error('boom'); });
    await expect(p1).rejects.toThrow('boom');
    const p2 = enqueueThreadTask('c2', async () => 'ok');
    await expect(p2).resolves.toBe('ok');
  });
});
