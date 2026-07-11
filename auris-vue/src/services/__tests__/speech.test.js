import { describe, it, expect } from 'vitest';
import { stripActionText } from '../speech.js';

describe('stripActionText — 朗讀前剝除動作描寫', () => {
  it('剝除全形括號動作', () => {
    expect(stripActionText('（抱住了你）晚安')).toBe('晚安');
  });

  it('剝除半形括號動作', () => {
    expect(stripActionText('(sigh) 好吧，聽你的')).toBe('好吧，聽你的');
  });

  it('句中多段動作都剝', () => {
    expect(stripActionText('嗯（點頭），我在（笑）聽')).toBe('嗯，我在聽');
  });

  it('整句都是動作 → 回原文照唸（不能唸出空白）', () => {
    expect(stripActionText('（拍了拍你）')).toBe('（拍了拍你）');
  });

  it('剝完多餘空行收斂', () => {
    expect(stripActionText('好\n（起身）\n走吧')).toBe('好\n走吧');
  });
});
