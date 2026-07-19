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

  it('字串 system 行為不變（日記分支）', () => {
    expect(demoReply({ system: '請以角色身分寫一篇日記' })).toContain('雨');
  });

  it('一般聊天 blocks（無睡前字樣）→ 正常回聊天句，不會拼出 [object Object]', () => {
    const r = demoReply({ system: [stable, { text: '\n現在時間：7/19（星期日）晚上 22:10。' }] });
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
    expect(r).not.toContain('object Object');
    expect(SLEEP_LINES).not.toContain(r);
  });
});
