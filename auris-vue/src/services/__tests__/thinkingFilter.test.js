import { describe, expect, it, vi } from 'vitest';
import { createThinkingStreamFilter, stripThinking } from '../thinkingFilter.js';

describe('stripThinking', () => {
  it('剝掉實機回報的 <thinking> 區塊，保留角色台詞', () => {
    const input = [
      '轉回頭「……回來再說。」',
      '',
      '<thinking>',
      "Good - possessive, teasing, but clearly going to comply.",
      '</thinking>',
    ].join('\n');
    expect(stripThinking(input)).toBe('轉回頭「……回來再說。」');
  });

  it.each(['thinking', 'think', 'reasoning', 'antThinking'])('認得 <%s>', (tag) => {
    expect(stripThinking(`前面<${tag}>internal</${tag}>後面`)).toBe('前面後面');
  });

  it('思考在開頭時也剝得掉', () => {
    expect(stripThinking('<thinking>plan</thinking>\n「早安。」')).toBe('「早安。」');
  });

  it('多個區塊全部剝掉', () => {
    expect(stripThinking('<thinking>a</thinking>甲<thinking>b</thinking>乙')).toBe('甲乙');
  });

  it('被 max_tokens 切斷的未閉合思考，整段尾巴一併去掉', () => {
    expect(stripThinking('「好。」\n<thinking>She is clearly')).toBe('「好。」');
  });

  it('沒有思考標籤時原樣回傳', () => {
    expect(stripThinking('今天天氣不錯。')).toBe('今天天氣不錯。');
    expect(stripThinking('數學式 a<b 與 c>d')).toBe('數學式 a<b 與 c>d');
  });

  it('整段都是思考時保留原文，不製造假的空白回應', () => {
    const onlyThinking = '<thinking>nothing to say</thinking>';
    expect(stripThinking(onlyThinking)).toBe(onlyThinking);
  });

  it('非字串安全通過', () => {
    expect(stripThinking(undefined)).toBe(undefined);
    expect(stripThinking(null)).toBe(null);
  });
});

describe('createThinkingStreamFilter', () => {
  const run = (chunks) => {
    const seen = [];
    const filter = createThinkingStreamFilter(c => seen.push(c));
    for (const chunk of chunks) filter.push(chunk);
    filter.flush();
    return seen.join('');
  };

  it('串流中的思考區塊不會閃到畫面上', () => {
    expect(run(['「回來', '再說。」', '<thinking>', 'internal', '</thinking>'])).toBe('「回來再說。」');
  });

  it('標籤被切在 chunk 邊界也能攔住', () => {
    expect(run(['「好。」<thi', 'nking>secret</thin', 'king>之後'])).toBe('「好。」之後');
  });

  it('未閉合的思考不會在 flush 時洩漏', () => {
    expect(run(['「嗯。」', '<thinking>half of a thou'])).toBe('「嗯。」');
  });

  it('一般文字逐塊照常放行', () => {
    expect(run(['今天', '天氣', '不錯'])).toBe('今天天氣不錯');
  });

  it('沒有 onChunk 時不炸', () => {
    const filter = createThinkingStreamFilter(undefined);
    expect(() => { filter.push('x'); filter.flush(); }).not.toThrow();
  });
});

describe('callLLM 出口整合', () => {
  it('串流路徑不會把思考吐給畫面（demo 以 3 字為一塊，正好跨標籤邊界）', async () => {
    vi.resetModules();
    vi.doMock('../demoMode.js', () => ({ isDemo: () => true }));
    vi.doMock('../demoData.js', () => ({
      demoReply: () => '「去洗。」<thinking>Short and cold.</thinking>好好休息。',
    }));
    const { callLLM } = await import('../llm.js');
    const seen = [];
    const { fullText } = await callLLM({
      provider: 'openai', messages: [], stream: true, onChunk: c => seen.push(c),
    });
    expect(seen.join('')).toBe('「去洗。」好好休息。');
    expect(fullText).toBe('「去洗。」好好休息。');
    vi.doUnmock('../demoMode.js');
    vi.doUnmock('../demoData.js');
    vi.resetModules();
  });

  it('非串流結果的 fullText 已剝除思考', async () => {
    vi.resetModules();
    vi.doMock('../demoMode.js', () => ({ isDemo: () => true }));
    vi.doMock('../demoData.js', () => ({
      demoReply: () => '「去洗。」\n<thinking>Short and cold.</thinking>',
    }));
    const { callLLM } = await import('../llm.js');
    const { fullText } = await callLLM({ provider: 'openai', messages: [] });
    expect(fullText).toBe('「去洗。」');
    vi.doUnmock('../demoMode.js');
    vi.doUnmock('../demoData.js');
    vi.resetModules();
  });
});
