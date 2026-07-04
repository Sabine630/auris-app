import { describe, it, expect } from 'vitest';
import { formatContent, splitReply } from '../format.js';

// formatContent 是全站唯一的 XSS 防線（所有 v-html 渲染點共用），測試聚焦「危險字元一定被 escape」。
describe('formatContent — XSS 防線', () => {
  it('escape <script>，輸出不含原始標籤', () => {
    const out = formatContent('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).not.toContain('<script>');
  });

  it('& 最先處理：單獨 < 轉成 &lt; 而非 &amp;lt;', () => {
    // 若 & 在 < 之後才 escape，'<' 會變成 '&amp;lt;'（錯）。輸出為 '&lt;' 證明順序正確。
    expect(formatContent('<')).toBe('&lt;');
  });

  it('字面 & 轉成 &amp;', () => {
    expect(formatContent('a & b')).toBe('a &amp; b');
  });

  it('> 轉成 &gt;', () => {
    expect(formatContent('a > b')).toBe('a &gt; b');
  });

  it('空行轉成 <br>', () => {
    expect(formatContent('你好\n\n再見')).toContain('<br>');
  });

  it('null/空字串回空字串', () => {
    expect(formatContent(null)).toBe('');
    expect(formatContent('')).toBe('');
  });
});

// 換行處理（P103 重診改版）：模型的單 \n 是刻意分行（實證：「今天心情看起來不錯\n做什麼了」
// 是兩句），P56/P101 的「合併孤立換行」把刻意分行黏成一長串。當年「句中被腰斬」其實是
// .msg-with-av 雙重 74% 壓縮的 CSS bug（已修）。P103 起【保留】所有單一換行，
// 只做 \r 正規化、行尾空白清理、3+ 連續換行收斂。
describe('formatContent — 換行保留（P103）', () => {
  it('單一換行保留為 <br>，不再合併', () => {
    expect(formatContent('吃午餐了\n沒。')).toBe('吃午餐了<br>沒。');
  });

  it('刻意分行的兩句各自成行（P103 實證案例）', () => {
    expect(formatContent('今天心情看起來不錯\n做什麼了')).toBe('今天心情看起來不錯<br>做什麼了');
  });

  it('行尾空白清掉、換行保留（「字 \\n字」）', () => {
    expect(formatContent('吃午餐了 \n沒。')).toBe('吃午餐了<br>沒。');
  });

  it('\\r\\n 正規化成 <br>', () => {
    expect(formatContent('吃午餐了\r\n沒。')).toBe('吃午餐了<br>沒。');
  });

  it('連續單行 A\\nB\\nC 各自成行', () => {
    expect(formatContent('一\n二\n三')).toBe('一<br>二<br>三');
  });

  it('英文單行換行也保留', () => {
    expect(formatContent('hello\nworld')).toBe('hello<br>world');
  });

  it('段落空行（\\n\\n）保留', () => {
    expect(formatContent('第一段\n\n第二段')).toBe('第一段<br><br>第二段');
  });

  it('\\r\\n\\r\\n 段落空行正規化後仍保留', () => {
    expect(formatContent('第一段\r\n\r\n第二段')).toBe('第一段<br><br>第二段');
  });

  it('3 個以上連續換行收斂成一個空行', () => {
    expect(formatContent('第一段\n\n\n\n第二段')).toBe('第一段<br><br>第二段');
  });
});

describe('formatContent — enableRich 富文本', () => {
  it('*動作* 轉成 <em class="msg-action">', () => {
    expect(formatContent('*揮手*', true)).toBe('<em class="msg-action">揮手</em>');
  });

  it('「對話」轉成 <span class="msg-quote">', () => {
    expect(formatContent('「嗨」', true)).toBe('<span class="msg-quote">「嗨」</span>');
  });

  it('富文本仍先 escape：*<b>* 內的標籤被 escape、不引入原始 HTML', () => {
    const out = formatContent('*<b>*', true);
    expect(out).toContain('&lt;b&gt;');
    expect(out).not.toContain('<b>');
  });

  it('非富文本模式不解析星號（維持原樣）', () => {
    const out = formatContent('*x*');
    expect(out).toBe('*x*');
    expect(out).not.toContain('<em');
  });
});

describe('splitReply', () => {
  it('空行切成多段', () => {
    expect(splitReply('第一句\n\n第二句')).toEqual(['第一句', '第二句']);
  });

  it('無空行回單段', () => {
    expect(splitReply('只有一句')).toEqual(['只有一句']);
  });

  it('空字串回 []', () => {
    expect(splitReply('')).toEqual([]);
  });

  it('純空白回 []', () => {
    expect(splitReply('   \n\n   ')).toEqual([]);
  });

  it('maxSegments 超過時尾段合併回最後一段', () => {
    const out = splitReply('a\n\nb\n\nc\n\nd', 2);
    expect(out.length).toBe(2);
    expect(out[0]).toBe('a');
    expect(out[1]).toContain('b');
    expect(out[1]).toContain('d');
  });

  it('引號泡泡：」接「 的交界補切點', () => {
    expect(splitReply('「A」「B」')).toEqual(['「A」', '「B」']);
  });
});
