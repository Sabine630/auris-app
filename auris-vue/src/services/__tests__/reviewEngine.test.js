import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock db 層：settings 用記憶體 map，stores 用記憶體物件
// （reviewEngine 間接 import chatEngine，mock 需補齊 chatEngine 用到的全部 db exports）
const state = vi.hoisted(() => ({ settings: {}, stores: {} }));
vi.mock('../db.js', () => ({
  getSetting: async (k) => (k in state.settings ? state.settings[k] : null),
  setSetting: async (k, v) => { state.settings[k] = v; },
  dbGet: async (s, id) => (state.stores[s] || []).find(r => r.id === id) || null,
  dbPut: async (s, v) => { (state.stores[s] = state.stores[s] || []).push(v); },
  dbAll: async (s) => state.stores[s] || [],
  dbIdx: async (s, i, v) => (state.stores[s] || []).filter(r => r[i] === v),
  dbIdxCount: async (s, i, v) => (state.stores[s] || []).filter(r => r[i] === v).length,
  dbCount: async (s) => (state.stores[s] || []).length,
  dbLatestByChar: async () => [],
  dbDel: async () => {},
  dbClear: async () => {},
}));

const llm = vi.hoisted(() => ({ reply: '這個月謝謝你陪我。' }));
vi.mock('../api.js', () => ({
  sendLLMRequest: async () => llm.reply,
}));

import {
  monthKey, prevMonthKey, monthRange, monthTitle,
  computeStats, pickMaterial, listReviews, generateMonthlyReview,
  REVIEW_MSG_THRESHOLD,
} from '../reviewEngine.js';

beforeEach(() => {
  state.settings = {};
  state.stores = {};
  llm.reply = '這個月謝謝你陪我。';
});

describe('月份工具', () => {
  it('monthKey / prevMonthKey（含跨年）', () => {
    expect(monthKey(new Date(2026, 5, 15))).toBe('2026-06');
    expect(prevMonthKey(new Date(2026, 5, 15))).toBe('2026-05');
    expect(prevMonthKey(new Date(2026, 0, 3))).toBe('2025-12');
  });

  it('monthRange 為本地時區 [月初, 下月初)', () => {
    const [start, end] = monthRange('2026-06');
    expect(new Date(start).getMonth()).toBe(5);
    expect(new Date(start).getDate()).toBe(1);
    expect(new Date(end).getMonth()).toBe(6);
  });

  it('monthTitle', () => {
    expect(monthTitle('2026-06')).toBe('2026 年 6 月');
  });
});

describe('computeStats（本地統計，零 token）', () => {
  const at = (d, h) => new Date(2026, 5, d, h).getTime(); // 2026-06
  const msg = (d, h) => ({ createdAt: at(d, h), role: 'user', content: 'x' });

  it('訊息數／聊天天數／常聊時段', () => {
    const msgs = [msg(1, 21), msg(1, 22), msg(2, 21), msg(2, 9)];
    const s = computeStats(msgs, { ym: '2026-06' });
    expect(s.msgCount).toBe(4);
    expect(s.chatDays).toBe(2);
    expect(s.topPeriod).toBe('晚上'); // 21/22 點 ×3 > 早上 ×1
  });

  it('心情分佈：只取該月打卡、次數多的在前', () => {
    const moodLog = {
      '2026-06-01': { mood: 'happy' },
      '2026-06-02': { mood: 'tired' },
      '2026-06-03': { mood: 'tired' },
      '2026-05-31': { mood: 'down' }, // 上個月，不計
    };
    const s = computeStats([], { ym: '2026-06', moodLog });
    expect(s.moodDist.map(m => m.key)).toEqual(['tired', 'happy']);
    expect(s.moodDist[0].count).toBe(2);
  });

  it('紀念日里程碑：相識日／在一起日的月-日落在該月才列（設定當年不算週年）', () => {
    const char = { meetDate: '2025-06-20', togetherDate: '2025-07-01' };
    const s = computeStats([], { ym: '2026-06', char });
    expect(s.milestones).toHaveLength(1);
    expect(s.milestones[0]).toContain('相識');
    // 設定當年（2026-06 遇上 meetDate 2026-06-20）不算週年
    const s2 = computeStats([], { ym: '2026-06', char: { meetDate: '2026-06-20' } });
    expect(s2.milestones).toHaveLength(0);
  });
});

describe('pickMaterial（素材 fallback 鏈）', () => {
  it('有總結：用總結（至多 10 條、超量取最新）', () => {
    const sums = Array.from({ length: 12 }, (_, i) => ({ content: `摘要${i}`, createdAt: i }));
    const out = pickMaterial(sums, [{ role: 'user', content: '原文' }], '夜雨', '我');
    expect(out).toContain('摘要11');
    expect(out).not.toContain('摘要0'); // 超過 10 條，最舊的被擠掉
    expect(out).not.toContain('原文');
    expect(out.split('\n')).toHaveLength(10);
  });

  it('無總結：抽原文頭尾各 20 則、單則截 60 字', () => {
    const msgs = Array.from({ length: 50 }, (_, i) => ({ role: 'user', content: `第${i}則`.padEnd(80, '長') }));
    const out = pickMaterial([], msgs, '夜雨', '我');
    const lines = out.split('\n');
    expect(lines).toHaveLength(40);
    expect(lines[0]).toContain('第0則');
    expect(lines[39]).toContain('第49則');
    expect(lines[0].length).toBeLessThanOrEqual(60 + 2); // 「我：」前綴＋截 60 字
  });

  it('兩者皆空回空字串（只出統計層）', () => {
    expect(pickMaterial([], [], '夜雨', '我')).toBe('');
  });
});

describe('generateMonthlyReview', () => {
  function seedMonth(charId, n, ym = '2026-06') {
    const [start] = monthRange(ym);
    state.stores.characters = [{ id: charId, name: '夜雨', persona: '溫柔' }];
    state.stores.messages = Array.from({ length: n }, (_, i) => ({
      id: 'm' + i, charId, role: i % 2 ? 'assistant' : 'user', content: '哈囉' + i,
      createdAt: start + i * 60000,
    }));
  }

  it('不到門檻回 skipped（不打 API、不存檔）', async () => {
    seedMonth('c1', REVIEW_MSG_THRESHOLD - 1);
    const r = await generateMonthlyReview('c1', '2026-06');
    expect(r.status).toBe('skipped');
    expect(r.msgCount).toBe(REVIEW_MSG_THRESHOLD - 1);
    expect(await listReviews('c1')).toHaveLength(0);
  });

  it('達門檻生成並存檔（無總結走原文 fallback，信＝LLM 輸出）', async () => {
    seedMonth('c1', 120);
    const r = await generateMonthlyReview('c1', '2026-06');
    expect(r.status).toBe('ok');
    expect(r.review.letter).toBe('這個月謝謝你陪我。');
    expect(r.review.stats.msgCount).toBe(120);
    expect(r.review.ym).toBe('2026-06');
    expect(await listReviews('c1')).toHaveLength(1);
  });

  it('同月重生覆蓋不疊加；hv 訊息不計入門檻', async () => {
    seedMonth('c1', 120);
    await generateMonthlyReview('c1', '2026-06');
    await generateMonthlyReview('c1', '2026-06');
    expect(await listReviews('c1')).toHaveLength(1);

    state.stores.messages.forEach(m => { m.type = 'hv'; }); // 全部變心聲
    const r = await generateMonthlyReview('c1', '2026-06');
    expect(r.status).toBe('skipped');
  });

  it('notify: true 建 review 通知', async () => {
    seedMonth('c1', 120);
    await generateMonthlyReview('c1', '2026-06', { notify: true });
    const notifs = state.stores.notifications || [];
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe('review');
    expect(notifs[0].charId).toBe('c1');
  });
});
