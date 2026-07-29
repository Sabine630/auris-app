import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Vertex 回應組裝與空回應歸因（P133）。
//
// 實機病灶：使用者回報聊天偶發「代理回傳空回應」，重傳同一句就好了；同一把金鑰在
// 酒館與另一個前端都正常。追下去發現兩件事——
//   1. Vertex 分支只取 candidates[0].content.parts[0].text，多段 text 時後半被默默丟掉，
//      parts[0] 不是 text 時整段變空字串（與 P132 修掉的 anthropicText 是同一個洞，
//      當時只補了 Anthropic，Vertex 從 P54 接入以來沒動過）。
//   2. 空回應不拋錯 → 進不了 callLLM 的 catch → 診斷 ring buffer 什麼都沒留下，
//      MAX_TOKENS（思考佔滿額度）／SAFETY／RECITATION 在匯出檔裡完全無法分辨。
// 這裡把兩件事一起鎖住。

vi.mock('../demoMode.js', () => ({ isDemo: () => false }));
const logError = vi.fn();
vi.mock('../diag.js', () => ({ logError: (...a) => logError(...a) }));
vi.mock('../api.js', async () => {
  const actual = await vi.importActual('../api.js');
  return { ...actual, getVertexToken: vi.fn(async () => 'tok') };
});

const { callLLM } = await import('../llm.js');

const SA = JSON.stringify({ project_id: 'p', client_email: 'e@x', private_key: 'k' });

function mockVertex(body, { ok = true, status = 200 } = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status, json: async () => body })));
}

const call = (over = {}) => callLLM({
  provider: 'vertex', model: 'gemini-2.5-pro', apiKey: SA,
  system: 'x', messages: [{ role: 'user', content: 'y' }],
  stream: false, maxTokens: 1000, ...over,
});

const candidate = (parts, finishReason = 'STOP') => ({
  candidates: [{ content: { parts }, finishReason }],
});

describe('Vertex 回應組裝', () => {
  beforeEach(() => { logError.mockClear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('單一 text part 維持原行為', async () => {
    mockVertex(candidate([{ text: '「好。」' }]));
    expect((await call()).fullText).toBe('「好。」');
  });

  it('多個 text part 依序串接，不是只取第一個（實機病灶）', async () => {
    mockVertex(candidate([{ text: '前段。' }, { text: '後段。' }]));
    expect((await call()).fullText).toBe('前段。後段。');
  });

  it('thought part 排在前面時仍取得 text', async () => {
    mockVertex(candidate([{ thought: true, text: '先想一下…' }, { text: '實際回覆' }]));
    expect((await call()).fullText).toBe('實際回覆');
  });

  it('parts 缺席或非陣列時安全回空字串，不拋錯', async () => {
    mockVertex(candidate(undefined));
    expect((await call()).fullText).toBe('');
  });

  it('串流路徑走同一套組裝（Vertex 實際上是一次回整段）', async () => {
    mockVertex(candidate([{ text: 'A' }, { text: 'B' }]));
    const chunks = [];
    const { fullText } = await call({ stream: true, onChunk: t => chunks.push(t) });
    expect(fullText).toBe('AB');
    expect(chunks.join('')).toBe('AB');
  });

  it('MAX_TOKENS 截斷旗標照常回報', async () => {
    mockVertex(candidate([{ text: '半句' }], 'MAX_TOKENS'));
    expect((await call()).truncated).toBe(true);
  });
});

describe('Vertex 空回應歸因', () => {
  beforeEach(() => { logError.mockClear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  const reasonOf = () => logError.mock.calls.at(-1)?.[2]?.reason;

  it('思考佔滿額度（MAX_TOKENS＋無 parts）記成 max_tokens', async () => {
    mockVertex({ candidates: [{ content: {}, finishReason: 'MAX_TOKENS' }] });
    expect((await call()).fullText).toBe('');
    expect(reasonOf()).toBe('max_tokens');
  });

  it('回覆被安全設定擋下記成 safety', async () => {
    mockVertex({ candidates: [{ finishReason: 'SAFETY' }] });
    await call();
    expect(reasonOf()).toBe('safety');
  });

  it('被判定為複述記成 recitation', async () => {
    mockVertex({ candidates: [{ finishReason: 'RECITATION' }] });
    await call();
    expect(reasonOf()).toBe('recitation');
  });

  it('prompt 端被擋（promptFeedback）優先於 candidate 的 finishReason', async () => {
    mockVertex({ promptFeedback: { blockReason: 'BLOCKLIST' }, candidates: [{ finishReason: 'OTHER' }] });
    await call();
    expect(reasonOf()).toBe('blocklist');
  });

  it('連 candidate 都沒有記成 no_candidates', async () => {
    mockVertex({});
    await call();
    expect(reasonOf()).toBe('no_candidates');
  });

  it('回報 STOP 卻沒有內容記成 no_parts', async () => {
    mockVertex(candidate([], 'STOP'));
    await call();
    expect(reasonOf()).toBe('no_parts');
  });

  it('未知的 finishReason 收斂成 other，不放行供應商原字串', async () => {
    mockVertex({ candidates: [{ finishReason: 'SOME_NEW_REASON_v2' }] });
    await call();
    expect(reasonOf()).toBe('other');
  });

  // 迴歸：callLLM 原本只在寫 log 時正規化，**回傳值仍是供應商原始字串**。Vertex 回
  // 'MAX_TOKENS'（大寫），UI 的文案表以小寫鍵查詢 → 查不到 → 退回 P60 的代理提示，
  // 原因驅動的文案等於沒生效。回傳值必須與 log 用的是同一個正規化結果。
  it('回傳的 emptyReason 已正規化（不是供應商原始大寫字串）', async () => {
    mockVertex({ candidates: [{ finishReason: 'MAX_TOKENS' }] });
    expect((await call()).emptyReason).toBe('max_tokens');
  });

  it('回傳值與 logError 記錄的是同一個值', async () => {
    mockVertex({ candidates: [{ finishReason: 'RECITATION' }] });
    const { emptyReason } = await call();
    expect(emptyReason).toBe('recitation');
    expect(emptyReason).toBe(logError.mock.calls.at(-1)[2].reason);
  });

  it('有內容時 emptyReason 為 undefined', async () => {
    mockVertex(candidate([{ text: '有回覆' }]));
    expect((await call()).emptyReason).toBeUndefined();
  });

  it('有內容時不記空回應', async () => {
    mockVertex(candidate([{ text: '有回覆' }]));
    await call();
    expect(logError).not.toHaveBeenCalled();
  });

  it('記錄帶上 empty_response 分類與 provider／model', async () => {
    mockVertex({});
    await call();
    const [src, , meta] = logError.mock.calls.at(-1);
    expect(src).toBe('llm');
    expect(meta.code).toBe('empty_response');
    expect(meta.provider).toBe('vertex');
    expect(meta.model).toBe('gemini-2.5-pro');
  });
});

describe('Vertex HTTP 錯誤帶狀態碼', () => {
  beforeEach(() => { logError.mockClear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  // 病灶：Gemini 的 503 訊息是「The model is overloaded…」，字串裡沒有 HTTP 5xx，
  // diag 的 parseStatus 抓不到就塌成 runtime_error——上游超載與其他失敗長得一樣。
  it('訊息不含狀態碼時仍把 status 傳給 logError', async () => {
    mockVertex({ error: { message: 'The model is overloaded. Please try again later.' } }, { ok: false, status: 503 });
    await expect(call()).rejects.toThrow(/overloaded/);
    expect(logError.mock.calls.at(-1)[2].status).toBe(503);
  });

  it('串流路徑同樣帶上 status', async () => {
    mockVertex({ error: { message: 'quota exhausted' } }, { ok: false, status: 429 });
    await expect(call({ stream: true, onChunk: () => {} })).rejects.toThrow(/quota/);
    expect(logError.mock.calls.at(-1)[2].status).toBe(429);
  });
});

describe('跨供應商原因別名', () => {
  beforeEach(() => { logError.mockClear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  // OpenAI 相容的 finish_reason='length' 與 Gemini 的 MAX_TOKENS 是同一件事，
  // 不收斂的話會落到 other，UI 只能給無方向的通用文案。
  it("OpenAI 的 length 收斂成 max_tokens", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: '' }, finish_reason: 'length' }] }),
    })));
    const { emptyReason } = await callLLM({
      provider: 'openai', model: 'gpt-x', base: 'https://example.test', apiKey: 'sk-demo-t',
      system: 'x', messages: [{ role: 'user', content: 'y' }], stream: false,
    });
    expect(emptyReason).toBe('max_tokens');
  });

  it('Anthropic 的 stop_reason 同樣正規化', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ content: [], stop_reason: 'max_tokens' }),
    })));
    const { emptyReason } = await callLLM({
      provider: 'anthropic', model: 'claude-x', base: 'https://example.test', apiKey: 'sk-demo-t',
      system: 'x', messages: [{ role: 'user', content: 'y' }], stream: false,
    });
    expect(emptyReason).toBe('max_tokens');
  });
});
