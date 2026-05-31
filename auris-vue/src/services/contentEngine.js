import { dbGet, dbPut, getSetting } from './db.js';
import { sendLLMRequest } from './api.js';

function dedupeRepeats(text) {
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]?/g);
  if (!sentences) return text;
  const res = [];
  for (let s of sentences) {
    if (res.length > 0 && res[res.length - 1].trim() === s.trim()) continue;
    res.push(s);
  }
  return res.join('');
}

export async function generatePost(charId) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');

  const c = await dbGet('characters', charId);
  if (!c) throw new Error('找不到角色');

  const styleMap = {
    casual: '輕鬆日常', sweet: '甜蜜撒嬌', cool: '冷靜高冷',
    gentle: '溫柔體貼', playful: '活潑俏皮', mature: '成熟穩重', literary: '文藝感性'
  };

  const storyCtx = c.stories?.filter(s => s.content).map(s => `【${s.title}】${s.content}`).join('\n') || '';

  const me = await getSetting('me_settings') || {};
  const msgs = await dbIdx('messages', 'charId', charId);
  msgs.sort((a, b) => b.createdAt - a.createdAt);
  const recentChat = msgs.slice(0, 6).reverse().map(m =>
    `${m.role === 'user' ? (me.name || '對方') : c.name}：${m.content.substring(0, 50)}`
  ).join('\n');

  const prompt = `你是「${c.name}」。請根據以下設定，寫一則短篇社群貼文（類似 IG 或 Twitter），分享你此刻的想法或生活片段。
【個性】${c.persona || ''}
${storyCtx ? `【背景】${storyCtx}` : ''}
${c.status ? `【近況】${c.status}` : ''}
${c.hobby ? `【喜好】${c.hobby}` : ''}
【說話風格】${styleMap[c.style] || '輕鬆自然'}
${recentChat ? `【最近與對方的對話】\n${recentChat}\n貼文可以若有似無地反映這段互動，或完全無關也行。` : ''}

【格式要求】
1. 直接輸出貼文內容，不要加引號，長度約 60~200 字，要有具體的事件、感受或想法，不要只寫一句話。
2. 可以在最後加上幾個相關 hashtag（在同一行或新行）。
3. 如果角色個性適合，可以使用少量 emoji。`;

  const text = await sendLLMRequest(
    [{ role: 'system', content: prompt }, { role: 'user', content: '請開始生成。' }],
    { max_tokens: 2500, temperature: 0.75, frequency_penalty: 0.6, presence_penalty: 0.3 }
  );

  if (text.trim()) {
    let content = text.trim();
    let tags = [];
    const tagMatch = content.match(/(?:^|\n)\s*#\w+/g);
    if (tagMatch) {
      tags = tagMatch.map(t => t.trim().substring(1));
      content = content.replace(/(?:\n\s*#\w+\s*)+$/, '').trim();
    }
    content = dedupeRepeats(content);
    const entry = { id: 'post_' + Date.now(), charId, content, tags, likes: 0, likedByMe: false, comments: [], createdAt: Date.now() };
    await dbPut('moments', entry);
    await dbPut('notifications', { id: 'notif_' + Date.now(), charId, type: 'post', targetId: entry.id, text: '發了一則新貼文', read: false, createdAt: Date.now() });
    return { entry, truncated: false };
  }
  return null;
}

export async function generateCommentReply(postId, charId, userComment) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) { window.toast_?.('請先設定 API 金鑰'); return; }

  const c = await dbGet('characters', charId);
  const p = await dbGet('moments', postId);
  if (!c || !p) { console.warn('generateCommentReply: char or post not found', charId, postId); return; }

  const me = await getSetting('me_settings') || {};

  const prompt = `你是「${c.name}」，個性：${c.persona || ''}。你剛發了一則貼文：「${(p.content || '').substring(0, 120)}」。\n${me.name || '對方'}留言說：「${userComment}」\n請用角色口吻回覆留言，20~60字，自然簡短，像社群留言回覆的語氣。直接輸出回覆內容，不加引號。不要只回一個字或一個 emoji。`;

  try {
    const text = await sendLLMRequest(
      [{ role: 'user', content: prompt }],
      { max_tokens: 400, temperature: 0.85 }
    );

    if (text && text.trim()) {
      const reply = { role: 'assistant', content: text.trim(), createdAt: Date.now() };
      if (!p.comments) p.comments = [];
      p.comments.push(reply);
      await dbPut('moments', p);
    } else {
      window.toast_?.('角色暫時沒有回應');
    }
  } catch (e) {
    console.error('generateCommentReply failed:', e);
    window.toast_?.('留言回覆失敗：' + e.message);
  }
}

export async function generateDiary(charId) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');

  const c = await dbGet('characters', charId);
  if (!c) throw new Error('找不到角色');

  const me = await getSetting('me_settings') || {};

  const { dbIdx } = await import('./db.js');
  const msgs = await dbIdx('messages', 'charId', charId);
  msgs.sort((a, b) => b.createdAt - a.createdAt);
  const recentChat = msgs.slice(0, 8).reverse().map(m =>
    `${m.role === 'user' ? (me.name || '你') : c.name}：${m.content.substring(0, 60)}`
  ).join('\n');

  const n = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;

  const sysPrompt = `你是「${c.name}」。個性：${c.persona || ''}。
今天是 ${n.getFullYear()}年${n.getMonth() + 1}月${n.getDate()}日，星期${weekdays[n.getDay()]}。
${recentChat ? `今天和對方的對話內容：\n${recentChat}\n` : ''}
請以角色的第一人稱，用繁體中文寫今天的日記。

【日記品質要求】
・要有具體的事件、細節或感受，不能只寫抽象心情
・文字要有角色自己的聲音和語氣，不能像模板或作文
・可以有矛盾、糾結、沒說出口的話，讓日記有真實的層次
・禁止使用「今天過得很充實」「學到了很多」「期待明天」等空洞結語
・正文 300-500 字，情感要流動，不要分條列點，要有足夠的篇幅展開敘述

格式：
第一行：日記標題（一句有畫面感的話，不要用問號，不要加引號）
（空行）
日記正文
（空行）
最後一行：單一心情 emoji`;

  const text = await sendLLMRequest(
    [{ role: 'system', content: sysPrompt }, { role: 'user', content: '請開始寫日記。' }],
    { max_tokens: 2500, temperature: 0.78, frequency_penalty: 0.5, presence_penalty: 0.2 }
  );

  if (text.trim()) {
    const cleaned = dedupeRepeats(text.trim());
    const lines = cleaned.split('\n');
    let mood = '📔';
    const lastLine = lines[lines.length - 1].trim();
    if ([...lastLine].length <= 2 && /\p{Emoji}/u.test(lastLine)) {
      mood = lastLine;
      lines.pop();
    }
    const entry = { id: 'diary_' + Date.now(), charId, date: today, content: lines.join('\n').trim(), mood, createdAt: Date.now() };
    await dbPut('diary', entry);
    await dbPut('notifications', { id: 'notif_' + Date.now(), charId, type: 'diary', targetId: entry.id, text: '寫了今天的日記', read: false, createdAt: Date.now() });
    return { entry, truncated: false };
  }
  return null;
}

export async function generateDream(charId) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');

  const c = await dbGet('characters', charId);
  if (!c) throw new Error('找不到角色');

  const { dbIdx } = await import('./db.js');
  const me = await getSetting('me_settings') || {};
  const msgs = await dbIdx('messages', 'charId', charId);
  msgs.sort((a, b) => b.createdAt - a.createdAt);
  const recentChat = msgs.slice(0, 8).reverse().map(m =>
    `${m.role === 'user' ? (me.name || '對方') : c.name}：${m.content.substring(0, 50)}`
  ).join('\n');

  const prompt = `你是「${c.name}」，個性：${c.persona || ''}。
${recentChat ? `最近和對方的對話：\n${recentChat}\n夢境可以若有似無地折射這段互動，也可以完全無關。` : ''}

請用第一人稱，寫一段完整、飄渺、詩意的夢境敘述。夢境可以與最近的話題有若有似無的關聯，也可以完全陌生的意象。

【夢境品質要求】
・要有具體的畫面、感官細節（顏色、聲音、溫度、氣味），不能只說「我夢見…」然後沒有細節
・夢的邏輯可以跳躍、矛盾、不合理，這才是夢
・語氣是清醒後回想的感覺，有些模糊，有些片段特別清晰
・不要解釋夢的象徵意義，直接描述所見所感所聞
・禁止使用「美麗的夢境」「奇異的感覺」「醒來後若有所思」等陳腔濫調
・200-400字，寫完整，不要截斷，要有足夠的細節讓夢境畫面豐富

直接輸出夢境文字，不要加標題或說明。`;

  const text = await sendLLMRequest(
    [{ role: 'system', content: prompt }, { role: 'user', content: '請開始描述夢境。' }],
    { max_tokens: 2500, temperature: 0.88, frequency_penalty: 0.5, presence_penalty: 0.2 }
  );

  if (text.trim()) {
    const cleaned = dedupeRepeats(text.trim());
    const entry = { id: 'dream_' + Date.now(), charId, content: cleaned, createdAt: Date.now() };
    await dbPut('dreams', entry);
    await dbPut('notifications', { id: 'notif_' + Date.now(), charId, type: 'dream', targetId: entry.id, text: '告訴你他昨晚的夢境', read: false, createdAt: Date.now() });
    return { entry, truncated: false };
  }
  return null;
}
