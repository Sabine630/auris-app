import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  dayPeriod, timeAnchorLine, shouldBusyRead, isGoodnightText, sleepRecallState,
  SLEEP_RECALL_MIN_MS, SLEEP_RECALL_MAX_MS,
  buildMemorySummarySystemPrompt, buildSummaryThreadInstr, buildThreadExtractSystem,
  THREAD_FINAL_STATE_RULE,
  getPersonalDateCtx, getKeyDatesCtx,
} from '../chatEngine.js';

describe('dayPeriod — 時段分界', () => {
  it('4→深夜、5→清晨（清晨下界）', () => {
    expect(dayPeriod(4)).toBe('深夜');
    expect(dayPeriod(5)).toBe('清晨');
  });

  it('22→晚上、23→深夜（深夜上界）', () => {
    expect(dayPeriod(22)).toBe('晚上');
    expect(dayPeriod(23)).toBe('深夜');
  });

  it('其餘時段', () => {
    expect(dayPeriod(0)).toBe('深夜');
    expect(dayPeriod(7)).toBe('清晨');
    expect(dayPeriod(10)).toBe('早上');
    expect(dayPeriod(12)).toBe('中午');
    expect(dayPeriod(16)).toBe('下午');
    expect(dayPeriod(18)).toBe('傍晚');
  });
});

describe('timeAnchorLine', () => {
  afterEach(() => vi.useRealTimers());

  it('格式：YYYY/M/D（星期X）時段 HH:MM', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 24, 7, 24)); // 6/24 07:24
    const line = timeAnchorLine();
    expect(line).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2}（星期[日一二三四五六]）.+\s\d{2}:\d{2}$/);
    expect(line).toContain('2026/6/24');
    expect(line).toContain('清晨'); // dayPeriod(7)
    expect(line).toContain('07:24');
  });

  // P132 實機：時間錨沒有年份，模型就照訓練資料的年份印象推算——把 2026/8/2 講成
  // 「星期六」（那是 2025/8/2），待續事件的日期也一起算成 2025 年後被丟掉。
  it('必須帶年份，否則模型只能憑印象猜年份（實機把 2026/8/2 說成星期六）', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 28, 8, 21));
    expect(timeAnchorLine()).toContain('2026');
  });
});

describe('shouldBusyRead', () => {
  afterEach(() => vi.restoreAllMocks());

  it('busyRead 關閉必 false', () => {
    expect(shouldBusyRead({ busyRead: false }, new Date(2026, 5, 15, 12, 0))).toBe(false);
    expect(shouldBusyRead({}, new Date(2026, 5, 15, 12, 0))).toBe(false);
  });

  it('深夜（23–8 點）必 false', () => {
    expect(shouldBusyRead({ busyRead: true }, new Date(2026, 5, 15, 2, 0))).toBe(false);
    expect(shouldBusyRead({ busyRead: true }, new Date(2026, 5, 15, 23, 30))).toBe(false);
  });

  it('無 workTime：基礎機率 0.15 分界', () => {
    const c = { busyRead: true };
    const noon = new Date(2026, 5, 15, 12, 0);
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.15
    expect(shouldBusyRead(c, noon)).toBe(true);
    vi.spyOn(Math, 'random').mockReturnValue(0.2); // > 0.15
    expect(shouldBusyRead(c, noon)).toBe(false);
  });

  it('workTime 視窗內：機率提高到 0.4', () => {
    const c = { busyRead: true, workTime: '09:00-18:00' };
    const noon = new Date(2026, 5, 15, 12, 0); // 視窗內
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // < 0.4 但 > 0.15
    expect(shouldBusyRead(c, noon)).toBe(true);
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // > 0.4
    expect(shouldBusyRead(c, noon)).toBe(false);
  });

  it('workTime 視窗外：回落基礎 0.15', () => {
    const c = { busyRead: true, workTime: '09:00-18:00' };
    const evening = new Date(2026, 5, 15, 20, 0); // 視窗外、非深夜
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // > 0.15 → false
    expect(shouldBusyRead(c, evening)).toBe(false);
  });

  it('跨夜 workTime（20:00-04:00）解析正確', () => {
    const c = { busyRead: true, workTime: '20:00-04:00' };
    const night = new Date(2026, 5, 15, 21, 0); // 21 點在跨夜視窗內、且非深夜（<23）
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // < 0.4 → true 證明判定為視窗內
    expect(shouldBusyRead(c, night)).toBe(true);
  });
});

// ── 專屬默契（P112 D4）──────────────────────────────────────────────────────
import { parseSummaryBonds, mergeBonds, stripThreadOpsTail, BOND_CAP } from '../chatEngine.js';

describe('parseSummaryBonds — 總結尾端 BONDS 行解析', () => {
  it('正常解析：摘要與新梗分離、BONDS 行不進摘要', () => {
    const r = parseSummaryBonds('兩人聊了期末考。\nBONDS: ["他都叫她小晴晴", "晚安要說兩次"]');
    expect(r.summary).toBe('兩人聊了期末考。');
    expect(r.bonds).toEqual(['他都叫她小晴晴', '晚安要說兩次']);
  });

  it('空陣列＝沒有新梗；全形冒號也接受', () => {
    expect(parseSummaryBonds('摘要。\nBONDS: []').bonds).toEqual([]);
    expect(parseSummaryBonds('摘要。\nBONDS：["梗"]').bonds).toEqual(['梗']);
  });

  it('沒有 BONDS 行：整段當摘要（舊模型輸出相容）', () => {
    const r = parseSummaryBonds('只有摘要文字。');
    expect(r.summary).toBe('只有摘要文字。');
    expect(r.bonds).toEqual([]);
  });

  it('JSON 壞掉：當沒有新梗、摘要保留 BONDS 之前的部分', () => {
    const r = parseSummaryBonds('摘要。\nBONDS: ["沒關括號"');
    expect(r.summary).toBe('摘要。\nBONDS: ["沒關括號"'); // 不匹配格式 → 整段當摘要
    const r2 = parseSummaryBonds('摘要。\nBONDS: [{"x":1}]'); // 元素非字串 → 過濾光
    expect(r2.bonds).toEqual([]);
    expect(r2.summary).toBe('摘要。');
  });
});

describe('stripThreadOpsTail — 移除尾端 THREAD_OPS（P131，避免打斷 BONDS 錨定）', () => {
  it('切掉 THREAD_OPS 後，BONDS 仍能被錨定句尾的 parser 解析', () => {
    const raw = '兩人聊了面試。\nBONDS: ["互道晚安"]\nTHREAD_OPS: [{"op":"ADD","title":"面試","matchKeywords":["面試"]}]';
    const body = stripThreadOpsTail(raw);
    expect(body).toBe('兩人聊了面試。\nBONDS: ["互道晚安"]');
    const { summary, bonds } = parseSummaryBonds(body);
    expect(summary).toBe('兩人聊了面試。');
    expect(bonds).toEqual(['互道晚安']);
  });
  it('沒有 THREAD_OPS 時原樣返回', () => {
    expect(stripThreadOpsTail('只有摘要。')).toBe('只有摘要。');
  });
});

describe('待續擷取 prompt — 同批對話以最後狀態為準', () => {
  const open = [{ id: 't1', title: '週一面試', eventDate: '2026-07-27', status: 'planned' }];
  const closed = [];

  it.each([
    ['即時擷取', () => buildThreadExtractSystem(open, closed)],
    ['總結補漏', () => buildSummaryThreadInstr(open, closed)],
  ])('%s 共用明確規則：無既有 thread 不得先 ADD，已有才終止', (_label, build) => {
    const prompt = build();
    expect(prompt).toContain(THREAD_FINAL_STATE_RULE);
    expect(prompt).toContain('沒有既有 thread 時回 NONE、不得 ADD');
    expect(prompt).toContain('已有既有 thread 時，才用該 id 回 CANCEL 或 RESOLVE');
    expect(prompt).toContain('id=t1');
  });

  it('擷取器與摘要 prompt 都帶角色語言規則', () => {
    expect(buildThreadExtractSystem(open, closed, 'ja')).toContain('自然な日本語');
    expect(buildMemorySummarySystemPrompt('zh-tw')).toContain('繁體中文（台灣用語）');
  });
});

describe('mergeBonds — 新梗合併', () => {
  it('去重（完全相同文字）、去空白、截 40 字、預設 enabled', () => {
    const existing = [{ id: 'b1', text: '老梗', enabled: false, createdAt: 1 }];
    const merged = mergeBonds(existing, [' 老梗 ', '新梗', '', 'x'.repeat(60)]);
    expect(merged).toHaveLength(3);
    expect(merged[1].text).toBe('新梗');
    expect(merged[1].enabled).toBe(true);
    expect(merged[2].text).toHaveLength(40);
    expect(existing).toHaveLength(1); // 不改原陣列
  });

  it('滿上限靜默不收', () => {
    const full = Array.from({ length: BOND_CAP }, (_, i) => ({ id: 'b' + i, text: '梗' + i, enabled: true }));
    expect(mergeBonds(full, ['新梗'])).toHaveLength(BOND_CAP);
    const almostFull = full.slice(0, BOND_CAP - 1);
    expect(mergeBonds(almostFull, ['新1', '新2'])).toHaveLength(BOND_CAP); // 只收得下一條
  });

  it('existing 非陣列（舊資料無此欄位）視同空陣列', () => {
    expect(mergeBonds(undefined, ['梗'])).toHaveLength(1);
  });
});

describe('isGoodnightText — 晚安收尾語偵測（P130 睡前模式）', () => {
  it('常見道晚安句型為 true', () => {
    expect(isGoodnightText('晚安')).toBe(true);
    expect(isGoodnightText('那我要睡了，明天見')).toBe(true);
    expect(isGoodnightText('我先去睡囉')).toBe(true);
    expect(isGoodnightText('該睡了')).toBe(true);
    expect(isGoodnightText('祝你好夢')).toBe(true);
    expect(isGoodnightText('good night')).toBe(true);
  });

  it('失眠求陪聊、問對方睡沒不是道晚安', () => {
    expect(isGoodnightText('我睡不著')).toBe(false);
    expect(isGoodnightText('你睡了嗎')).toBe(false);
    expect(isGoodnightText('今天好累')).toBe(false);
    expect(isGoodnightText('')).toBe(false);
    expect(isGoodnightText(null)).toBe(false);
  });
});

describe('sleepRecallState — 隔天「昨晚睡前」呼應判定（P130）', () => {
  const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi);

  it('無 flag → 不注入不清除', () => {
    expect(sleepRecallState(null, at(2026, 7, 19, 9))).toEqual({ inject: false, clear: false });
    expect(sleepRecallState(undefined, at(2026, 7, 19, 9))).toEqual({ inject: false, clear: false });
  });

  it('昨晚 23 點收尾、今早 8 點 → 注入並清 flag', () => {
    const ended = at(2026, 7, 18, 23).getTime();
    expect(sleepRecallState(ended, at(2026, 7, 19, 8))).toEqual({ inject: true, clear: true });
  });

  it('23:50 收尾、00:10 又來聊 → 跨日但未滿 3 小時，不注入也不清（flag 留到早上）', () => {
    const ended = at(2026, 7, 18, 23, 50).getTime();
    expect(sleepRecallState(ended, at(2026, 7, 19, 0, 10))).toEqual({ inject: false, clear: false });
  });

  it('同一天內（沒跨日）→ 不注入不清', () => {
    const ended = at(2026, 7, 19, 1).getTime();
    expect(sleepRecallState(ended, at(2026, 7, 19, 9))).toEqual({ inject: false, clear: false });
  });

  it('超過 36 小時 → 過期只清 flag 不呼應', () => {
    const ended = at(2026, 7, 17, 22).getTime();
    expect(sleepRecallState(ended, at(2026, 7, 19, 12))).toEqual({ inject: false, clear: true });
    expect(sleepRecallState(1000, new Date(1000 + SLEEP_RECALL_MAX_MS))).toEqual({ inject: false, clear: true });
  });

  it('門檻常數健全性：3 小時 / 36 小時', () => {
    expect(SLEEP_RECALL_MIN_MS).toBe(3 * 3600 * 1000);
    expect(SLEEP_RECALL_MAX_MS).toBe(36 * 3600 * 1000);
  });
});

// ── 重要日期常駐事實（P135）──────────────────────────────────────────────────
// 病灶：被問生日時角色會自己編，錯誤答案又寫進對話歷史反被當成「記得」的事實。
// getKeyDatesCtx 讓角色卡模板常駐帶入生日/紀念日，不像 getPersonalDateCtx 只在當天才注入。
describe('getKeyDatesCtx — 重要日期常駐注入（P135）', () => {
  it('四個日期都有設定 → 含「重要日期」段，生日只出現月日、不含年份', () => {
    const char = { name: '小晴', birthday: '2001-09-03', meetDate: '2024-01-15', togetherDate: '2024-06-20' };
    const me = { birthday: '1998-12-25' };
    const ctx = getKeyDatesCtx(char, me);
    expect(ctx).toContain('【重要日期】');
    expect(ctx).toContain('你的生日：9月3日');
    expect(ctx).not.toContain('2001'); // 角色生日不可帶年份
    expect(ctx).toContain('對方的生日：12月25日');
    expect(ctx).not.toContain('1998'); // 對方生日也不可帶年份
  });

  it('相識日／在一起日給完整年月日', () => {
    const char = { meetDate: '2024-01-15', togetherDate: '2024-06-20' };
    const ctx = getKeyDatesCtx(char, {});
    expect(ctx).toContain('你們相識於 2024年1月15日');
    expect(ctx).toContain('在一起於 2024年6月20日');
  });

  it('只設部分欄位 → 只出現有值的那幾項，其餘不出現', () => {
    const char = { birthday: '1995-05-01' };
    const ctx = getKeyDatesCtx(char, {});
    expect(ctx).toContain('你的生日：5月1日');
    expect(ctx).not.toContain('對方的生日');
    expect(ctx).not.toContain('相識於');
    expect(ctx).not.toContain('在一起於');
  });

  it('四個都沒設 → 整段不出現（不留空標題）', () => {
    expect(getKeyDatesCtx({}, {})).toBe('');
    expect(getKeyDatesCtx({}, undefined)).toBe('');
  });

  it('含「不可主動提起」與「不可反覆確認」類約束字樣', () => {
    const ctx = getKeyDatesCtx({ birthday: '2000-01-01' }, {});
    expect(ctx).toContain('不要主動提起');
    expect(ctx).toContain('不要反覆確認');
  });

  it('含「年齡以基本資訊為準、不用生日推算」類字樣', () => {
    const ctx = getKeyDatesCtx({ birthday: '2000-01-01' }, {});
    expect(ctx).toContain('你的年齡以上方基本資訊為準');
    expect(ctx).toContain('不要用生日推算');
  });

  it('含「必須正確回答、不可編造」類字樣', () => {
    const ctx = getKeyDatesCtx({ birthday: '2000-01-01' }, {});
    expect(ctx).toContain('必須正確回答');
    expect(ctx).toContain('不可自行編造');
  });

  it('個位數月日不補零：2001-09-03 呈現「9月3日」而非「09月03日」', () => {
    const ctx = getKeyDatesCtx({ birthday: '2001-09-03' }, {});
    expect(ctx).toContain('9月3日');
    expect(ctx).not.toContain('09月');
    expect(ctx).not.toContain('月03日');
  });
});

describe('getPersonalDateCtx — 當天祝賀提示（迴歸鎖，確認未被 P135 新段落取代）', () => {
  afterEach(() => vi.useRealTimers());

  it('角色生日當天仍有 🎂 祝賀提示', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 3, 10, 0)); // 9/3
    const char = { name: '小晴', birthday: '2001-09-03' };
    const ctx = getPersonalDateCtx(char, {});
    expect(ctx).toContain('【紀念日】');
    expect(ctx).toContain('小晴');
    expect(ctx).toContain('🎂');
  });

  it('非生日當天不出現紀念日段', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 4, 10, 0)); // 9/4，非生日
    const char = { name: '小晴', birthday: '2001-09-03' };
    expect(getPersonalDateCtx(char, {})).toBe('');
  });
});

// ── 型別防呆（驗收補件）───────────────────────────────────────────────────
// 匯入的角色 JSON／損壞備份可能把 birthday/meetDate/togetherDate 存成非字串，
// db.js／importValidation.js 沒做型別檢查。這兩個函式都在 buildAIChatSetup 必經路徑上，
// 一旦拋錯整個聊天請求就會中斷。確認非字串輸入不拋錯、也不會產生垃圾字串。
describe('日期欄位非字串輸入 — 不拋錯防呆', () => {
  const badValues = [{}, 20010903, [2001, 9, 3], new Date(2001, 8, 3), null, undefined];

  it.each(badValues)('getKeyDatesCtx 對非字串 birthday（%o）不拋錯，且該欄位不出現在輸出', (bad) => {
    expect(() => getKeyDatesCtx({ birthday: bad }, {})).not.toThrow();
    const ctx = getKeyDatesCtx({ birthday: bad }, {});
    expect(ctx).not.toContain('你的生日');
    expect(ctx).not.toContain('[object Object]');
  });

  it.each(badValues)('getKeyDatesCtx 對非字串 meetDate/togetherDate（%o）不拋錯，且該欄位不出現在輸出', (bad) => {
    const char = { meetDate: bad, togetherDate: bad };
    expect(() => getKeyDatesCtx(char, {})).not.toThrow();
    const ctx = getKeyDatesCtx(char, {});
    expect(ctx).not.toContain('相識於');
    expect(ctx).not.toContain('在一起於');
    expect(ctx).not.toContain('[object Object]');
  });

  it('getKeyDatesCtx 四個欄位全是非字串垃圾值 → 整段不出現', () => {
    const char = { birthday: {}, meetDate: [1, 2, 3], togetherDate: new Date() };
    const me = { birthday: 20010903 };
    expect(getKeyDatesCtx(char, me)).toBe('');
  });

  it.each(badValues)('getPersonalDateCtx 對非字串 birthday（%o）不拋錯', (bad) => {
    expect(() => getPersonalDateCtx({ name: '小晴', birthday: bad }, {})).not.toThrow();
  });

  it.each(badValues)('getPersonalDateCtx 對非字串 meetDate/togetherDate（%o）不拋錯', (bad) => {
    expect(() => getPersonalDateCtx({ name: '小晴', meetDate: bad, togetherDate: bad }, {})).not.toThrow();
  });

  it('getPersonalDateCtx 對非字串對方生日（me.birthday）不拋錯', () => {
    expect(() => getPersonalDateCtx({ name: '小晴' }, { birthday: {} })).not.toThrow();
  });
});

describe('迴歸鎖 — 補件修改後，正常字串輸入行為完全不變', () => {
  afterEach(() => vi.useRealTimers());

  it('getKeyDatesCtx 正常輸入：月日不補零、完整年月日照舊', () => {
    const char = { birthday: '2001-09-03', meetDate: '2024-01-15', togetherDate: '2024-06-20' };
    const me = { birthday: '1998-12-25' };
    const ctx = getKeyDatesCtx(char, me);
    expect(ctx).toContain('你的生日：9月3日');
    expect(ctx).toContain('對方的生日：12月25日');
    expect(ctx).toContain('你們相識於 2024年1月15日');
    expect(ctx).toContain('在一起於 2024年6月20日');
  });

  it('getPersonalDateCtx 正常輸入：生日當天 🎂 仍在', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 3, 10, 0)); // 9/3
    const char = { name: '小晴', birthday: '2001-09-03' };
    expect(getPersonalDateCtx(char, {})).toContain('🎂');
  });
});
