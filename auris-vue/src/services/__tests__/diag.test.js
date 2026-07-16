import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db.js', () => ({
  getSetting: async () => null,
  dbCount: async () => 0,
}));

import { logError, getErrors, formatDiagError, exportDiag, installGlobalErrorLog } from '../diag.js';
import { APP_VERSION } from '../../version.js';

// node 環境沒有 localStorage：給一個記憶體版 stub
const store = new Map();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

describe('logError — strict（預設）：不保存原始 message', () => {
  it('LLM 錯誤含使用者原文 → 只留 provider/model 與 HTTP status', () => {
    logError('llm', new Error('供應商回傳使用者原文：秘密內容，HTTP 429'), {
      provider: 'anthropic',
      model: 'claude-x',
    });
    const list = getErrors();
    expect(list).toHaveLength(1);
    expect(list[0].v).toBe(APP_VERSION);
    expect(list[0].src).toBe('llm');
    expect(list[0].localMessage).toBeUndefined();
    expect(formatDiagError(list[0])).toBe('anthropic/claude-x | HTTP 429');
    expect(JSON.stringify(list)).not.toContain('秘密內容');
    expect(list[0].t).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('unhandledrejection 類呼叫（無 policy）→ 任意 reason 不保存', () => {
    logError('promise', '使用者輸入：' + 'x'.repeat(500));
    const list = getErrors();
    expect(list[0].code).toBe('runtime_error');
    expect(list[0].localMessage).toBeUndefined();
    expect(JSON.stringify(list)).not.toContain('使用者輸入');
  });

  it('policy 非 trusted-local 一律 strict（不能用怪值繞過）', () => {
    logError('window', new Error('leak me'), { policy: 'TRUSTED-LOCAL' });
    logError('window', new Error('leak me'), { policy: true });
    for (const entry of getErrors()) expect(entry.localMessage).toBeUndefined();
  });

  it('辨識 timeout／network／storage 分類', () => {
    logError('llm', 'request_timeout');
    logError('llm', 'Failed to fetch user prompt');
    logError('db', 'IndexedDB transaction failed: private text');
    const [a, b, c] = getErrors();
    expect(a.code).toBe('request_timeout');
    expect(b.code).toBe('network_error');
    expect(c.code).toBe('storage_error');
  });
});

describe('logError — trusted-local：保留清理後的本地錯誤訊息', () => {
  it('本地 TypeError 保留有用訊息（含 Error.name）', () => {
    logError('window', new TypeError("Cannot read properties of undefined (reading 'x')"), {
      policy: 'trusted-local',
      location: 'index-abc.js:123',
    });
    const [entry] = getErrors();
    expect(entry.localMessage).toContain('TypeError');
    expect(entry.localMessage).toContain('Cannot read properties of undefined');
    expect(formatDiagError(entry)).toContain('at index-abc.js:123');
  });

  it('訊息含金鑰特徵 → 實際遮蔽成 [REDACTED]，不是整段丟棄', () => {
    const fakeKey = 'sk-' + 'A'.repeat(24);
    const fakeGoog = 'AIza' + 'B'.repeat(32);
    logError('init', new Error(`open failed with ${fakeKey} and ${fakeGoog} tail`), { policy: 'trusted-local' });
    const [entry] = getErrors();
    expect(entry.localMessage).toContain('[REDACTED]');
    expect(entry.localMessage).toContain('open failed');
    expect(entry.localMessage).toContain('tail');
    expect(JSON.stringify(getErrors())).not.toContain(fakeKey);
    expect(JSON.stringify(getErrors())).not.toContain(fakeGoog);
  });

  it('URL（含 query/fragment）→ 整段換成 [URL]', () => {
    logError('init', new Error('fetch https://api.example.com/v1?key=abc123#frag failed, why?'), { policy: 'trusted-local' });
    const [entry] = getErrors();
    expect(entry.localMessage).toContain('[URL]');
    expect(entry.localMessage).not.toContain('key=abc123');
    expect(entry.localMessage).not.toContain('api.example.com');
    // 一般問號文字不受 URL 遮蔽影響
    expect(entry.localMessage).toContain('why?');
  });

  it('超過 300 字截斷；遮蔽先於截斷', () => {
    const fakeKey = 'sk-' + 'C'.repeat(24);
    logError('init', new Error('x'.repeat(400) + fakeKey), { policy: 'trusted-local' });
    const [entry] = getErrors();
    expect(entry.localMessage.length).toBeLessThanOrEqual(300);
    expect(JSON.stringify(getErrors())).not.toContain(fakeKey);
  });

  it('控制字元刪除（非換空白——防金鑰被控制字元切開避過遮蔽）', () => {
    logError('init', new Error('line1\nline2\tx\u0000end'), { policy: 'trusted-local' });
    const [entry] = getErrors();
    expect(entry.localMessage).not.toMatch(/[\n\t\u0000]/);
    expect(entry.localMessage).toContain('line1line2');
  });

  it('被換行切開的金鑰片段：黏合後仍會被遮蔽', () => {
    const head = 'sk-' + 'E'.repeat(4);
    const tail = 'E'.repeat(20);
    logError('init', new Error(`token ${head}\n${tail} leaked`), { policy: 'trusted-local' });
    const [entry] = getErrors();
    expect(entry.localMessage).toContain('[REDACTED]');
    expect(JSON.stringify(getErrors())).not.toContain(head + tail);
  });
});

describe('ring buffer 行為', () => {
  it('超過 30 筆只留最新 30 筆', () => {
    for (let i = 1; i <= 35; i++) logError(`window_${i}`, 'raw detail');
    const list = getErrors();
    expect(list).toHaveLength(30);
    expect(list[0].src).toBe('window_6');
    expect(list[29].src).toBe('window_35');
  });

  it('undefined／物件訊息不炸、正常分類', () => {
    logError('window', undefined);
    logError('window', { weird: true });
    const list = getErrors();
    expect(list).toHaveLength(2);
    expect(list[0].code).toBe('runtime_error');
  });
});

describe('getErrors — 讀出時重新驗證與遮蔽', () => {
  it('localStorage 內容損毀 → 回空陣列', () => {
    store.set('auris_diag_errors', '{not json');
    expect(getErrors()).toEqual([]);
  });

  it('內容不是陣列 → 回空陣列', () => {
    store.set('auris_diag_errors', '{"a":1}');
    expect(getErrors()).toEqual([]);
  });

  it('舊版（schema 1）原始錯誤文字 → 只重分類，不保留原文', () => {
    store.set('auris_diag_errors', JSON.stringify([{
      t: '2026-07-15T00:00:00.000Z',
      v: 'P113',
      src: 'llm',
      msg: '第三方回傳對話片段：不要外流，HTTP 500',
    }]));
    const [entry] = getErrors();
    expect(entry.status).toBe(500);
    expect(entry.localMessage).toBeUndefined();
    expect(JSON.stringify(getErrors())).not.toContain('不要外流');
    expect(formatDiagError(entry)).toBe('HTTP 500');
  });

  it('被竄改的 schema 2 資料：localMessage 重新遮蔽、code 走 allowlist', () => {
    const fakeKey = 'sk-' + 'D'.repeat(24);
    store.set('auris_diag_errors', JSON.stringify([{
      schema: 2,
      t: '2026-07-15T00:00:00.000Z',
      v: 'P114',
      src: 'init',
      code: 'evil_code_<script>',
      status: 9999,
      localMessage: `stored raw ${fakeKey} and https://evil.example/steal?d=1`,
    }]));
    const [entry] = getErrors();
    expect(entry.code).toBe('runtime_error');          // 不在 allowlist → 退回
    expect(entry.status).toBeUndefined();               // 超出範圍 → 丟棄
    expect(entry.localMessage).toContain('[REDACTED]');
    expect(entry.localMessage).toContain('[URL]');
    expect(JSON.stringify(getErrors())).not.toContain(fakeKey);
    expect(JSON.stringify(getErrors())).not.toContain('evil.example');
  });

  it('竄改資料超量 → 讀出仍限最新 30 筆', () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ schema: 2, t: '2026-07-15T00:00:00.000Z', v: 'P114', src: `s${i}`, code: 'runtime_error' }));
    store.set('auris_diag_errors', JSON.stringify(rows));
    const list = getErrors();
    expect(list).toHaveLength(30);
    expect(list[29].src).toBe('s39');
  });

  it('timestamp 夾帶注入尾字串 → 重新輸出標準 ISO 或 unknown-time', () => {
    store.set('auris_diag_errors', JSON.stringify([{ schema: 2, t: '2026-07-15T00:00:00.000Z\nINJECT', v: 'P114', src: 'x', code: 'runtime_error' }]));
    const [entry] = getErrors();
    expect(entry.t).not.toContain('INJECT');
    expect(entry.t).not.toContain('\n');
  });

  it('location 夾帶 query/fragment → 讀出時剝除', () => {
    store.set('auris_diag_errors', JSON.stringify([{ schema: 2, t: '2026-07-15T00:00:00.000Z', v: 'P114', src: 'x', code: 'runtime_error', location: 'app.js?token=VISIBLE#x' }]));
    expect(getErrors()[0].location).toBe('app.js');
    expect(JSON.stringify(getErrors())).not.toContain('VISIBLE');
  });

  it('formatDiagError 直接餵未清理物件 → 最後防線仍 allowlist＋遮蔽', () => {
    const fakeKey = 'sk-' + 'F'.repeat(24);
    const line = formatDiagError({ code: 'evil<', status: 9999, provider: '秘密', location: 'x.js?t=SECRET', localMessage: `raw ${fakeKey} https://evil.example/p?q=1` });
    expect(line).toContain('runtime_error');
    expect(line).not.toContain('9999');
    expect(line).toContain('[REDACTED]');
    expect(line).toContain('[URL]');
    expect(line).toContain('at x.js');
    expect(line).not.toContain(fakeKey);
    expect(line).not.toContain('SECRET');
  });

  it('localStorage 不存在（隱私模式炸掉）→ logError 不拋錯', () => {
    delete globalThis.localStorage;
    expect(() => logError('window', 'boom')).not.toThrow();
    expect(getErrors()).toEqual([]);
  });
});

describe('installGlobalErrorLog — window error 同源驗證', () => {
  function fireError(filename) {
    const handlers = {};
    vi.stubGlobal('window', { addEventListener: (ev, fn) => { handlers[ev] = fn; } });
    vi.stubGlobal('location', { href: 'https://sabine630.github.io/auris-app/', origin: 'https://sabine630.github.io' });
    installGlobalErrorLog();
    handlers.error({ filename, lineno: 42, message: 'boom secret-detail', error: new TypeError('boom secret-detail') });
    return getErrors().at(-1);
  }

  it('同源 script → trusted-local：保留清理後訊息，location 取 basename（丟 query/fragment）', () => {
    const e = fireError('https://sabine630.github.io/auris-app/assets/index-abc.js?v=1#x');
    expect(e.localMessage).toContain('boom secret-detail');
    expect(e.location).toBe('index-abc.js:42');
  });

  it('跨源 script（CSP 允許的 vercel.live）→ strict：不保存 message', () => {
    const e = fireError('https://vercel.live/feedback.js');
    expect(e.localMessage).toBeUndefined();
    expect(JSON.stringify([e])).not.toContain('secret-detail');
  });

  it('無 filename → strict', () => {
    const e = fireError('');
    expect(e.localMessage).toBeUndefined();
  });
});

describe('exportDiag — 匯出內容去敏', () => {
  it('匯出含錯誤行且不含第三方原文；settings 值過 safeLabel', async () => {
    // node 環境補瀏覽器全域（exportDiag 直接讀 window/navigator；node 的 navigator
    // 是唯讀 getter，須用 vi.stubGlobal）
    vi.stubGlobal('window', { devicePixelRatio: 2, innerWidth: 390, innerHeight: 844, matchMedia: () => ({ matches: false }), navigator: {} });
    vi.stubGlobal('navigator', { userAgent: 'vitest' });
    vi.stubGlobal('screen', { width: 390, height: 844 });
    logError('llm', new Error('provider echoed: 私人對話, HTTP 502'), { provider: 'openai', model: 'gpt-x' });
    logError('init', new TypeError('boom'), { policy: 'trusted-local' });
    const text = await exportDiag();
    expect(text).toContain('openai/gpt-x | HTTP 502');
    expect(text).toContain('TypeError: boom');
    expect(text).not.toContain('私人對話');
  });
});
