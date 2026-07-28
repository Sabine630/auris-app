// P131 批次 4：threadCtx 注入、單一 action 消耗與失敗邊界。
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  character: null,
  threads: [],
  puts: [],
  calls: [],
  reply: '知道了',
  callError: null,
  failMessagePut: false,
  demo: false,
}));

vi.mock('../db.js', () => ({
  dbGet: vi.fn(async (store, key) => {
    if (store === 'characters') return state.character;
    if (store === 'continuity_threads') return state.threads.find(t => t.id === key);
    if (store === 'settings') return undefined;
    return undefined;
  }),
  dbPut: vi.fn(async (store, value) => {
    if (store === 'messages' && state.failMessagePut) throw new Error('persist failed');
    state.puts.push([store, structuredClone(value)]);
    if (store === 'continuity_threads') {
      const index = state.threads.findIndex(t => t.id === value.id);
      if (index >= 0) state.threads[index] = structuredClone(value);
      else state.threads.push(structuredClone(value));
    }
    return value.id;
  }),
  dbPutAll: vi.fn(async (store, rows) => {
    if (store === 'continuity_threads') {
      for (const row of rows) {
        const index = state.threads.findIndex(t => t.id === row.id);
        if (index >= 0) state.threads[index] = structuredClone(row);
        else state.threads.push(structuredClone(row));
      }
    }
    return rows.length;
  }),
  dbIdx: vi.fn(async (store) => {
    if (store === 'continuity_threads') return structuredClone(state.threads);
    return [];
  }),
  dbAll: vi.fn(async () => []),
  dbLatestByChar: vi.fn(async () => []),
  getSetting: vi.fn(async (key) => {
    if (key === 'api_key') return 'sk-demo-test';
    if (key === 'me_settings') return { name: '小晴' };
    if (key === 'chat_format_style') return false;
    if (key === 'capsules') return [];
    return null;
  }),
  setSetting: vi.fn(async () => undefined),
}));

vi.mock('../api.js', () => ({ sendLLMRequest: vi.fn() }));
vi.mock('../llm.js', () => ({
  resolveLLMConfig: vi.fn(async () => ({
    provider: 'openai', model: 'demo', base: 'https://example.test', apiKey: 'sk-demo-test',
  })),
  callLLM: vi.fn(async (request) => {
    state.calls.push(request);
    if (state.callError) throw state.callError;
    return { fullText: state.reply, truncated: false };
  }),
}));
vi.mock('../weather.js', () => ({ getWeatherCtx: vi.fn(async () => '') }));
vi.mock('../mood.js', () => ({
  getTodayMood: vi.fn(async () => null),
  moodContext: vi.fn(() => ''),
}));
vi.mock('../demoMode.js', () => ({ isDemo: () => state.demo }));
vi.mock('../diag.js', () => ({ logError: vi.fn() }));

import {
  buildContinuityThreadCtx,
  buildThreadExtractSystem,
  extractContinuityThreads,
  generateAIResponseStream,
  generateProactiveMessageStream,
  selectContinuityPromptThreads,
  shouldSuppressContinuityPrompt,
} from '../chatEngine.js';
import { _resetThreadQueues, COOLDOWN_DAYS, OFFER_MISS_LIMIT, getThreadTraces, planThreadApply } from '../continuity.js';

const NOW = 1784900000000;

function makeThread(overrides = {}) {
  return {
    id: 'thread_a',
    charId: 'c1',
    title: '週一面試',
    detail: '新公司的面試',
    matchKeywords: ['面試'],
    enabled: true,
    status: 'planned',
    followUpAfter: 1,
    lastPromptedAt: null,
    promptedCount: 0,
    offeredCount: 0,
    cooldownUntil: null,
    updatedAt: NOW - 2000,
    ...overrides,
  };
}

function userMessages(content = '今天還好嗎？') {
  return [{ id: 'm1', charId: 'c1', role: 'user', content, createdAt: NOW }];
}

beforeEach(() => {
  state.character = {
    id: 'c1', name: '璃月', followupAware: true, delay: 0,
    maxMsg: 2, minMsg: 1, memory: 20, stories: [], examples: [], bonds: [],
  };
  state.threads = [makeThread()];
  state.puts = [];
  state.calls = [];
  state.reply = '知道了';
  state.callError = null;
  state.failMessagePut = false;
  state.demo = false;
  _resetThreadQueues();
});

describe('selectContinuityPromptThreads', () => {
  it('最多選一條 action，最早到期優先；另選最多兩條相關 context', () => {
    const threads = [
      makeThread({ id: 'later', followUpAfter: NOW - 100 }),
      makeThread({ id: 'earlier', title: '回診', matchKeywords: ['回診'], followUpAfter: NOW - 5000 }),
      makeThread({ id: 'exam', title: '期末考試', detail: '準備考試', matchKeywords: ['考試'], followUpAfter: null }),
      makeThread({ id: 'movie', title: '一起看電影', matchKeywords: ['電影'], status: 'waiting_result', followUpAfter: null }),
      makeThread({ id: 'move', title: '搬家', matchKeywords: ['搬家'], followUpAfter: null }),
      makeThread({ id: 'disabled', title: '考試', enabled: false, followUpAfter: null }),
    ];
    const picked = selectContinuityPromptThreads(threads, '考試結束後再一起看電影', NOW);
    expect(picked.actionThread.id).toBe('earlier');
    expect(picked.contextThreads.map(t => t.id).sort()).toEqual(['exam', 'movie']);
  });

  it('沒有到期 action 或相關背景時回空，不把 closed thread 注入', () => {
    const picked = selectContinuityPromptThreads([
      makeThread({ status: 'resolved' }),
      makeThread({ id: 'future', followUpAfter: NOW + 1000 }),
    ], '完全無關的近況', NOW);
    expect(picked.actionThread).toBeNull();
    expect(picked.contextThreads).toEqual([]);
  });
});

describe('buildContinuityThreadCtx / 睡前抑制', () => {
  it('prompt 含單一 action、至多兩條背景與資料邊界', () => {
    const action = makeThread();
    const contexts = [
      makeThread({ id: 'b', title: '一起看電影', detail: '' }),
      makeThread({ id: 'c', title: '搬家', detail: '' }),
      makeThread({ id: 'd', title: '不應出現', detail: '' }),
    ];
    const text = buildContinuityThreadCtx(action, contexts);
    expect(text).toContain('【資料邊界】');
    expect(text).toContain('【待續事件｜本輪可行動】');
    expect(text).toContain('【待續事件｜背景】');
    expect(text).toContain('一起看電影');
    expect(text).toContain('搬家');
    expect(text).not.toContain('不應出現');
  });

  it('睡前模式或本輪道晚安時抑制；失眠求陪聊不誤判', () => {
    expect(shouldSuppressContinuityPrompt({ sleepModeAt: NOW }, userMessages('還想聊一下'))).toBe(true);
    expect(shouldSuppressContinuityPrompt({}, userMessages('晚安，明天見'))).toBe(true);
    expect(shouldSuppressContinuityPrompt({}, userMessages('我睡不著'))).toBe(false);
  });
});

describe('generateAIResponseStream — 落庫後單一消耗', () => {
  it('成功落庫且確實提及 action：只把該筆轉 waiting_result', async () => {
    state.threads.push(makeThread({
      id: 'thread_b', title: '回診', matchKeywords: ['回診'], followUpAfter: NOW - 500,
    }));
    state.reply = '面試加油！';
    const result = await generateAIResponseStream('c1', userMessages(), { onChunk: vi.fn() });

    expect(result.msgs).toHaveLength(1);
    expect(state.threads.find(t => t.id === 'thread_a')).toMatchObject({
      status: 'waiting_result', promptedCount: 1,
    });
    expect(state.threads.find(t => t.id === 'thread_b').status).toBe('planned');
    expect(state.calls[0].system[1].text).toContain('【待續事件｜本輪可行動】');
  });

  it('回覆未提及 action：只增加 offeredCount，context 永不消耗', async () => {
    state.threads.push(makeThread({
      id: 'context', title: '一起看電影', matchKeywords: ['電影'],
      detail: '', followUpAfter: null,
    }));
    state.reply = '電影聽起來不錯。';
    await generateAIResponseStream('c1', userMessages('最近有什麼電影？'), { onChunk: vi.fn() });

    expect(state.threads.find(t => t.id === 'thread_a')).toMatchObject({
      status: 'planned', offeredCount: 1, lastPromptedAt: null,
    });
    expect(state.threads.find(t => t.id === 'context')).toMatchObject({
      status: 'planned', offeredCount: 0, lastPromptedAt: null,
    });
  });

  it.each([
    ['上游拒絕', '抱歉，但我無法繼續協助這個要求', null],
    ['空白回覆', '   ', null],
    ['API 失敗', '不會使用', new Error('network')],
  ])('%s：不消耗也不計 offeredCount', async (_label, reply, callError) => {
    state.reply = reply;
    state.callError = callError;
    if (callError) {
      await expect(generateAIResponseStream('c1', userMessages(), { onChunk: vi.fn() })).rejects.toThrow('network');
    } else {
      await generateAIResponseStream('c1', userMessages(), { onChunk: vi.fn() });
    }
    expect(state.threads[0]).toMatchObject({
      status: 'planned', offeredCount: 0, promptedCount: 0, lastPromptedAt: null,
    });
    expect(state.puts.some(([store]) => store === 'continuity_threads')).toBe(false);
  });

  it('訊息持久化失敗：不消耗也不計 offeredCount', async () => {
    state.reply = '面試加油！';
    state.failMessagePut = true;
    await expect(generateAIResponseStream(
      'c1', userMessages(), { onChunk: vi.fn() })).rejects.toThrow('persist failed');
    expect(state.threads[0]).toMatchObject({
      status: 'planned', offeredCount: 0, promptedCount: 0, lastPromptedAt: null,
    });
  });

  it('晚安回合即使回覆碰巧提到關鍵詞，也不注入、不消耗', async () => {
    state.reply = '晚安，明天面試也別擔心。';
    await generateAIResponseStream('c1', userMessages('晚安'), { onChunk: vi.fn() });
    expect(state.calls[0].system.map(b => b.text).join('')).not.toContain('【待續事件');
    expect(state.threads[0]).toMatchObject({
      status: 'planned', offeredCount: 0, promptedCount: 0, lastPromptedAt: null,
    });
  });

  it('連續三輪注入但未提及：第三輪進入七天冷卻', async () => {
    state.reply = '今天就聊點別的吧。';
    for (let i = 0; i < OFFER_MISS_LIMIT; i++) {
      await generateAIResponseStream('c1', userMessages(), { onChunk: vi.fn() });
    }
    expect(state.threads[0].offeredCount).toBe(OFFER_MISS_LIMIT);
    expect(state.threads[0].cooldownUntil).toBeGreaterThan(
      Date.now() + (COOLDOWN_DAYS - 1) * 86400000);
    expect(state.threads[0].status).toBe('planned');
  });

  it('角色關閉 followupAware：不注入、不消耗', async () => {
    state.character.followupAware = false;
    state.reply = '面試加油！';
    await generateAIResponseStream('c1', userMessages(), { onChunk: vi.fn() });
    expect(state.calls[0].system.map(b => b.text).join('')).not.toContain('【待續事件');
    expect(state.threads[0]).toMatchObject({
      status: 'planned', offeredCount: 0, promptedCount: 0,
    });
  });

  it('Demo 不做自動擷取，但既有靜態 action 仍可注入並消耗', async () => {
    state.demo = true;
    state.reply = '面試順利嗎？';
    await generateAIResponseStream('c1', userMessages(), { onChunk: vi.fn() });
    expect(state.calls[0].system.map(b => b.text).join('')).toContain('【待續事件｜本輪可行動】');
    expect(state.threads[0]).toMatchObject({
      status: 'waiting_result', promptedCount: 1,
    });
  });

  it('主動訊息雖共用 buildAIChatSetup，仍不得注入或消耗待續事件', async () => {
    state.reply = '突然想到你的面試，希望一切順利。';
    await generateProactiveMessageStream(
      'c1', userMessages(), { onChunk: vi.fn(), signal: undefined });
    expect(state.calls[0].system.map(b => b.text).join('')).not.toContain('【待續事件');
    expect(state.threads[0]).toMatchObject({
      status: 'planned', offeredCount: 0, promptedCount: 0,
    });
  });
});

describe('Demo 擷取邊界', () => {
  it('Demo 新訊息不呼叫自動擷取模型', async () => {
    state.demo = true;
    await extractContinuityThreads('c1', userMessages('我明天要面試'));
    expect(state.calls).toEqual([]);
  });
});

describe('待續事件語言落庫防線', () => {
  it('zh-tw 擷取結果的 title/detail 在寫入前轉成台灣繁體', async () => {
    state.character.lang = 'zh-tw';
    state.reply = JSON.stringify([{
      op: 'ADD',
      title: '软件面试',
      detail: '这个软件职位',
      matchKeywords: ['面试'],
    }]);

    await extractContinuityThreads('c1', userMessages('我明天要去软件公司面试'));
    const added = state.threads.find(t => t.title === '軟體面試');
    expect(added).toMatchObject({ detail: '這個軟體職位', matchKeywords: ['面試'] });
  });
});

// P132：實機回報「沒有記進去」卻查不到任何線索——擷取器的每條靜默 return 都要留下
// 階段軌跡，否則只能靠猜。這裡逐條驗證每個出口都記得到、且能互相分辨。
describe('擷取階段追蹤', () => {
  const lastTrace = () => getThreadTraces().at(-1);

  it('功能被關掉時記 skip:feature-off，且不呼叫模型', async () => {
    state.character.followupAware = false;
    await extractContinuityThreads('c1', userMessages('我下週二要去開會'));
    expect(state.calls).toEqual([]);
    expect(lastTrace()).toMatch(/skip:feature-off/);
  });

  it('本地閘門未命中時記 skip:gate 與原因', async () => {
    // 註：不能拿「今天心情有點悶」當例子——「今天」本身命中時間訊號，閘門刻意略寬
    await extractContinuityThreads('c1', userMessages('有點累'));
    expect(state.calls).toEqual([]);
    expect(lastTrace()).toMatch(/skip:gate reason=no-signal/);
  });

  it('模型回 NONE 時記 no-ops，raw>0 可與「解析不到 JSON」分辨', async () => {
    state.reply = JSON.stringify([{ op: 'NONE' }]);
    await extractContinuityThreads('c1', userMessages('我下週二要去開會'));
    expect(lastTrace()).toMatch(/no-ops .*raw=1 ops=0/);
  });

  it('模型沒吐出 JSON 陣列時記 raw=0，與 NONE 明確不同', async () => {
    state.reply = '這段對話沒有需要記錄的事情。';
    await extractContinuityThreads('c1', userMessages('我下週二要去開會'));
    expect(lastTrace()).toMatch(/no-ops .*raw=0 ops=0/);
  });

  it('成功寫入時記 applied 與實際寫入筆數', async () => {
    state.reply = JSON.stringify([{ op: 'ADD', title: '開會', eventDate: null }]);
    await extractContinuityThreads('c1', userMessages('我下週二要去開會'));
    expect(lastTrace()).toMatch(/applied ops=1 puts=1/);
  });

  it('呼叫失敗時記 error（與「沒吐出 ops」不會混淆）', async () => {
    state.callError = new Error('boom');
    await extractContinuityThreads('c1', userMessages('我下週二要去開會'));
    expect(lastTrace()).toMatch(/error/);
    expect(lastTrace()).not.toMatch(/no-ops/);
  });
});

// P132 實機：卡片出現了但「尚未指定日期」——使用者說「我8/2要去跟唱片公司開會」，
// 模型卻把年份算成 2025（來源日前 361 天），被 §10.3 的合理範圍檢查靜默改成 null。
describe('擷取器日期錨點', () => {
  it('system prompt 明確給出今天的日期與星期，並禁止憑印象假設年份', () => {
    const sys = buildThreadExtractSystem([], [], 'zh-tw', new Date(2026, 6, 28, 8, 21).getTime());
    expect(sys).toContain('今天是 2026-07-28（星期二）');
    expect(sys).toMatch(/不得憑印象假設/);
  });

  it('明講「只說月日時取今天之後最近的那一天」，涵蓋使用者只寫 8/2 的情形', () => {
    const sys = buildThreadExtractSystem([], [], 'zh-tw', Date.now());
    expect(sys).toContain('只說月日');
  });

  it('年份算錯而被丟棄的日期會留下 date-out-of-range，不再靜默', () => {
    const srcMs = new Date(2026, 6, 28).getTime();
    const { puts, skipped } = planThreadApply({
      operations: [{ op: 'ADD', title: '跟唱片公司開會', eventDate: '2025-08-02', matchKeywords: ['開會'] }],
      existingThreads: [], charId: 'c1', sourceCreatedAt: srcMs, now: srcMs,
    });
    expect(puts[0].eventDate).toBe(null);
    expect(skipped).toContainEqual(expect.objectContaining({ reason: 'date-out-of-range' }));
  });

  it('年份正確時照常收下，不會誤報 date-out-of-range', () => {
    const srcMs = new Date(2026, 6, 28).getTime();
    const { puts, skipped } = planThreadApply({
      operations: [{ op: 'ADD', title: '跟唱片公司開會', eventDate: '2026-08-02', matchKeywords: ['開會'] }],
      existingThreads: [], charId: 'c1', sourceCreatedAt: srcMs, now: srcMs,
    });
    expect(puts[0].eventDate).toBe('2026-08-02');
    expect(skipped).not.toContainEqual(expect.objectContaining({ reason: 'date-out-of-range' }));
  });
});

// 「卡片有了但沒日期」有三種成因（模型沒給／格式不合／年份離譜被丟），實機分不出來。
// 追蹤要一眼看出日期到底有沒有落地，再由前一筆決定是哪一種。
describe('日期落地追蹤', () => {
  it('日期正常落地時 dated=1', async () => {
    state.reply = JSON.stringify([{ op: 'ADD', title: '去大阪', eventDate: '2026-08-07', matchKeywords: ['大阪'] }]);
    await extractContinuityThreads('c1', userMessages('我8/7要去一趟大阪'));
    expect(getThreadTraces().at(-1)).toMatch(/applied .*puts=1 .*dated=1/);
  });

  it('模型根本沒給日期時 dated=0，且不誤報格式或範圍問題', async () => {
    state.reply = JSON.stringify([{ op: 'ADD', title: '去大阪', eventDate: null, matchKeywords: ['大阪'] }]);
    await extractContinuityThreads('c1', userMessages('我8/7要去一趟大阪'));
    const traces = getThreadTraces();
    expect(traces.at(-1)).toMatch(/applied .*dated=0/);
    expect(traces.join('\n')).not.toMatch(/date-bad-format/);
  });

  it('模型回 "8/7" 這種非 YYYY-MM-DD 格式時留下 date-bad-format', async () => {
    state.reply = JSON.stringify([{ op: 'ADD', title: '去大阪', eventDate: '8/7', matchKeywords: ['大阪'] }]);
    await extractContinuityThreads('c1', userMessages('我8/7要去一趟大阪'));
    const traces = getThreadTraces().join('\n');
    expect(traces).toMatch(/date-bad-format/);
    expect(getThreadTraces().at(-1)).toMatch(/applied .*dated=0/);
  });
});
