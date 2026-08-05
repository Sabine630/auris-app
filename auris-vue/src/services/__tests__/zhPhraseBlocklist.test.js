import { describe, expect, it } from 'vitest';
import { DROP_SOURCES, filterPhraseDict } from '../zhPhraseBlocklist.js';
import toTwp from 'opencc-js/to/twp';

describe('DROP_SOURCES', () => {
  it('收錄 9 個會誤觸發的碎片來源詞，肖邦不在其中', () => {
    expect([...DROP_SOURCES].sort()).toEqual(
      ['加納', '凱奇', '拉洛', '拉莫', '格拉斯', '歐拉', '布爾', '薩蒂', '香農'].sort()
    );
    expect(DROP_SOURCES.has('肖邦')).toBe(false);
  });
});

describe('filterPhraseDict', () => {
  it('對真正的 opencc-js/to/twp 匯出：濾掉排除清單條目，肖邦條目仍在', () => {
    const [filtered] = filterPhraseDict(toTwp);
    const entries = filtered[0].split('|');
    for (const source of DROP_SOURCES) {
      expect(entries.some(e => e.split(' ')[0] === source)).toBe(false);
    }
    expect(entries).toContain('肖邦 蕭邦');
  });

  it('只動詞彙層（第一個子陣列），字級對應表（其餘子陣列）原封不動', () => {
    const result = filterPhraseDict(toTwp);
    expect(result.length).toBe(toTwp.length);
    for (let i = 1; i < toTwp.length; i++) {
      expect(result[i]).toEqual(toTwp[i]);
    }
  });

  it('保留詞彙層陣列裡來源字串以外的其他元素（結構相容性）', () => {
    const fakeDict = [['来源 目標|格拉斯 葛拉斯', 'extra-meta'], ['second-group']];
    const [filtered] = filterPhraseDict(fakeDict);
    expect(filtered).toEqual(['来源 目標', 'extra-meta']);
  });

  it.each([
    ['非陣列（物件）', { not: 'an array' }],
    ['非陣列（字串）', 'not an array'],
    ['undefined', undefined],
    ['null', null],
    ['空陣列', []],
    ['第一項不是陣列', ['not-an-array', ['second']]],
    ['第一項陣列的第一個元素不是字串', [[12345], ['second']]],
  ])('toTwp 結構不如預期（%s）時原樣回傳，不拋錯、不吐空字典', (_label, malformed) => {
    expect(() => filterPhraseDict(malformed)).not.toThrow();
    expect(filterPhraseDict(malformed)).toBe(malformed);
  });
});
