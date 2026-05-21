import { dbGet, dbPut, dbIdx, dbDel, getSetting } from './db.js';
import { fetchWithTimeout } from './api.js';

function getDefModel(provider) {
  if (provider === 'anthropic') return 'claude-3-5-sonnet-20240620';
  if (provider === 'google') return 'gemini-1.5-flash';
  return 'gpt-4o-mini';
}

function getDefBase(provider) {
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';
  if (provider === 'google') return 'https://generativelanguage.googleapis.com/v1beta/openai';
  return 'https://api.openai.com/v1';
}

export async function sendUserMessage(charId, content) {
  const userMsg = {
    id: 'msg_' + Date.now(),
    charId,
    role: 'user',
    content,
    createdAt: Date.now()
  };
  await dbPut('messages', userMsg);
  return userMsg;
}

export async function generateAIResponse(charId, allMsgs) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');

  const c = await dbGet('characters', charId);
  const me = await getSetting('me_settings') || {};
  const provider = await getSetting('api_provider') || 'openai';
  const model = await getSetting('api_model') || getDefModel(provider);
  const base = await getSetting('api_base') || getDefBase(provider);

  const styleMap = {
    casual: '說話輕鬆自然，像朋友聊天',
    sweet: '說話甜蜜可愛，偶爾撒嬌',
    cool: '說話冷靜簡短，高冷，話不多',
    gentle: '說話溫柔體貼，善解人意',
    playful: '說話活潑俏皮，喜歡開玩笑',
    mature: '說話成熟穩重，有深度',
    literary: '說話文藝感性，有時引用詩句或比喻'
  };
  const talkMap = {
    quiet: '傾向說短句，不多話，需要時才開口',
    mid: '說話量適中',
    lots: '話很多，喜歡聊天，容易連發好幾條訊息'
  };

  const youName = c.overrideMe && c.you_name ? c.you_name : me.name || '你';
  const youRole = c.overrideMe && c.you_role ? c.you_role : me.job || '';
  const youPersona = c.overrideMe && c.you_persona ? c.you_persona : me.persona || '';

  let timeCtx = '';
  if (c.timeAware) {
    const n = new Date();
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    timeCtx = `\n現在時間：${n.getHours()}:${n.getMinutes().toString().padStart(2, '0')}，星期${days[n.getDay()]}。`;
  }

  const storyCtx = c.stories?.filter(s => s.content).map(s => `【${s.title}】${s.content}`).join('\n') || '';

  let lang = '繁體中文';
  if (c.lang === 'zh-cn') lang = '簡體中文';
  if (c.lang === 'ja') lang = '日文';
  if (c.lang === 'ko') lang = '韓文';
  if (c.lang === 'en') lang = '英文';

  const systemPrompt = `你是「${c.name}」，請完全扮演這個角色與使用者對話。用${lang}回覆。
${c.age ? `年齡：${c.age}歲。` : ''}${c.job ? `職業：${c.job}。` : ''}${c.location ? `居住：${c.location}。` : ''}
【個性】${c.persona || ''}
${storyCtx ? `【背景故事】\n${storyCtx}` : ''}
${c.status ? `【近況】${c.status}` : ''}
${c.hobby ? `【喜好】${c.hobby}` : ''}
【說話風格】${styleMap[c.style] || '輕鬆自然'}
【話量】${talkMap[c.talkative] || '適中'}
${c.call ? `稱呼對方為「${c.call}」。` : ''}
${c.phrase ? `口頭禪：${c.phrase}。` : ''}
${c.conflict ? `面對衝突時：${{ direct: '直接表達不滿', cold: '傾向冷戰迴避', cute: '用撒嬌化解', rational: '保持理性溝通' }[c.conflict]}。` : ''}
${c.relation ? `與對方的關係：${{ lover: '戀人', childhood: '青梅竹馬', friend: '好友', online: '網友', colleague: '同事', stranger: '陌生人' }[c.relation] || c.relation}。` : ''}
${c.rel_bg ? `關係背景：${c.rel_bg}` : ''}
${c.rel_pos ? `你在角色心中：${c.rel_pos}` : ''}

【對方資訊】對方叫「${youName}」${youRole ? `，身份：${youRole}` : ''}${youPersona ? `，個性：${youPersona}` : ''}。
${c.taboo ? `【禁止話題】${c.taboo}` : ''}
${c.isAI ? '' : `永遠不要承認你是 AI 或程式。`}
${c.extra ? `【補充指令】${c.extra}` : ''}
${timeCtx}
【回覆品質要求】
・每則訊息至少 50～150 字，要有具體內容，不能只是「嗯」「好啊」「哈哈」等空洞回應
・要回應對方說的具體內容，展現你真的在聽、在意
・可以分享自己的感受、想法、記憶、日常細節，讓對話有深度和溫度
・語氣、用詞要完全符合角色個性，不能像客服或 AI
・禁止使用「我理解你的感受」「這很有趣」「確實如此」等通用句
・回覆要有延伸性，可以反問、聊到相關話題、分享自身經歷
【格式規則】一次回${c.minMsg || 1}到${c.maxMsg || 3}則訊息，每則之間用換行分隔。不要加 emoji 除非符合角色個性。絕對不要說「我作為 AI」。`;

  const history = allMsgs.slice(-(c.memory || 20)).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
  let aiText = '';

  if (c.delay > 0) await new Promise(r => setTimeout(r, c.delay * 1000));

  const lastUserMsg = history[history.length - 1]?.content || '';
  const longFormTriggers = /(\d{2,}\s*字|\d{2,}\s*words?|[一二三四五六七八九兩幾]百\s*字|[一二兩三]千\s*字|[一二三四五六七八九十兩]+\s*萬\s*字|(寫|說|講|來|編|想|聽|給我).{0,6}(故事|小說|文章|信|詩|散文|劇本|演講|報告|論文|介紹|長篇|短篇|童話|寓言|傳記|日記|劇情)|睡前故事|床邊故事|長一?點|詳細|完整|具體說明|長篇|大綱)/i;
  const isLongForm = longFormTriggers.test(lastUserMsg);
  const dynamicMaxTokens = isLongForm ? 8000 : 4000;
  const finalSystemPrompt = isLongForm
    ? systemPrompt + `\n\n【特別提示】使用者要求較長內容，請完整寫完整段，不要中途收尾或省略。如果是故事，要有開頭、發展、結尾；如果是文章，要有段落結構。寫到結束為止，不要刻意縮短。`
    : systemPrompt;

  let truncated = false;
  if (provider === 'anthropic') {
    const r = await fetchWithTimeout(`${base}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: dynamicMaxTokens, system: finalSystemPrompt, messages: history })
    }, 90000);
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    aiText = d.content?.[0]?.text || '';
    if (d.stop_reason === 'max_tokens') truncated = true;
  } else {
    const r = await fetchWithTimeout(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: dynamicMaxTokens, temperature: c.temperature ?? 0.8, messages: [{ role: 'system', content: finalSystemPrompt }, ...history] })
    }, 90000);
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    aiText = d.choices?.[0]?.message?.content || '';
    const fr = d.choices?.[0]?.finish_reason;
    if (fr === 'length' || fr === 'max_tokens') truncated = true;
  }

  if (!truncated && aiText) {
    const len = aiText.length;
    const lastChar = aiText.trim().slice(-1);
    const endsCleanly = /[。！？！?.…」』）)」"\u2019\u201d]/.test(lastChar);
    if (len >= dynamicMaxTokens * 0.4 && !endsCleanly) truncated = true;
  }

  if (aiText) {
    const aiMsg = { id: 'msg_' + Date.now() + '_ai', charId, role: 'assistant', content: aiText, createdAt: Date.now() };
    await dbPut('messages', aiMsg);
    
    // Background generation for Heart Voice (don't await)
    if (c.heartVoice) {
      generateHeartVoice(c, allMsgs, aiText, provider, model, base, apiKey).catch(() => {});
    }

    return { msg: aiMsg, truncated };
  }
  return { msg: null, truncated: false };
}

// ──────────────────────────────────────────────
// Heart Voice Logic
// ──────────────────────────────────────────────
const HV_INTERVAL = 5;
const HV_EMOTION_WORDS = ['喜歡','愛','討厭','難過','高興','開心','害怕','緊張','生氣','委屈','想念','孤單','幸福','失落','期待','驚訝','感動','羨慕','嫉妒','後悔','抱歉','謝謝','陪','一起','永遠','離開','再見','思念','心跳','臉紅','沉默','默默','其實','說不出','不敢'];

function shouldTriggerHV(allMsgs, aiText) {
  const aiCount = allMsgs.filter(m => m.role === 'assistant').length;
  if (aiCount > 0 && aiCount % HV_INTERVAL === 0) return true;
  const combined = (allMsgs.slice(-3).map(m => m.content).join('') + aiText);
  return HV_EMOTION_WORDS.some(w => combined.includes(w));
}

async function generateHeartVoice(c, allMsgs, lastAiText, provider, model, base, apiKey) {
  if (!shouldTriggerHV(allMsgs, lastAiText)) return;

  const userMsgs = allMsgs.filter(m => m.role === 'user');
  const lastUserMsg = userMsgs[userMsgs.length - 1];
  const lastAiSnippet = (lastAiText || '').slice(0, 150);
  const recentMsgs = [];
  if (lastUserMsg) recentMsgs.push({ role: 'user', content: lastUserMsg.content.slice(0, 150) });
  if (lastAiSnippet) recentMsgs.push({ role: 'assistant', content: lastAiSnippet });

  const hvPrompt = `你是「${c.name}」。

任務：寫一句**極短的內心話**——就是「沒說出口的那一句感受」。

【鐵則】
1. **總字數 30 字以內**，最多兩句話
2. 只寫**「沒說出口的那一句」**，不要敘述、不要說明、不要鋪陳
3. 不要重複任何對話內容、不要延續任何故事
4. 不要說「心想：xxx」這種旁白格式，直接寫內心話本身
5. 不要加引號、不要加 emoji
6. 繁體中文，符合角色個性

範例（這就是長度標準，不要超過）：
「其實有點開心，但才不要說出來。」
「他剛剛那句話，讓我有點在意。」
「假裝沒聽見好了。」
「哼，誰要理你。」

現在請只寫**一句**內心話：`;

  try {
    let hvText = '';
    if (provider === 'anthropic') {
      const r = await fetchWithTimeout(`${base}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 80, system: hvPrompt, messages: recentMsgs })
      });
      const d = await r.json();
      hvText = d.content?.[0]?.text || '';
    } else {
      const r = await fetchWithTimeout(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, max_tokens: 80, temperature: 0.9, messages: [{ role: "system", content: hvPrompt }, ...recentMsgs] })
      });
      const d = await r.json();
      hvText = d.choices?.[0]?.message?.content || '';
    }
    
    hvText = hvText.trim().replace(/\n{2,}/g, ' ').replace(/\s+/g, ' ');
    if (hvText.length > 50) {
      const window = hvText.slice(0, 50);
      const sentenceEnd = Math.max(
        window.lastIndexOf('。'), window.lastIndexOf('！'), window.lastIndexOf('？'),
        window.lastIndexOf('.'), window.lastIndexOf('!'), window.lastIndexOf('?')
      );
      if (sentenceEnd >= 15) {
        hvText = hvText.slice(0, sentenceEnd + 1);
      } else {
        const commaEnd = Math.max(window.lastIndexOf('，'), window.lastIndexOf(','));
        hvText = commaEnd >= 15 ? hvText.slice(0, commaEnd + 1) + '…' : hvText.slice(0, 50) + '…';
      }
    }

    if (hvText.trim()) {
      const entry = {
        id: 'hv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        charId: c.id,
        content: hvText.trim(),
        createdAt: Date.now()
      };
      await dbPut('memories', entry);
      
      // Dispatch custom event to notify ChatRoomView if it's active
      window.dispatchEvent(new CustomEvent('new-heart-voice', { detail: entry }));
    }
  } catch (e) {
    console.error('HeartVoice error', e);
  }
}


// ──────────────────────────────────────────────
// Group Chat Logic
// ──────────────────────────────────────────────
export async function sendGroupMessage(groupId, charId, content) {
  const msg = {
    id: 'gmsg_' + Date.now(),
    groupId,
    charId,
    content,
    createdAt: Date.now()
  };
  await dbPut('group_messages', msg);
  return msg;
}

export async function generateGroupAIResponse(groupId, charIdToRespond, allMsgs, members) {
  const c = await dbGet('characters', charIdToRespond);
  if (!c) return null;

  const me = await dbGet('settings', 'my_profile') || {};
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');
  const provider = await getSetting('api_provider') || 'openai';
  const model = await getSetting('api_model') || 'gpt-5.4-mini';
  let base = await getSetting('api_base');
  // Need getDefBase from api.js if imported, but we can't easily. Wait, getDefBase is defined in chatEngine.js? No, let's just hardcode if missing.
  if (!base) {
    if (provider === 'anthropic') base = 'https://api.anthropic.com/v1';
    else if (provider === 'google') base = 'https://generativelanguage.googleapis.com/v1beta/openai';
    else base = 'https://api.openai.com/v1';
  }
  base = base.replace(/\/$/, '');

  const validChars = members.filter(x => x.id);
  const otherChars = validChars.filter(oc => oc.id !== c.id).map(oc => oc.name).join('、');
  
  const lastMsg = allMsgs[allMsgs.length - 1];
  const isMentioned = lastMsg && lastMsg.charId === 'user' && (lastMsg.content.includes('@' + c.name) || lastMsg.content.includes(c.name));
  
  const mentionHint = isMentioned
    ? '\n⚠️ 注意：使用者' + (me.name||'') + '在訊息裡直接點名了你（' + c.name + '），這是針對你的問題或話題，請務必正面回應，不要躲在其他人後面。'
    : '';
    
  const styleMap = { casual: '輕鬆自然', sweet: '甜蜜可愛', cool: '冷靜簡短', gentle: '溫柔體貼', playful: '活潑俏皮', mature: '成熟穩重', literary: '文藝感性' };
  
  const systemPrompt = '這是一個群組聊天，參與者有：你（' + c.name + '）、' + otherChars + '，以及' + (me.name||'使用者') + '。\n' +
    '你是「' + c.name + '」，個性：' + (c.persona||'') + '，說話風格：' + (styleMap[c.style]||'輕鬆自然') + '。\n' +
    (c.isAI ? '' : '永遠不要承認你是 AI。') + mentionHint + '\n\n' +
    '📝 回覆規則（嚴格遵守）：\n' +
    '1. 用' + c.name + '的口吻回覆，30-80字，自然簡短像群聊訊息。\n' +
    '2. 【絕對禁止】在回覆開頭加上任何「' + c.name + '：」「我：」之類的名字前綴，直接從第一句內容開始。\n' +
    '3. 【絕對禁止】幫使用者' + (me.name||'') + '說話、或自己創造一段「使用者：xxx」的對話。你只能扮演' + c.name + '一個人。\n' +
    '4. 【絕對禁止】輸出多個角色的對話片段。即使要回應其他角色說過的話，也只用' + c.name + '的口吻單獨講一段。\n' +
    '5. 若使用者直接問你，要先正面回答自己的想法。直接輸出訊息內容本身。';

  const rawHistory = allMsgs.slice(-12).map(m => {
    if (m.charId === 'user') return { role: 'user', content: m.content };
    if (m.charId === c.id) return { role: 'assistant', content: m.content };
    
    const mc = members.find(x => x.id === m.charId);
    const speakerName = mc ? mc.name : '';
    return { role: 'user', content: '（' + speakerName + '剛剛說：' + m.content + '）' };
  });

  const history = [];
  for (const m of rawHistory) {
    if (history.length > 0 && history[history.length - 1].role === m.role) {
      history[history.length - 1].content += '\n\n' + m.content;
    } else {
      history.push(m);
    }
  }

  while (history.length > 0 && history[0].role === 'assistant') {
    history.shift();
  }

  let aiText = '';
  let rawResponse = null;

  try {
    if (provider === 'anthropic') {
      const r = await fetchWithTimeout(base + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 800, system: systemPrompt, messages: history.length ? history : [{ role: 'user', content: lastMsg ? lastMsg.content : '哈囉' }] })
      }, 30000);
      const d = await r.json();
      rawResponse = d;
      if (d.error) throw new Error(d.error.message);
      aiText = d.content?.[0]?.text || '';
    } else {
      const payload = { model, max_tokens: 800, temperature: c.temperature ?? 0.8, messages: [{ role: 'system', content: systemPrompt }, ...(history.length ? history : [{ role: 'user', content: lastMsg ? lastMsg.content : '哈囉' }])] };
      const r = await fetchWithTimeout(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify(payload)
      }, 30000);
      const d = await r.json();
      rawResponse = d;
      if (d.error) throw new Error(d.error.message);
      aiText = d.choices?.[0]?.message?.content || '';
    }
  } catch (err) {
    const debugMsg = { id: 'debug_' + Date.now(), groupId, charId: 'user', content: '【系統偵錯】API 呼叫失敗：' + err.message, createdAt: Date.now() };
    await dbPut('group_messages', debugMsg);
    return debugMsg;
  }

  const rawAiText = aiText;

  const escapedName = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const namePrefix = new RegExp('^' + escapedName + '[：:]\\s*');
  aiText = aiText.replace(namePrefix, '');
  
  const otherNamesRegex = validChars.filter(oc => oc.id !== c.id).map(oc => oc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (otherNamesRegex) {
    const dialogSwitchRegex = new RegExp('\\n(?:' + otherNamesRegex + ')[：:]', 'i');
    const match = aiText.match(dialogSwitchRegex);
    if (match) {
      aiText = aiText.substring(0, match.index);
    }
  }

  if (!aiText.trim()) {
    const debugMsg = {
      id: 'debug_' + Date.now(),
      groupId,
      charId: 'user',
      content: '【系統偵錯】AI 回傳了空字串，或被清洗歸零。\n原始回傳長度：' + rawAiText.length + '\n原始內容：' + rawAiText + '\nAPI Raw JSON：' + JSON.stringify(rawResponse),
      createdAt: Date.now()
    };
    await dbPut('group_messages', debugMsg);
    return debugMsg;
  }

  if (aiText.trim()) {
    const msg = {
      id: 'gmsg_' + Date.now() + '_ai',
      groupId,
      charId: c.id,
      content: aiText.trim(),
      createdAt: Date.now()
    };
    await dbPut('group_messages', msg);
    return msg;
  }
  return null;
}
