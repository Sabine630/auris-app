import { describe, expect, it } from 'vitest';
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
