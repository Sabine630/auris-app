import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  characterLanguageInstruction,
  convertVisibleProse,
  normalizeCharacterOutput,
} from '../outputLanguage.js';

describe('characterLanguageInstruction', () => {
  it('zh-tw 明確要求台灣繁體，未知值安全回退 zh-tw', () => {
    expect(characterLanguageInstruction('zh-tw')).toContain('繁體中文（台灣用語）');
    expect(characterLanguageInstruction('unknown')).toContain('繁體中文（台灣用語）');
  });

  it.each([
    ['zh-cn', '简体中文'],
    ['ja', '日本語'],
    ['ko', '한국어'],
    ['en', 'English'],
  ])('%s 有自己的輸出語言規則', (lang, expected) => {
    expect(characterLanguageInstruction(lang)).toContain(expected);
  });
});

describe('convertVisibleProse', () => {
  const fakeConverter = text => text.replaceAll('软件', '軟體').replaceAll('鼠标', '滑鼠');

  it('只轉一般文字，保留 fenced code、inline code 與 URL', () => {
    const input = [
      '这个软件支持鼠标。',
      '`const 软件 = "鼠标"`',
      'https://example.com/软件/鼠标',
      '```js',
      'const 软件 = "鼠标"',
      '```',
      '软件说明',
    ].join('\n');

    expect(convertVisibleProse(input, fakeConverter)).toBe([
      '这个軟體支持滑鼠。',
      '`const 软件 = "鼠标"`',
      'https://example.com/软件/鼠标',
      '```js',
      'const 软件 = "鼠标"',
      '```',
      '軟體说明',
    ].join('\n'));
  });

  it('未關閉的 fenced code 後續內容也不轉換', () => {
    expect(convertVisibleProse('~~~txt\n软件\n鼠标', fakeConverter))
      .toBe('~~~txt\n软件\n鼠标');
  });
});

describe('normalizeCharacterOutput', () => {
  it('zh-tw 以 OpenCC 轉成台灣繁體與用語', async () => {
    await expect(normalizeCharacterOutput('这个软件里的头发和鼠标。', 'zh-tw'))
      .resolves.toBe('這個軟體裡的頭髮和滑鼠。');
  });

  it.each(['zh-cn', 'ja', 'ko', 'en'])('%s 完全不轉換', async (lang) => {
    await expect(normalizeCharacterOutput('这个软件里的鼠标。', lang))
      .resolves.toBe('这个软件里的鼠标。');
  });

  it('原本就是繁體時內容不變', async () => {
    await expect(normalizeCharacterOutput('這個軟體裡的滑鼠。', 'zh-tw'))
      .resolves.toBe('這個軟體裡的滑鼠。');
  });
});

// 曾經因「字典精簡」而轉錯的案例：OpenCC 最長匹配依賴完整詞表，精簡策略已放棄，
// 這組案例釘住不許回歸（詳見 zhTwWorker.js 的註解）。
describe('完整字典的最長匹配案例', () => {
  it.each([
    ['事情不断发展', '事情不斷發展'],
    ['三天后', '三天後'],
    ['一干二净', '一乾二淨'],
    ['他的头发有点长', '他的頭髮有點長'],
    ['第一千万只跟来', '第一千萬只跟來'],
    ['录取名单周遍', '錄取名單周遍'],
  ])('%s → %s', async (input, expected) => {
    await expect(normalizeCharacterOutput(input, 'zh-tw')).resolves.toBe(expected);
  });
});

describe('normalizeCharacterOutput 的失敗防護', () => {
  it('轉換器拋錯時退回原文，不讓已生成的回覆消失', async () => {
    vi.resetModules();
    vi.doMock('opencc-js/core', () => ({
      ConverterFactory: () => () => { throw new Error('dict unavailable'); },
    }));
    const { normalizeCharacterOutput: broken } = await import('../outputLanguage.js');
    await expect(broken('这个软件里的鼠标。', 'zh-tw')).resolves.toBe('这个软件里的鼠标。');
    vi.doUnmock('opencc-js/core');
    vi.resetModules();
  });
});

// 記憶體防線的回歸測試：Worker 一定要被 terminate，退路一定不能快取 converter——
// 兩者任一失守，20 MB 以上的字典 trie 就會常駐使用者裝置（見 outputLanguage.js 註解）。
describe('轉換資源的釋放', () => {
  const installFakeWorker = (behaviour) => {
    const calls = { spawned: 0, terminated: 0 };
    class FakeWorker {
      constructor() { calls.spawned++; this.onmessage = null; this.onerror = null; }
      postMessage() { setTimeout(() => behaviour(this), 0); }
      terminate() { calls.terminated++; }
    }
    vi.stubGlobal('Worker', FakeWorker);
    return calls;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('Worker 成功時回傳結果並 terminate', async () => {
    const calls = installFakeWorker(w => w.onmessage({ data: { ok: true, text: '轉好了' } }));
    vi.resetModules();
    const { normalizeCharacterOutput: fn } = await import('../outputLanguage.js');
    await expect(fn('这个软件', 'zh-tw')).resolves.toBe('轉好了');
    expect(calls).toEqual({ spawned: 1, terminated: 1 });
  });

  it('Worker 回報失敗時仍 terminate，並由主執行緒退路完成轉換', async () => {
    const calls = installFakeWorker(w => w.onmessage({ data: { ok: false, error: 'boom' } }));
    vi.resetModules();
    const { normalizeCharacterOutput: fn } = await import('../outputLanguage.js');
    await expect(fn('这个软件里的鼠标。', 'zh-tw')).resolves.toBe('這個軟體裡的滑鼠。');
    expect(calls).toEqual({ spawned: 1, terminated: 1 });
  });

  it('Worker onerror（如舊 Safari 不支援 module worker）時仍 terminate', async () => {
    const calls = installFakeWorker(w => w.onerror({ message: 'module worker unsupported' }));
    vi.resetModules();
    const { normalizeCharacterOutput: fn } = await import('../outputLanguage.js');
    await expect(fn('这个软件', 'zh-tw')).resolves.toBe('這個軟體');
    expect(calls).toEqual({ spawned: 1, terminated: 1 });
  });

  it('主執行緒退路不快取 converter：每次呼叫都重建，字典 trie 不常駐', async () => {
    vi.resetModules();
    let built = 0;
    vi.doMock('opencc-js/core', async () => {
      const actual = await vi.importActual('opencc-js/core');
      return { ConverterFactory: (...args) => { built++; return actual.ConverterFactory(...args); } };
    });
    const { normalizeCharacterOutput: fn } = await import('../outputLanguage.js');
    await fn('这个软件', 'zh-tw');
    await fn('这个鼠标', 'zh-tw');
    expect(built).toBe(2);
    vi.doUnmock('opencc-js/core');
  });
});
