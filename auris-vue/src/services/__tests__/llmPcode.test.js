import { describe, expect, it, vi, beforeEach } from 'vitest';

// 供應商錯誤代碼擷取（pcode，P134 第三批）。
//
// 病灶：診斷匯出目前只看得到 HTTP 404／429，看不出「模型不存在還是網址不對」
// 「速率上限還是配額用完」。各家錯誤物件裡有枚舉型代碼欄位能回答這個問題
// （Google error.status、OpenAI error.type／error.code、Anthropic error.type），
// llm.js 的 httpError 現在會對解析後的錯誤物件做鍵名優先序＋深度受限（≤4 層）
// 掃描，抓到的值經 diag.js 的 sanitizeCode 清洗後才附掛到例外的 pcode 欄位，
// 由 callLLM 的 catch 轉交 logError。

vi.mock('../demoMode.js', () => ({ isDemo: () => false }));
const logError = vi.fn();
vi.mock('../diag.js', async () => {
  const actual = await vi.importActual('../diag.js');
  return { ...actual, logError: (...a) => logError(...a) };
});

const { callLLM } = await import('../llm.js');

function mockFetch(body, { ok = false, status = 404 } = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) })));
}

const pcodeOf = () => logError.mock.calls.at(-1)?.[2]?.pcode;

beforeEach(() => { logError.mockClear(); });

describe('各家錯誤物件形狀：抓到正確代碼', () => {
  it('Google（error.status）→ NOT_FOUND', async () => {
    mockFetch({ error: { code: 404, message: 'Model not found', status: 'NOT_FOUND' } }, { status: 404 });
    await expect(callLLM({
      provider: 'google', model: 'gemini-3.5-flash', base: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('NOT_FOUND');
  });

  // 優先序 code 先於 type：OpenAI 的 type 是籠統分類桶（invalid_request_error），
  // code 才是具體原因（model_not_found）。取到籠統值就答不出「404 是模型還是網址」，
  // 等於這個欄位白做。
  it('OpenAI 同時有 type 與 code → 取較具體的 code', async () => {
    mockFetch({ error: { message: 'model not found', type: 'invalid_request_error', code: 'model_not_found' } }, { status: 404 });
    await expect(callLLM({
      provider: 'openai', model: 'gpt-nope', base: 'https://api.openai.com/v1',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('model_not_found');
  });

  it('Anthropic（error.type）→ rate_limit_error', async () => {
    mockFetch({ error: { type: 'rate_limit_error', message: 'Rate limited' } }, { status: 429 });
    await expect(callLLM({
      provider: 'anthropic', model: 'claude-x', base: 'https://api.anthropic.com/v1',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('rate_limit_error');
  });

  it('Vertex 原生分支（error.status）→ RESOURCE_EXHAUSTED', async () => {
    vi.doMock('../api.js', async () => {
      const actual = await vi.importActual('../api.js');
      return { ...actual, getVertexToken: vi.fn(async () => 'tok') };
    });
    vi.resetModules();
    const { callLLM: freshCallLLM } = await import('../llm.js');
    mockFetch({ error: { code: 429, message: 'quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, { status: 429 });
    const sa = JSON.stringify({ project_id: 'p', client_email: 'e@x', private_key: 'k' });
    await expect(freshCallLLM({
      provider: 'vertex', model: 'gemini-2.5-pro', apiKey: sa,
      messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('RESOURCE_EXHAUSTED');
    vi.doUnmock('../api.js');
    vi.resetModules();
  });
});

describe('數字值一律跳過（不把 HTTP 狀態碼數字當代碼）', () => {
  it('error.code 是數字 404 時不採用，改採字串的 error.status', async () => {
    mockFetch({ error: { code: 404, status: 'NOT_FOUND' } }, { status: 404 });
    await expect(callLLM({
      provider: 'google', model: 'g', base: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('NOT_FOUND');
    expect(pcodeOf()).not.toBe('404');
  });

  it('只有數字值、沒有任何字串候選時 pcode 不帶（不拋錯）', async () => {
    mockFetch({ error: { code: 404 } }, { status: 404 });
    await expect(callLLM({
      provider: 'google', model: 'g', base: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBeUndefined();
  });
});

describe('形狀過濾套用到擷取結果（含空白／中文的候選被跳過，退回下一優先鍵名）', () => {
  // 這兩項驗的是「候選被形狀過濾擋下時會換下一個鍵名」。優先序改成 code 先於 type
  // 之後，壞值必須放在 code（較高優先）才測得到 fallthrough——放在 type 的話 code
  // 會先命中，這條測試就變成空測、驗不到任何東西。
  it('code 含空白被跳過，改用合法的 type', async () => {
    mockFetch({ error: { code: 'model not found', type: 'invalid_request_error' } }, { status: 404 });
    await expect(callLLM({
      provider: 'openai', model: 'g', base: 'https://api.openai.com/v1',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('invalid_request_error');
  });

  it('code 含中文被跳過，改用合法的 type', async () => {
    mockFetch({ error: { code: '找不到模型', type: 'invalid_request_error' } }, { status: 404 });
    await expect(callLLM({
      provider: 'openai', model: 'g', base: 'https://api.openai.com/v1',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('invalid_request_error');
  });

  it('所有候選都不合法（含空白／中文／過長）時 pcode 不帶', async () => {
    mockFetch({ error: { type: 'model not found', code: '找不到' } }, { status: 404 });
    await expect(callLLM({
      provider: 'openai', model: 'g', base: 'https://api.openai.com/v1',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBeUndefined();
  });
});

describe('配額識別（quotaId 等）合併成兩段', () => {
  // 深度計算（collectPcodeCandidates 的 depth 從 errObj 自身的鍵＝1 起算）：
  // errObj.a(1) → a.b(2) → b.c(3) → c.quotaId(4)——quotaId 這個鍵恰好落在
  // PCODE_MAX_DEPTH=4 的邊界上，用來確認「剛好第 4 層」仍抓得到。
  it('巢狀深處（恰好第 4 層）的 quotaId 抓得到，接在主代碼之後', async () => {
    mockFetch({
      error: { status: 'RESOURCE_EXHAUSTED', a: { b: { c: { quotaId: 'GenerateRequestsPerMinute' } } } },
    }, { status: 429 });
    await expect(callLLM({
      provider: 'google', model: 'g', base: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('RESOURCE_EXHAUSTED/GenerateRequestsPerMinute');
  });

  // 再往下疊一層：errObj.a(1) → a.b(2) → b.c(3) → c.d(4) → d.quotaId(5)——
  // quotaId 落在第 5 層，超過上限，抓不到，只剩主代碼。
  it('超過深度上限（第 5 層）的 quotaId 抓不到，只有主代碼', async () => {
    mockFetch({
      error: { status: 'RESOURCE_EXHAUSTED', a: { b: { c: { d: { quotaId: 'TooDeepToFind' } } } } },
    }, { status: 429 });
    await expect(callLLM({
      provider: 'google', model: 'g', base: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('RESOURCE_EXHAUSTED');
  });
});

describe('抓不到時安全略過', () => {
  it('錯誤物件完全沒有候選鍵名時 pcode 不帶、不拋額外錯誤', async () => {
    mockFetch({ error: { message: '這是使用者對話片段，不該外流' } }, { status: 500 });
    await expect(callLLM({
      provider: 'openai', model: 'g', base: 'https://api.openai.com/v1',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBeUndefined();
  });

  it('errObj 為 undefined（無法解析成 JSON）時 pcode 不帶', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => { throw new Error('bad json'); }, text: async () => 'not json' })));
    await expect(callLLM({
      provider: 'openai', model: 'g', base: 'https://api.openai.com/v1',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBeUndefined();
  });
});

// 迴歸鎖：error.message 在任何情況下都不得出現在 pcode 裡——候選鍵名清單裡完全
// 沒有 message，即使訊息裡混了看似合法的字串（含中文使用者對話片段）也一樣。
describe('迴歸鎖：error.message 永遠不會成為 pcode 的來源', () => {
  it('error.message 含中文對話片段，且沒有其他候選鍵名 → pcode 不帶，訊息內容不外流', async () => {
    mockFetch({ error: { message: '使用者說：今天天氣真好，我們去公園走走吧' } }, { status: 404 });
    await expect(callLLM({
      provider: 'openai', model: 'g', base: 'https://api.openai.com/v1',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBeUndefined();
  });

  it('error.message 剛好是合法 code 字元集也不會被採用（type 存在時優先，且 message 從不在候選清單）', async () => {
    mockFetch({ error: { message: 'should_never_be_used', type: 'invalid_request_error' } }, { status: 404 });
    await expect(callLLM({
      provider: 'openai', model: 'g', base: 'https://api.openai.com/v1',
      apiKey: 'k', messages: [{ role: 'user', content: 'hi' }], stream: false,
    })).rejects.toThrow();
    expect(pcodeOf()).toBe('invalid_request_error');
    expect(pcodeOf()).not.toContain('should_never_be_used');
  });
});
