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
  dbPutAll: vi.fn(async () => 0),
  dbIdx: vi.fn(async (store) => {
    if (store === 'continuity_threads') return structuredClone(state.threads);
    return [];
  }),
  dbAll: vi.fn(async () => []),
  dbLatestByChar: vi.fn(async () => []),
  getSetting: vi.fn(async (key) => {
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
vi.mock('../demoMode.js', () => ({ isDemo: () => false }));
vi.mock('../diag.js', () => ({ logError: vi.fn() }));

import {
  buildContinuityThreadCtx,
  generateAIResponseStream,
  generateProactiveMessageStream,
  selectContinuityPromptThreads,
  shouldSuppressContinuityPrompt,
} from '../chatEngine.js';
import { _resetThreadQueues, COOLDOWN_DAYS, OFFER_MISS_LIMIT } from '../continuity.js';

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
