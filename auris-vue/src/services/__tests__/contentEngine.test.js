import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  settings: {},
  stores: {},
  request: null,
  reply: '她的拳頭比我的掌心還小一圈\n\n今天被打了一拳。那一瞬間我失去了控制，但那不是她的，是我的。\n\n🐹',
}));

vi.mock('../db.js', () => ({
  getSetting: async (key) => state.settings[key] ?? null,
  dbGet: async (store, id) => (state.stores[store] || []).find(row => row.id === id) || null,
  dbIdx: async (store, index, value) => (state.stores[store] || []).filter(row => row[index] === value),
  dbPut: async (store, value) => {
    const rows = state.stores[store] = state.stores[store] || [];
    const index = rows.findIndex(row => row.id === value.id);
    if (index >= 0) rows[index] = value;
    else rows.push(value);
  },
}));

vi.mock('../api.js', () => ({
  sendLLMRequest: async (messages, config) => {
    state.request = { messages, config };
    return state.reply;
  },
}));

vi.mock('../chatEngine.js', () => ({
  timeAnchorLine: () => '7/17（星期五）下午 17:56',
}));

import { diaryLanguageRule, extractPostTags, generateDiary } from '../contentEngine.js';

beforeEach(() => {
  state.settings = {
    api_key: 'test-api-key',
    me_settings: { name: '小晴' },
  };
  state.stores = {
    characters: [{ id: 'c1', name: '何思年', persona: '克制、溫柔', lang: 'zh-tw' }],
    messages: [],
  };
  state.request = null;
});

describe('diaryLanguageRule', () => {
  it('繁體中文禁止無設定依據的中英夾雜，但保留必要例外', () => {
    const rule = diaryLanguageRule('zh-tw');
    expect(rule).toContain('全篇必須使用自然的繁體中文');
    expect(rule).toContain('角色設定明確要求多語混用');
    expect(rule).toContain('專有名詞');
    expect(rule).toContain('不得為了強調、文藝感、旁白感或內心戲自行插入英文');
  });

  it.each([
    ['zh-cn', '全篇必須使用自然的簡體中文'],
    ['ja', '全篇必須使用自然的日文'],
    ['ko', '全篇必須使用自然的韓文'],
    ['en', 'Write the entire diary in natural English'],
  ])('角色輸出語言 %s 有對應日記規則', (lang, expected) => {
    expect(diaryLanguageRule(lang)).toContain(expected);
  });

  it('舊角色缺少語言欄位時安全回退繁體中文', () => {
    expect(diaryLanguageRule()).toContain('繁體中文');
    expect(diaryLanguageRule('unknown')).toContain('繁體中文');
  });
});

describe('generateDiary 語言接線', () => {
  it('把角色語言的強制規則送進 system prompt', async () => {
    await generateDiary('c1');
    const systemPrompt = state.request.messages.find(message => message.role === 'system').content;

    expect(systemPrompt).toContain('【輸出語言】');
    expect(systemPrompt).toContain('全篇必須使用自然的繁體中文');
    expect(systemPrompt).toContain('不得為了強調、文藝感、旁白感或內心戲自行插入英文');
  });

  it('角色選日文時不再被日記寫死為繁體中文', async () => {
    state.stores.characters[0].lang = 'ja';
    await generateDiary('c1');
    const systemPrompt = state.request.messages.find(message => message.role === 'system').content;

    expect(systemPrompt).toContain('全篇必須使用自然的日文');
    expect(systemPrompt).not.toContain('用繁體中文寫今天的日記');
  });

  it('補充角色設定會進入 prompt，明確多語角色仍能走例外', async () => {
    state.stores.characters[0].extra = '習慣自然地中英夾雜。';
    await generateDiary('c1');
    const systemPrompt = state.request.messages.find(message => message.role === 'system').content;

    expect(systemPrompt).toContain('補充角色設定：習慣自然地中英夾雜。');
    expect(systemPrompt).toContain('只有角色設定明確要求多語混用');
  });
});

describe('extractPostTags（P128 ReDoS 修復）', () => {
  // 注意：\w 只含 ASCII——中文 hashtag 從舊版起就不會被抽出或刪除，此為既有行為
  it('抽出 hashtag 並移除結尾 tag 行（含其間空行）', () => {
    expect(extractPostTags('今天的天空很好看。\n#daily \n\n#rain')).toEqual({
      content: '今天的天空很好看。',
      tags: ['daily', 'rain'],
    });
  });

  it('內文中間的 tag 行會被抽 tag 但不刪內容；同一行多 tag 只抽行首那個、行保留（沿用舊行為）', () => {
    expect(extractPostTags('#head\n中間內容\n#tag1 #tag2')).toEqual({
      content: '#head\n中間內容\n#tag1 #tag2',
      tags: ['head', 'tag1'],
    });
  });

  it('沒有 tag／只有中文 hashtag 時內容原樣返回', () => {
    expect(extractPostTags('純內容，沒有標籤。')).toEqual({ content: '純內容，沒有標籤。', tags: [] });
    expect(extractPostTags('內容\n#日常')).toEqual({ content: '內容\n#日常', tags: [] });
  });

  it('惡意構造的長輸入必須在毫秒級完成（舊 regex 在此輸入上會歧義性回溯卡死）', () => {
    const evil = '內文\n' + '#a'.padEnd(3, 'a') + ' \n'.repeat(2) + '#b \n' + ' '.repeat(50000) + '#c' + '!'.repeat(10);
    const start = performance.now();
    extractPostTags(evil);
    expect(performance.now() - start).toBeLessThan(200);
  });
});
