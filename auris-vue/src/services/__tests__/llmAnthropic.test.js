import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Anthropic 非串流回應的內容組裝（P132）。
//
// 實機病灶：擷取器（stream:false）在 claude-opus-4-8 上永遠拿到空字串——因為回應
// 的 content 是 block 陣列，模型先放一個 thinking block 時 content[0] 沒有 .text，
// 舊實作只取 content[0]?.text 就變成 ''。解析不到 ops → 靜默 return → 不拋錯、
// 診斷裡什麼都沒有，待續的事永遠是空的。串流那條有正確過濾 text_delta，所以聊天
// 本身看起來一切正常，只有背景的非串流任務全部悄悄失效。

vi.mock('../demoMode.js', () => ({ isDemo: () => false }));
vi.mock('../diag.js', () => ({ logError: vi.fn() }));

const { callLLM } = await import('../llm.js');

function mockAnthropicResponse(content, { stop_reason = 'end_turn', ok = true, status = 200 } = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok,
    status,
    json: async () => ({ id: 'msg_1', type: 'message', role: 'assistant', content, stop_reason }),
  })));
}

const call = () => callLLM({
  provider: 'anthropic', model: 'claude-opus-4-8', base: 'https://example.test',
  apiKey: 'sk-demo-test', system: 'x', messages: [{ role: 'user', content: 'y' }],
  stream: false, maxTokens: 1000,
});

describe('Anthropic 非串流回應組裝', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('thinking block 排在前面時仍取得 text（實機病灶）', async () => {
    const ops = '[{"op":"ADD","title":"跟唱片公司開會","eventDate":"2026-08-02"}]';
    mockAnthropicResponse([
      { type: 'thinking', thinking: 'The user mentioned a meeting on 8/2...', signature: 'abc' },
      { type: 'text', text: ops },
    ]);
    const { fullText } = await call();
    expect(fullText).toBe(ops);
  });

  it('多個 text block 依序串接，不是只取第一個', async () => {
    mockAnthropicResponse([
      { type: 'text', text: '前段。' },
      { type: 'text', text: '後段。' },
    ]);
    expect((await call()).fullText).toBe('前段。後段。');
  });

  it('只有 text block 的一般回應維持原行為', async () => {
    mockAnthropicResponse([{ type: 'text', text: '「好。」' }]);
    expect((await call()).fullText).toBe('「好。」');
  });

  it('非 text block（tool_use／redacted_thinking）不會被誤當成內容', async () => {
    mockAnthropicResponse([
      { type: 'redacted_thinking', data: 'zzz' },
      { type: 'tool_use', id: 't1', name: 'x', input: {} },
      { type: 'text', text: '實際回覆' },
    ]);
    expect((await call()).fullText).toBe('實際回覆');
  });

  it('完全沒有 text block 時回空字串，不拋錯', async () => {
    mockAnthropicResponse([{ type: 'thinking', thinking: 'only thought', signature: 'a' }]);
    expect((await call()).fullText).toBe('');
  });

  it('content 缺席或非陣列時安全回空字串', async () => {
    mockAnthropicResponse(undefined);
    expect((await call()).fullText).toBe('');
  });

  it('max_tokens 截斷旗標照常回報', async () => {
    mockAnthropicResponse([{ type: 'text', text: '半句' }], { stop_reason: 'max_tokens' });
    expect((await call()).truncated).toBe(true);
  });
});
