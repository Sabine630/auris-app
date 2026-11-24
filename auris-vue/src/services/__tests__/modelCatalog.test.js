import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 動態模型清單（P138）：請求組裝、非聊天模型過濾、合併規則、失敗安靜退回、isReasoningModel 的未知命名預設。

vi.mock('../demoMode.js', () => ({ isDemo: () => false }));
vi.mock('../db.js', () => ({ getSetting: vi.fn() }));
vi.mock('../diag.js', () => ({ logError: vi.fn(), sanitizeCode: (s) => s }));

const {
  BUILTIN_MODELS, getBuiltinModels, isChatModelId, parseModelListResponse, mergeModelList,
  buildModelListRequest, fetchProviderModels, clearModelListCache, MAX_EXTRA_MODELS,
} = await import('../modelCatalog.js');
const { isReasoningModel } = await import('../api.js');

const KEY = 'sk-test-0123456789abcdefghij'; // ≥ 20 字元
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => { clearModelListCache(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('內建清單單一來源', () => {
  it('五個供應商都有內建清單，未知供應商退回 openai', () => {
    for (const p of ['openai', 'anthropic', 'google', 'vertex', 'openrouter']) {
      expect(BUILTIN_MODELS[p].length).toBeGreaterThan(0);
    }
    expect(getBuiltinModels('nope')).toBe(BUILTIN_MODELS.openai);
  });
});

describe('buildModelListRequest', () => {
  it('openai：預設端點、Bearer', () => {
    const r = buildModelListRequest('openai', ` ${KEY} `, '');
    expect(r.url).toBe('https://api.openai.com/v1/models');
    expect(r.headers.Authorization).toBe(`Bearer ${KEY}`);
  });
  it('尊重自訂 api_base 並去尾斜線', () => {
    const r = buildModelListRequest('openai', KEY, 'https://proxy.test/v1/');
    expect(r.url).toBe('https://proxy.test/v1/models');
  });
  it('anthropic：/v1/models + x-api-key 標頭', () => {
    const r = buildModelListRequest('anthropic', KEY, '');
    expect(r.url).toBe('https://api.anthropic.com/v1/models?limit=1000');
    expect(r.headers['x-api-key']).toBe(KEY);
    expect(r.headers['anthropic-version']).toBe('2023-06-01');
    expect(r.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
  });
  it('google／openrouter 走各自預設 base', () => {
    expect(buildModelListRequest('google', KEY, '').url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/models');
    expect(buildModelListRequest('openrouter', KEY, '').url).toBe('https://openrouter.ai/api/v1/models');
  });
  it('金鑰不完整（去空白後 < 20 字元）不發請求', () => {
    expect(buildModelListRequest('openai', 'sk-proj-abc', '')).toBeNull();
    expect(buildModelListRequest('openai', `  ${KEY.slice(0, 19)}  `, '')).toBeNull();
    expect(buildModelListRequest('openai', KEY.slice(0, 20), '')).not.toBeNull();
  });
  it('沒金鑰或 vertex 不發請求', () => {
    expect(buildModelListRequest('openai', '  ', '')).toBeNull();
    expect(buildModelListRequest('vertex', '{"a":1}', '')).toBeNull();
  });
});

describe('非聊天模型過濾', () => {
  it('擋掉 embedding／tts／image／audio／moderation／微調款', () => {
    const bad = ['text-embedding-3-large', 'tts-1', 'whisper-1', 'dall-e-3', 'gpt-image-1', 'gpt-4o-audio-preview',
      'gpt-4o-realtime-preview', 'omni-moderation-latest', 'ft:gpt-4o:me', 'gpt-3.5-turbo-instruct',
      'imagen-4.0-generate', 'veo-3', 'gemini-embedding-001', 'gemini-2.5-flash-preview-tts'];
    for (const id of bad) expect(isChatModelId(id, 'openai'), id).toBe(false);
  });
  it('保留聊天模型（含未知新命名）', () => {
    for (const id of ['gpt-5.4-mini', 'o3', 'claude-sonnet-5', 'gemini-3.5-flash', 'gpt-6', 'meta-llama/llama-4'])
      expect(isChatModelId(id, 'openrouter'), id).toBe(true);
  });
  it('官方端點另加白名單，自訂代理只套黑名單', () => {
    expect(isChatModelId('babbage-002', 'openai', { official: true })).toBe(false);
    expect(isChatModelId('some-weird-proxy-model', 'openai', { official: true })).toBe(false);
    expect(isChatModelId('some-weird-proxy-model', 'openai', { official: false })).toBe(true);
  });
});

describe('chat 端點不可用的 OpenAI 款', () => {
  it('openai：排除 codex／deep-research／search／-pro', () => {
    const bad = ['gpt-5-codex', 'codex-mini-latest', 'o3-deep-research', 'o4-mini-deep-research', 'gpt-4o-search-preview',
      'gpt-5-search-api', 'gpt-5-pro', 'gpt-5.2-pro', 'o1-pro', 'o3-pro', 'o3-pro-2025-06-10'];
    for (const id of bad) expect(isChatModelId(id, 'openai'), id).toBe(false);
    for (const id of ['gpt-5.4-mini', 'o3', 'o3-mini', 'gpt-4o', 'chatgpt-4o-latest', 'gpt-5'])
      expect(isChatModelId(id, 'openai'), id).toBe(true);
  });
  it('openrouter 的 openai/ 前綴同樣排除', () => {
    expect(isChatModelId('openai/o3-pro', 'openrouter')).toBe(false);
    expect(isChatModelId('openai/gpt-5-codex', 'openrouter')).toBe(false);
    expect(isChatModelId('openai/gpt-4o-mini', 'openrouter')).toBe(true);
  });
  it('不誤擋別家的 -pro 與 search', () => {
    expect(isChatModelId('gemini-2.5-pro', 'google')).toBe(true);
    expect(isChatModelId('google/gemini-2.5-pro', 'openrouter')).toBe(true);
    expect(isChatModelId('claude-opus-4-8', 'anthropic')).toBe(true);
    expect(isChatModelId('perplexity/sonar-pro', 'openrouter')).toBe(true);
    expect(isChatModelId('gemini-2.5-pro', 'openai')).toBe(true); // 代理後的非 OpenAI 命名
  });
});

describe('parseModelListResponse', () => {
  it('OpenAI 格式：過濾並去重', () => {
    const data = { data: [{ id: 'gpt-5.5' }, { id: 'gpt-5.5' }, { id: 'text-embedding-3-small' }, { id: 'dall-e-3' }] };
    expect(parseModelListResponse('openai', data, { base: 'https://api.openai.com/v1' }).map(m => m.id)).toEqual(['gpt-5.5']);
  });
  it('Google 相容端點：去掉 models/ 前綴', () => {
    const data = { data: [{ id: 'models/gemini-3.5-flash' }, { id: 'models/text-embedding-004' }] };
    expect(parseModelListResponse('google', data, { base: 'x' }).map(m => m.id)).toEqual(['gemini-3.5-flash']);
  });
  it('Anthropic：用 display_name', () => {
    const data = { data: [{ id: 'claude-x-9', display_name: 'Claude X 9', type: 'model' }] };
    expect(parseModelListResponse('anthropic', data, { base: 'x' })).toEqual([{ id: 'claude-x-9', name: 'Claude X 9', created: 0 }]);
  });
  it('OpenRouter：只留輸出文字、不含圖片的模型', () => {
    const data = { data: [
      { id: 'a/chat', name: 'Chat', architecture: { output_modalities: ['text'] }, created: 5 },
      { id: 'a/img', name: 'Img', architecture: { output_modalities: ['text', 'image'] } },
      { id: 'a/only-img', name: 'Img2', architecture: { output_modalities: ['image'] } },
    ] };
    expect(parseModelListResponse('openrouter', data, { base: 'x' }).map(m => m.id)).toEqual(['a/chat']);
  });
  it('格式不符回 null', () => {
    expect(parseModelListResponse('openai', { error: 'x' })).toBeNull();
    expect(parseModelListResponse('openai', null)).toBeNull();
  });
});

describe('mergeModelList', () => {
  const builtin = BUILTIN_MODELS.openai;
  it('抓不到（null／空）＝內建清單', () => {
    expect(mergeModelList(builtin, null, 'gpt-5.4-mini')).toEqual(builtin);
    expect(mergeModelList(builtin, [], 'gpt-5.4-mini')).toEqual(builtin);
  });
  it('內建款保留中文說明與順序，新模型接在後面', () => {
    const fetched = [{ id: 'gpt-9-new' }, { id: 'gpt-5.4-mini' }, { id: 'gpt-5.5' }];
    const out = mergeModelList(builtin, fetched, 'gpt-5.5');
    expect(out.map(m => m.id)).toEqual(['gpt-5.5', 'gpt-5.4-mini', 'gpt-9-new']);
    expect(out[0].desc).toBe(builtin[0].desc);
  });
  it('使用者已選的模型即使不在動態清單也不會被洗掉', () => {
    const out = mergeModelList(builtin, [{ id: 'gpt-9-new' }], 'my-private-model');
    expect(out[0]).toMatchObject({ id: 'my-private-model' });
    expect(out.some(m => m.id === 'gpt-9-new')).toBe(true);
  });
  it('已選為內建款但動態清單沒有時，仍保留（帶內建說明）', () => {
    const out = mergeModelList(builtin, [{ id: 'gpt-9-new' }], 'gpt-4o');
    expect(out[0]).toEqual(builtin.find(m => m.id === 'gpt-4o'));
  });
  it('__custom__ 不當成模型 ID 插入', () => {
    expect(mergeModelList(builtin, null, '__custom__').some(m => m.id === '__custom__')).toBe(false);
  });
  it('額外款數量封頂；有 created 時新到舊', () => {
    const many = Array.from({ length: MAX_EXTRA_MODELS + 20 }, (_, i) => ({ id: `x/m${i}`, created: i }));
    const out = mergeModelList([], many, '');
    expect(out).toHaveLength(MAX_EXTRA_MODELS);
    expect(out[0].id).toBe(`x/m${MAX_EXTRA_MODELS + 19}`);
  });
});

describe('fetchProviderModels：失敗一律安靜回 null', () => {
  const args = { provider: 'openai', apiKey: KEY, apiBase: '' };

  it('成功：回過濾後的清單，並帶正確 URL／標頭', async () => {
    const fetchMock = vi.fn(async () => ok({ data: [{ id: 'gpt-5.5' }, { id: 'tts-1' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const list = await fetchProviderModels(args);
    expect(list.map(m => m.id)).toEqual(['gpt-5.5']);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/models');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${KEY}`);
  });
  it('金鑰錯（401）→ null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
    expect(await fetchProviderModels(args)).toBeNull();
  });
  it('離線／CORS（fetch 拋錯）→ null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await fetchProviderModels(args)).toBeNull();
  });
  it('回 HTML／非 JSON → null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } })));
    expect(await fetchProviderModels(args)).toBeNull();
  });
  it('逾時（AbortError → request_timeout）→ null', async () => {
    vi.stubGlobal('fetch', vi.fn((_u, opts) => new Promise((_res, rej) => {
      opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })));
    vi.useFakeTimers();
    const p = fetchProviderModels(args);
    await vi.advanceTimersByTimeAsync(9000);
    expect(await p).toBeNull();
    vi.useRealTimers();
  });
  it('vertex／無金鑰不發請求', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchProviderModels({ provider: 'vertex', apiKey: '{"project_id":"p"}' })).toBeNull();
    expect(await fetchProviderModels({ provider: 'openai', apiKey: '' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('同一組 provider／base／key 在 TTL 內走快取', async () => {
    const fetchMock = vi.fn(async () => ok({ data: [{ id: 'gpt-5.5' }] }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchProviderModels(args);
    await fetchProviderModels(args);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('isReasoningModel：已知與未知新命名', () => {
  it('推理型（不送取樣參數）', () => {
    for (const id of ['gpt-5', 'gpt-5.4-mini', 'gpt-5.5', 'gpt-6', 'gpt-6-mini', 'gpt-10', 'o1', 'o1-mini', 'o3', 'o4-mini', 'o10',
      'openai/gpt-5.4', 'openai/o3-pro'])
      expect(isReasoningModel(id), id).toBe(true);
  });
  it('一般聊天型與未知命名（照常送取樣參數）', () => {
    for (const id of ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-3.5-turbo', 'gpt-35-turbo', 'claude-sonnet-5', 'gemini-3.5-flash',
      'mistralai/mistral-nemo', 'omni-foo', 'my-proxy-model', '', null, undefined])
      expect(isReasoningModel(id), String(id)).toBe(false);
  });
});
