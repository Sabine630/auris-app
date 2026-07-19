// demoReply 的 system 判斷（P130 驗收修正第二批）：聊天與主動生成傳入的 system 是
// prompt-cache blocks 陣列（[{ text, cache? }, …]），不是字串——原 String(system) 只會得到
// [object Object]，睡前分支永遠不命中。這裡鎖住「blocks 攤平後關鍵字判斷」的行為。
import { describe, it, expect } from 'vitest';
import { demoReply } from '../demoData.js';

// 與 demoData.js 的 SLEEP_POOL 同步（未匯出，改池子時記得同步這裡）
const SLEEP_LINES = [
  '嗯，我在。不用說話也沒關係，聽聽雨聲就好。',
  '今天辛苦了。被子蓋好，剩下的交給我和這場雨。',
  '想聽個短短的故事也可以，或者就這樣安安靜靜待一會兒。',
];

// 仿真實聊天 prompt 的易變段：帶【長期記憶】「重要摘要」字樣（誤命中回歸的關鍵）
const REAL_VOLATILE = '\n現在時間：7/19（星期日）晚上 22:10。'
  + '\n【長期記憶】以下是過去對話的重要摘要，請在回覆時參考：\n1. 小晴近日為期末考焦慮，重視成績。';

describe('demoReply — system blocks 陣列攤平（P130）', () => {
  const stable = { text: '你是「夜雨」，請完全扮演這個角色與使用者對話。', cache: true };

  it('blocks 含【睡前收尾】→ 晚安收尾句', () => {
    const r = demoReply({ system: [stable, { text: '\n\n【睡前收尾】對方可能已經睡著了。輕聲道晚安收尾，1～2 句，不要問問題。' }] });
    expect(r).toContain('晚安');
  });

  it('blocks 含【睡前模式】→ 低刺激陪伴句池', () => {
    const r = demoReply({ system: [stable, { text: '\n【睡前模式】對方已準備入睡，請放慢節奏。' }] });
    expect(SLEEP_LINES).toContain(r);
  });

  it('blocks 含【睡前呼應】→ 早安關心句', () => {
    const r = demoReply({ system: [stable, { text: '\n【睡前呼應】昨晚你們一起度過了睡前時光。' }] });
    expect(r).toContain('昨晚睡得還好嗎');
  });

  it('睡前指示含「問題」二字，不會被每日一問的寬鬆關鍵字攔走', () => {
    const r = demoReply({ system: [stable, { text: '【睡前模式】不開新的刺激話題、不問需要動腦的問題。' }] });
    expect(SLEEP_LINES).toContain(r);
  });

  it('字串 system 行為不變（日記分支，配真實指令句）', () => {
    expect(demoReply({ system: '……\n請以角色的第一人稱寫今天的日記。\n【日記品質要求】…' })).toContain('錄音室');
  });

  it('一般聊天 blocks（無睡前字樣）→ 正常回聊天句，不會拼出 [object Object]', () => {
    const r = demoReply({ system: [stable, { text: '\n現在時間：7/19（星期日）晚上 22:10。' }] });
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
    expect(r).not.toContain('object Object');
    expect(SLEEP_LINES).not.toContain(r);
  });
});

// 誤命中回歸（P130 驗收修正第三批）：完整聊天 prompt 的易變段含【長期記憶】「重要摘要」，
// 原「總結／摘要」寬鬆分支會把睡前陪伴與晚安收尾攔走、回成關係摘要。
describe('demoReply — 帶【長期記憶】的真實 prompt 不誤入摘要分支', () => {
  const stable = { text: '你是「夜雨」，請完全扮演這個角色與使用者對話。', cache: true };
  const SUMMARY_TEXT = '小晴近日為期末考焦慮，重視成績、容易緊張；在深夜與夜雨的對話中逐漸放下防備，兩人關係趨於親近。';

  it('睡前模式聊天（volatile 含「重要摘要」）→ 陪伴句，不是摘要', () => {
    const r = demoReply({ system: [stable, { text: REAL_VOLATILE + '\n【睡前模式】對方已準備入睡，請放慢節奏、不問需要動腦的問題。' }] });
    expect(SLEEP_LINES).toContain(r);
    expect(r).not.toBe(SUMMARY_TEXT);
  });

  it('道晚安收尾（volatile 含「重要摘要」）→ 晚安句，不是摘要', () => {
    const r = demoReply({ system: [stable, { text: REAL_VOLATILE + '\n【睡前模式】…\n對方剛道了晚安：請溫柔地道晚安收尾。' }] });
    expect(r).toContain('晚安');
    expect(r).not.toBe(SUMMARY_TEXT);
  });

  it('一般聊天（volatile 含「重要摘要」、無睡前字樣）→ 聊天句，不是摘要也不是每日一問', () => {
    const r = demoReply({ system: [stable, { text: REAL_VOLATILE }] });
    expect(r).not.toBe(SUMMARY_TEXT);
    expect(r).not.toBe('如果今晚可以睡得很好，你最想夢見什麼？');
    expect(SLEEP_LINES).not.toContain(r);
  });

  it('記憶總結（sendLLMRequest 抽出的 system 字串含「對話分析助手」）→ 仍回摘要', () => {
    const r = demoReply({ system: '你是一個對話分析助手。請將以下聊天記錄濃縮成一段 100～200 字的重點摘要，用第三人稱描述。' });
    expect(r).toBe(SUMMARY_TEXT);
  });
});

// 內容分支改「獨有任務指令」匹配的回歸（P130 後 demo 補強）：
// 題材名詞出現在聊天 prompt 裡（拆封日的【時間膠囊】段、記憶提到「夢」）不得誤觸內容分支。
describe('demoReply — 題材名詞不誤觸內容生成分支', () => {
  const stable = { text: '你是「夜雨」，請完全扮演這個角色與使用者對話。', cache: true };
  const LETTER_OPEN = '給拆開這封信的你';

  it('拆封日聊天（volatile 含【時間膠囊】拆開段落）→ 聊天句，不是信件', () => {
    const capsuleCtx = '\n【時間膠囊】今天你們一起拆開了在 2026 年 4 月 19 日埋下的時間膠囊。對方當時寫給未來的信：「希望那時的我們還在聊」。請把這件事放在心上。';
    const r = demoReply({ system: [stable, { text: capsuleCtx }] });
    expect(r).not.toContain(LETTER_OPEN);
  });

  it('記憶含「夢」的聊天 → 聊天句，不是夢境腳本', () => {
    const memCtx = '\n【長期記憶】以下是過去對話的重要摘要，請在回覆時參考：\n1. 小晴說她昨晚做了一個夢，夢到考試遲到。';
    const r = demoReply({ system: [stable, { text: memCtx }] });
    expect(r).not.toContain('月台');
  });

  it('膠囊信件生成（含「請寫下你這封信」）→ 信件；到期訊息（【時間膠囊到期】）→ 到期通知', () => {
    expect(demoReply({ system: [stable, { text: '\n\n【時間膠囊】…請寫下你這封信——收信人是「那天的對方」。' }] })).toContain(LETTER_OPEN);
    expect(demoReply({ system: [stable, { text: '\n\n【時間膠囊到期】…請主動傳訊息告訴對方膠囊到期了。' }] })).toContain('到期');
  });

  it('夢境生成（含「夢境敘述」指令）→ 夢境腳本', () => {
    expect(demoReply({ system: '……請用第一人稱，寫一段完整、飄渺、詩意的夢境敘述。' })).toContain('月台');
  });

  it('心聲（純 messages、無 system）→ 靠 messages fallback 命中「極短的內心話」', () => {
    const hv = '你是「夜雨」。\n\n任務：寫一句**極短的內心話**——就是「沒說出口的那一句感受」。';
    const r = demoReply({ system: '', messages: [{ role: 'user', content: hv }] });
    expect(r).toContain('話到嘴邊');
  });

  it('有 system 的聊天不掃 messages（使用者訊息提到「日記」不誤觸）', () => {
    const r = demoReply({
      system: [stable, { text: '\n現在時間：…' }],
      messages: [{ role: 'user', content: '幫我用第一人稱寫今天的日記好不好' }],
    });
    expect(r).not.toContain('錄音室');
  });
});
