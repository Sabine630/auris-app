import { describe, it, expect } from 'vitest';
import { estimateTokens } from '../tokens.js';

describe('estimateTokens', () => {
  it('空字串回 0', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens()).toBe(0);
  });

  it('CJK 每字約 0.6 token（向上取整）', () => {
    // '你好' = 2 CJK → ceil(2*0.6)=ceil(1.2)=2
    expect(estimateTokens('你好')).toBe(2);
  });

  it('英數每 4 字約 1 token', () => {
    // 'abcd' = 4 rest → ceil(4*0.25)=1
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('CJK 與英數混排分別計算後相加', () => {
    // '你好ab' = 2 CJK + 2 rest → ceil(1.2 + 0.5)=ceil(1.7)=2
    expect(estimateTokens('你好ab')).toBe(2);
  });
});
