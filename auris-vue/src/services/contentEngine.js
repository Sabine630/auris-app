import { dbGet, dbPut, dbIdx, getSetting } from './db.js';
import { sendLLMRequest } from './api.js';
import { timeAnchorLine } from './chatEngine.js';
import { localDateKey } from './date.js';
import { applyNameMacros } from './format.js';

function buildRecentChat(msgs, charName, userLabel, count, maxLen) {
  return msgs.slice(0, count).reverse().map(m =>
    `${m.role === 'user' ? userLabel : charName}：${m.content.substring(0, maxLen)}`
  ).join('\n');
}

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

// 共用：依角色組貼文 prompt → 生成 → 解析出 { content, tags }（供 generatePost 新建與 regeneratePost 就地重生共用）
async function buildPostContent(c) {
  const styleMap = {
    casual: '輕鬆日常', sweet: '甜蜜撒嬌', cool: '冷靜高冷',
    gentle: '溫柔體貼', playful: '活潑俏皮', mature: '成熟穩重', literary: '文藝感性'
  };

  const storyCtx = c.stories?.filter(s => s.content).map(s => `【${s.title}】${s.content}`).join('\n') || '';

  const me = await getSetting('me_settings') || {};
  const youName = (c.overrideMe && c.you_name) ? c.you_name : (me.name || '');
  const youLine = youName
    ? `【對方資訊】對方本名是「${youName}」${c.call ? `，你習慣稱呼對方為「${c.call}」` : ''}。若貼文提到對方，請用此稱呼。\n`
    : '';
  const msgs = await dbIdx('messages', 'charId', c.id);
  msgs.sort((a, b) => b.createdAt - a.createdAt);
  const recentChat = buildRecentChat(msgs, c.name, youName || '對方', 6, 50);

  // 時間感知開啟時才注入時間錨；關閉（架空/古裝等）則不給現在時間
  const timeLine = c.timeAware
    ? `【現在時間】現在是 ${timeAnchorLine()}。貼文若提到日期、星期、時段或時間，必須對齊現在，不要寫錯。\n`
    : '';

  const prompt = `你是「${c.name}」。請根據以下設定，寫一則短篇社群貼文（類似 IG 或 Twitter），分享你此刻的想法或生活片段。
【個性】${c.persona || ''}
${storyCtx ? `【背景】${storyCtx}` : ''}
${c.status ? `【近況】${c.status}` : ''}
${c.hobby ? `【喜好】${c.hobby}` : ''}
【說話風格】${styleMap[c.style] || '輕鬆自然'}
${timeLine}${youLine}${recentChat ? `【最近與對方的對話】\n${recentChat}\n貼文可以若有似無地反映這段互動，或完全無關也行。` : ''}

【格式要求】
1. 直接輸出貼文內容，不要加引號，長度約 60~200 字，要有具體的事件、感受或想法，不要只寫一句話。
2. 可以在最後加上幾個相關 hashtag（在同一行或新行）。
3. 如果角色個性適合，可以使用少量 emoji。`;

  const text = await sendLLMRequest(
    [{ role: 'system', content: applyNameMacros(prompt, youName || '你', c.name) }, { role: 'user', content: '請開始生成。' }],
    { max_tokens: 2500, temperature: 0.75, frequency_penalty: 0.6, presence_penalty: 0.3 }
  );

  if (!text.trim()) return null;
  let content = applyNameMacros(text.trim(), youName || '你', c.name);
  let tags = [];
  const tagMatch = content.match(/(?:^|\n)\s*#\w+/g);
  if (tagMatch) {
    tags = tagMatch.map(t => t.trim().substring(1));
    content = content.replace(/(?:\n\s*#\w+\s*)+$/, '').trim();
  }
  content = dedupeRepeats(content);
  return { content, tags };
}

export async function generatePost(charId) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');

  const c = await dbGet('characters', charId);
  if (!c) throw new Error('找不到角色');

  const result = await buildPostContent(c);
  if (!result) return null;

  const entry = { id: 'post_' + Date.now(), charId, content: result.content, tags: result.tags, likes: 0, likedByMe: false, comments: [], createdAt: Date.now() };
  await dbPut('moments', entry);
  await dbPut('notifications', { id: 'notif_' + Date.now(), charId, type: 'post', targetId: entry.id, text: '發了一則新貼文', read: false, createdAt: Date.now() });
  return { entry, truncated: false };
}

// 就地重生一則既有貼文：保留 id 與點讚數，重寫內容/標籤並清空舊留言（內容已換，舊回覆失去脈絡）
export async function regeneratePost(postId) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');

  const p = await dbGet('moments', postId);
  if (!p) throw new Error('找不到貼文');
  const c = await dbGet('characters', p.charId);
  if (!c) throw new Error('找不到角色');

  const result = await buildPostContent(c);
  if (!result) return null;

  p.content = result.content;
  p.tags = result.tags;
  p.comments = [];
  await dbPut('moments', p);
  return { entry: p };
}

// 共用：組貼文回覆 prompt → 生成 → 回傳回覆文字。
// threadComments：要當脈絡的留言串（一般回覆＝整串；重生＝待重生回覆之前的片段）。
// 內含「留言者＝貼文所稱呼的對象本人」身份綁定，避免角色把留言的使用者當第三方（用「她／他」指稱）。
async function buildReplyText(p, c, threadComments) {
  const me = await getSetting('me_settings') || {};
  const youName = (c.overrideMe && c.you_name) ? c.you_name : (me.name || '對方');
  const callNick = c.call || '';

  // 角色完整設定：與發貼文一致地帶入背景/近況/喜好，避免回留言時說出與設定矛盾的話（如怕黑卻說關燈睡）
  const storyCtx = c.stories?.filter(s => s.content).map(s => `【${s.title}】${s.content}`).join('\n') || '';
  const settingCtx = [
    `個性：${c.persona || ''}`,
    storyCtx ? `背景：\n${storyCtx}` : '',
    c.status ? `近況：${c.status}` : '',
    c.hobby ? `喜好：${c.hobby}` : ''
  ].filter(Boolean).join('\n');

  const body = (p.content || '').slice(0, 1000);
  const ctxComments = (threadComments || []).slice(-10);
  const thread = ctxComments
    .map(cm => `${cm.role === 'user' ? youName : c.name}：${cm.content}`)
    .join('\n');
  const lastUserComment = [...ctxComments].reverse().find(cm => cm.role === 'user')?.content || '';

  // 身份綁定：明確告訴 AI「留言串裡標示為對方的人，就是貼文裡被稱呼/提到的那個人本人」
  const identityBind = `【重要】這則貼文是你對對方（${youName}${callNick ? `，你平常叫他「${callNick}」` : ''}）說的話。留言串中標示為「${youName}」的留言就是這位對方本人——也就是你貼文裡稱呼/提到的那個人，不是第三者。回覆時直接把對方當成你貼文裡的那個人對話，不要用第三人稱「她／他」把對方講成別人。`;

  const prompt = `你是「${c.name}」。
${settingCtx}
你發了一則貼文，內容如下：
「${body}」
${identityBind}
${thread ? `\n這則貼文下面的留言串（由舊到新，最後一則是你要回覆的對象）：\n${thread}\n` : `\n${youName}留言說：「${lastUserComment}」\n`}
請以貼文作者的身分回覆最後一則留言。務必貼合你的角色設定、貼文與前面留言的實際內容，不要說出與角色設定或貼文矛盾的話（例如怕黑就不會說自己關燈睡）。20~60字，自然簡短，像社群留言回覆的語氣。直接輸出回覆內容，不加引號。不要只回一個字或一個 emoji。`;

  const text = await sendLLMRequest(
    [{ role: 'user', content: applyNameMacros(prompt, youName, c.name) }],
    { max_tokens: 400, temperature: 0.85 }
  );
  return (text && text.trim()) ? applyNameMacros(text.trim(), youName, c.name) : '';
}

export async function generateCommentReply(postId, charId, userComment) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) { window.toast_?.('請先設定 API 金鑰'); return; }

  const c = await dbGet('characters', charId);
  const p = await dbGet('moments', postId);
  if (!c || !p) { console.warn('generateCommentReply: char or post not found', charId, postId); return; }

  try {
    // p.comments 此時已含剛送出的使用者留言（PostDetailView 先推入再呼叫），故整串即脈絡
    const text = await buildReplyText(p, c, p.comments || []);
    if (text) {
      const reply = { role: 'assistant', content: text, createdAt: Date.now() };
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

// 重生某一則角色回覆：以「該回覆之前的留言串」為脈絡重新生成，原地取代，保留其後留言。
export async function regenerateCommentReply(postId, replyIdx) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) { window.toast_?.('請先設定 API 金鑰'); return; }

  const p = await dbGet('moments', postId);
  if (!p || !p.comments?.[replyIdx] || p.comments[replyIdx].role !== 'assistant') {
    console.warn('regenerateCommentReply: invalid target', postId, replyIdx); return;
  }
  const c = await dbGet('characters', p.charId);
  if (!c) { console.warn('regenerateCommentReply: char not found', p.charId); return; }

  try {
    const threadBefore = p.comments.slice(0, replyIdx);
    const text = await buildReplyText(p, c, threadBefore);
    if (text) {
      p.comments[replyIdx] = { role: 'assistant', content: text, createdAt: Date.now() };
      await dbPut('moments', p);
    } else {
      window.toast_?.('角色暫時沒有回應');
    }
  } catch (e) {
    console.error('regenerateCommentReply failed:', e);
    window.toast_?.('重新生成失敗：' + e.message);
  }
}

export async function generateDiary(charId) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');

  const c = await dbGet('characters', charId);
  if (!c) throw new Error('找不到角色');

  const me = await getSetting('me_settings') || {};
  const youName = (c.overrideMe && c.you_name) ? c.you_name : (me.name || '');
  const youLine = youName
    ? `對方本名是「${youName}」${c.call ? `，你習慣稱呼對方為「${c.call}」` : ''}。若日記提到對方，請用此稱呼。\n`
    : '';

  const msgs = await dbIdx('messages', 'charId', charId);
  msgs.sort((a, b) => b.createdAt - a.createdAt);
  const recentChat = buildRecentChat(msgs, c.name, youName || '你', 8, 60);

  const n = new Date();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const today = localDateKey(n);

  const sysPrompt = `你是「${c.name}」。個性：${c.persona || ''}。
今天是 ${n.getFullYear()}年${n.getMonth() + 1}月${n.getDate()}日，星期${weekdays[n.getDay()]}。
${youLine}${recentChat ? `今天和對方的對話內容：\n${recentChat}\n` : ''}
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
    [{ role: 'system', content: applyNameMacros(sysPrompt, youName || '你', c.name) }, { role: 'user', content: '請開始寫日記。' }],
    { max_tokens: 2500, temperature: 0.78, frequency_penalty: 0.5, presence_penalty: 0.2 }
  );

  if (text.trim()) {
    const cleaned = dedupeRepeats(applyNameMacros(text.trim(), youName || '你', c.name));
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

  const me = await getSetting('me_settings') || {};
  const youName = (c.overrideMe && c.you_name) ? c.you_name : (me.name || '');
  const youLine = youName
    ? `對方本名是「${youName}」${c.call ? `，你習慣稱呼對方為「${c.call}」` : ''}。若夢境提到對方，請用此稱呼。\n`
    : '';
  const msgs = await dbIdx('messages', 'charId', charId);
  msgs.sort((a, b) => b.createdAt - a.createdAt);
  const recentChat = buildRecentChat(msgs, c.name, youName || '對方', 8, 50);

  const prompt = `你是「${c.name}」，個性：${c.persona || ''}。
${youLine}${recentChat ? `最近和對方的對話：\n${recentChat}\n夢境可以若有似無地折射這段互動，也可以完全無關。` : ''}

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
    [{ role: 'system', content: applyNameMacros(prompt, youName || '你', c.name) }, { role: 'user', content: '請開始描述夢境。' }],
    { max_tokens: 2500, temperature: 0.88, frequency_penalty: 0.5, presence_penalty: 0.2 }
  );

  if (text.trim()) {
    const cleaned = dedupeRepeats(applyNameMacros(text.trim(), youName || '你', c.name));
    const entry = { id: 'dream_' + Date.now(), charId, content: cleaned, createdAt: Date.now() };
    await dbPut('dreams', entry);
    await dbPut('notifications', { id: 'notif_' + Date.now(), charId, type: 'dream', targetId: entry.id, text: '告訴你他昨晚的夢境', read: false, createdAt: Date.now() });
    return { entry, truncated: false };
  }
  return null;
}
