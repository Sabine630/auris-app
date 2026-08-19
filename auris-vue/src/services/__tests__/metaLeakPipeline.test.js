import { describe, expect, it, vi, beforeEach } from 'vitest';

// P137：思考外洩過濾在 callLLM 出口的接線測試。
// 單元測試（metaLeakFilter.test.js）保證規則本身正確；這裡保證它真的接在
// 所有 provider、串流與非串流都會經過的那個出口上，而且空回應歸因走 meta_leak。

vi.mock('../demoMode.js', () => ({ isDemo: () => false }));
const logError = vi.fn();
vi.mock('../diag.js', async () => {
  const actual = await vi.importActual('../diag.js');
  return { ...actual, logError: (...a) => logError(...a) };
});

const { callLLM } = await import('../llm.js');

const LEAK_HEAD = 'thought (System hint):現在時間：2026/8/13（星期四）清晨 07:27。\n她剛剛說早安。\n';

function mockJson(content) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true, status: 200,
    json: async () => ({ choices: [{ message: { content }, finish_reason: 'stop' }] }),
  })));
}

// OpenAI 相容 SSE：把整段文字切成小塊逐塊送，重現實機的串流形狀。
function mockStream(text, size = 7) {
  const chunks = text.match(new RegExp(`[\\s\\S]{1,${size}}`, 'g')) || [];
  const lines = chunks.map(c => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n`);
  lines.push('data: [DONE]\n');
  const encoder = new TextEncoder();
  let i = 0;
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true, status: 200,
    body: { getReader: () => ({
      read: async () => (i < lines.length ? { done: false, value: encoder.encode(lines[i++]) } : { done: true }),
      releaseLock: () => {},
    }) },
  })));
}

const opts = { provider: 'google', model: 'gemini-3.5-flash', base: 'https://x/v1', apiKey: 'k', messages: [{ role: 'user', content: '早安' }] };

beforeEach(() => { logError.mockClear(); });

describe('非串流', () => {
  it('思考外洩被剝掉，真正的話留下來', async () => {
    mockJson(`${LEAK_HEAD}第一則：\n寶寶早安，我也好想妳。`);
    const { fullText, emptyReason } = await callLLM({ ...opts, stream: false });
    expect(fullText).toBe('寶寶早安，我也好想妳。');
    expect(emptyReason).toBeUndefined();
  });

  it('整段都是思考 → 空回應，原因記成 meta_leak', async () => {
    mockJson(LEAK_HEAD);
    const { fullText, emptyReason } = await callLLM({ ...opts, stream: false });
    expect(fullText).toBe('');
    expect(emptyReason).toBe('meta_leak');
    expect(logError).toHaveBeenCalledWith('llm', 'empty_response', expect.objectContaining({ reason: 'meta_leak' }));
  });

  it('正常回覆完全不動', async () => {
    mockJson('寶寶早安，我也好想妳。');
    const { fullText } = await callLLM({ ...opts, stream: false });
    expect(fullText).toBe('寶寶早安，我也好想妳。');
  });
});

describe('串流', () => {
  it('思考不會逐字打在畫面上，落庫文字也乾淨', async () => {
    mockStream(`${LEAK_HEAD}第一則：\n寶寶早安，我也好想妳。`);
    const seen = [];
    const { fullText } = await callLLM({ ...opts, stream: true, onChunk: t => seen.push(t) });
    const shown = seen.join('');
    expect(shown).not.toContain('thought');
    expect(shown).not.toContain('System hint');
    expect(shown).toContain('寶寶早安');
    expect(fullText).toBe('寶寶早安，我也好想妳。');
  });

  it('正常串流回覆逐塊照常吐出，內容不缺字', async () => {
    mockStream('寶寶早安，我也好想妳。今天也要乖乖的喔。');
    const seen = [];
    await callLLM({ ...opts, stream: true, onChunk: t => seen.push(t) });
    expect(seen.join('')).toBe('寶寶早安，我也好想妳。今天也要乖乖的喔。');
  });

  it('<thinking> 標籤與純文字思考同時出現時兩道過濾都生效', async () => {
    mockStream(`<thinking>先想一下</thinking>${LEAK_HEAD}第一則：\n我在這裡。`);
    const seen = [];
    const { fullText } = await callLLM({ ...opts, stream: true, onChunk: t => seen.push(t) });
    expect(seen.join('')).not.toContain('先想一下');
    expect(seen.join('')).not.toContain('thought');
    expect(fullText).toBe('我在這裡。');
  });
});
