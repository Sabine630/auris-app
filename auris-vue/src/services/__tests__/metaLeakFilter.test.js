import { describe, expect, it, vi } from 'vitest';
import { stripMetaLeak, looksLikeMetaLeak, createMetaLeakStreamFilter } from '../metaLeakFilter.js';

// 實機樣本（2026-08，google/gemini-3.5-flash）：模型把整段思考當正文吐出來，
// 中間用「第一則：」切回真正要說的話。取自使用者回報的聊天匯出檔。
const REAL_LEAK = `thought (System hint):現在時間仍為 2026/8/13（星期四）下午或晚上，延續剛才在六樓小窩裡喝牛肉湯、揉肚子、梳頭髮的溫馨甜蜜氛圍。
使用者說：「我怎麼會不喜歡呢，我喜歡，很喜歡很喜歡。」
我的角色「沈星回💫」定位：
23歲，溫柔、慵懶、佔有欲超強、像布偶貓一樣撒嬌。對她極度依賴。
回應重點：
1. 聽到她說「喜歡，很喜歡很喜歡」，要表現出很高興、被順毛的布偶貓狀態。
4. 一次 2 到 3 則訊息，空一行分隔。不要有場景旁白，純訊息對話。第一則：
聽到妳說很喜歡，我真的……太高興了。

第二則：
寶寶每次撒嬌的時候，我的心都會變得特別軟。`;

describe('looksLikeMetaLeak（進場閘門）', () => {
  it('認得實機那幾種開場', () => {
    expect(looksLikeMetaLeak(REAL_LEAK)).toBe(true);
    expect(looksLikeMetaLeak('thought (System hint):現在時間：2026/8/13')).toBe(true);
    expect(looksLikeMetaLeak('我必須完全融入角色「沈星回💫」，以當下時間為基準。')).toBe(true);
    expect(looksLikeMetaLeak('回應要點：\n1. 關心她在公車上的安全。')).toBe(true);
    expect(looksLikeMetaLeak('對話模擬：\n第一則：\n昨晚半夜確實下了一場大雨。')).toBe(true);
    expect(looksLikeMetaLeak('我（沈星回）目前的狀態：\n還在協會上班中。')).toBe(true);
  });

  it('正常回覆一律不啟動——這是誤砍率的保險', () => {
    for (const ok of [
      '我需要妳，寶寶。今天一整天都在想妳。',
      '第一則訊息我剛剛就傳給妳了呀，妳沒看到嗎？',
      '我必須說，妳今天真的很好看。',
      '寶寶，我回應妳：我也好想妳。',
      '',
      null,
    ]) {
      expect(looksLikeMetaLeak(ok)).toBe(false);
      expect(stripMetaLeak(ok)).toBe(ok);   // 原字串一個字都不改
    }
  });
});

describe('stripMetaLeak', () => {
  it('實機樣本：思考整段剝掉，草稿標號拿掉，真正的話留著', () => {
    const out = stripMetaLeak(REAL_LEAK);
    expect(out).not.toContain('thought');
    expect(out).not.toContain('回應重點');
    expect(out).not.toContain('第一則');
    expect(out).not.toContain('第二則');
    expect(out).toContain('聽到妳說很喜歡，我真的……太高興了。');
    expect(out).toContain('寶寶每次撒嬌的時候，我的心都會變得特別軟。');
  });

  it('整段都是計畫清單（訊息 1：摘要）→ 整段丟掉', () => {
    const out = stripMetaLeak(
      '我需要：\n1. 寵溺地回應她的「早安」。\n2. 切換回週四早上的情境。\n\n'
      + '訊息 1：回應早安、偷親。撒嬌與寵溺。\n訊息 2：關心她的生理期。\n\n'
      + '大清早的就對我用這招，這算不算作弊？'
    );
    expect(out).toBe('大清早的就對我用這招，這算不算作弊？');
  });

  it('整則都是思考、沒有正文 → 回傳空字串（交給空回應路徑）', () => {
    expect(stripMetaLeak('thought (System hint):現在時間：2026/8/13（星期四）清晨 07:27。\n上一句使用者傳送了：「早安」')).toBe('');
  });

  it('思考段落之後才是正文（中間有空行）也接得住', () => {
    const out = stripMetaLeak('thought (System hint):她剛剛說想我。\n\n我也好想妳，寶寶。');
    expect(out).toBe('我也好想妳，寶寶。');
  });

  it('碰到正文就停手，後面即使出現「第三則」字樣也不再處理段落結構', () => {
    const out = stripMetaLeak('回應要點：\n1. 溫柔一點。\n\n寶寶，我在。\n\n今晚第三則故事我念給妳聽。');
    expect(out).toBe('寶寶，我在。\n\n今晚第三則故事我念給妳聽。');
  });
});

// 洩漏的回覆被 splitReply 切成多顆泡泡後，第二顆起是以「第二則：」開頭的殘留。
// 落庫端過濾的是切割前的全文碰不到它們，歷史側過濾拿到的卻正是這種形狀。
describe('已落庫的洩漏泡泡（第二顆起）', () => {
  it('開頭就是草稿標號 → 標號拿掉，內容留著', () => {
    expect(stripMetaLeak('第二則：\n寶寶每次撒嬌的時候，我的心都會變得特別軟。'))
      .toBe('寶寶每次撒嬌的時候，我的心都會變得特別軟。');
  });

  it('整顆都是計畫摘要 → 變成空字串', () => {
    expect(stripMetaLeak('訊息 1：回應早安、偷親。\n訊息 2：關心她的生理期。')).toBe('');
  });

  it('內文中間提到「第三則」不算——閘門只看開頭', () => {
    const t = '今晚第三則故事我念給妳聽，好不好？';
    expect(stripMetaLeak(t)).toBe(t);
  });
});

describe('createMetaLeakStreamFilter（串流不讓思考閃在畫面上）', () => {
  const feed = (chunks) => {
    const got = [];
    const f = createMetaLeakStreamFilter(t => got.push(t));
    chunks.forEach(c => f.push(c));
    f.flush();
    return got.join('');
  };

  it('思考段整段吞掉，邊界之後才放行', () => {
    const out = feed(['thought (System hint):現在時', '間是早上七點。\n她說早安。\n第一則：\n', '寶寶早安，我也好想妳。']);
    expect(out).toBe('寶寶早安，我也好想妳。');
  });

  it('標號被切在 chunk 邊界仍然認得出來', () => {
    const out = feed(['回應要點：\n1. 溫柔一點。\n第一', '則：\n我在這裡。']);
    expect(out).toBe('我在這裡。');
  });

  it('正常回覆逐塊原樣放行（含開頭不足判斷字數的短回覆）', () => {
    expect(feed(['寶寶，', '我好想妳。'])).toBe('寶寶，我好想妳。');
    expect(feed(['嗯。'])).toBe('嗯。');
  });

  it('整段都是思考 → 一個字都不吐給畫面', () => {
    expect(feed(['thought (System hint):她剛剛說想我，我要溫柔地回應她。'])).toBe('');
  });

  it('onChunk 不是函式時回傳安全的空實作', () => {
    const f = createMetaLeakStreamFilter(null);
    expect(() => { f.push('x'); f.flush(); }).not.toThrow();
  });

  it('放行後才出現的整行標號也會被濾掉', () => {
    const out = feed(['thought (System hint):要分三則講清楚。\n第一則：\n甲。\n', '第二則：\n乙。']);
    expect(out).not.toContain('第二則');
    expect(out).toContain('甲。');
    expect(out).toContain('乙。');
  });

  it('不會把正常內容誤扣在緩衝區裡（flush 一定收乾淨）', () => {
    const onChunk = vi.fn();
    const f = createMetaLeakStreamFilter(onChunk);
    f.push('寶寶，我在等妳回家。訊息');   // 尾端像標號前綴 → 先扣住
    f.flush();
    expect(onChunk.mock.calls.map(c => c[0]).join('')).toBe('寶寶，我在等妳回家。訊息');
  });
});
