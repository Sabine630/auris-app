import { dbGet, dbPut, dbIdx, dbAll, getSetting } from './db.js';
import { fetchWithTimeout, sendLLMRequest, getVertexToken } from './api.js';
import { getCyclePhase, cycleCareContext } from './cycle.js';

function getDefModel(provider) {
  if (provider === 'anthropic') return 'claude-3-5-sonnet-20240620';
  if (provider === 'google') return 'gemini-1.5-flash';
  return 'gpt-4o-mini';
}

function getDefBase(provider) {
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';
  if (provider === 'google') return 'https://generativelanguage.googleapis.com/v1beta/openai';
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
  return 'https://api.openai.com/v1';
}

const LONG_FORM_RE = /(\d{2,}\s*字|\d{2,}\s*words?|[一二三四五六七八九兩幾]百\s*字|[一二兩三]千\s*字|[一二三四五六七八九十兩]+\s*萬\s*字|(寫|說|講|來|編|想|聽|給我).{0,6}(故事|小說|文章|信|詩|散文|劇本|演講|報告|論文|介紹|長篇|短篇|童話|寓言|傳記|日記|劇情)|睡前故事|床邊故事|長一?點|詳細|完整|具體說明|長篇|大綱)/i;

// 節日/季節感知：回傳當下的季節與節日提示字串，注入 system prompt 讓角色有時節感
function getHolidaySeasonCtx() {
  const n = new Date();
  const m = n.getMonth() + 1;
  const d = n.getDate();
  const y = n.getFullYear();

  // 季節（台灣氣候為準）
  const season = m >= 3 && m <= 5 ? '春天' : m >= 6 && m <= 8 ? '夏天' : m >= 9 && m <= 11 ? '秋天' : '冬天';

  // 固定節日
  const fixed = {
    '1-1': '元旦', '2-14': '西洋情人節', '3-14': '白色情人節',
    '4-1': '愚人節', '5-1': '勞動節', '8-8': '父親節',
    '10-31': '萬聖節', '12-24': '聖誕夜', '12-25': '聖誕節', '12-31': '跨年夜'
  };

  // 農曆節日（依年份硬編碼至 2027）
  const lunar = {
    2025: { '1-28':'農曆除夕','1-29':'農曆新年','2-12':'元宵節','4-4':'清明節','5-31':'端午節','8-29':'七夕情人節','10-6':'中秋節','10-29':'重陽節','12-21':'冬至' },
    2026: { '2-16':'農曆除夕','2-17':'農曆新年','3-3':'元宵節','4-5':'清明節','6-19':'端午節','8-20':'七夕情人節','9-25':'中秋節','11-17':'重陽節','12-22':'冬至' },
    2027: { '2-5':'農曆除夕','2-6':'農曆新年','2-21':'元宵節','4-5':'清明節','6-9':'端午節','8-10':'七夕情人節','9-15':'中秋節','10-8':'重陽節','12-22':'冬至' }
  };

  // 母親節（五月第二個星期日）
  let motherDay = null;
  if (m === 5) {
    let sundays = 0;
    for (let i = 1; i <= 31; i++) {
      if (new Date(y, 4, i).getDay() === 0 && ++sundays === 2) { motherDay = i; break; }
    }
  }
  if (motherDay && d === motherDay) fixed['5-' + motherDay] = '母親節';

  const key = `${m}-${d}`;
  const todayHoliday = fixed[key] || lunar[y]?.[key] || null;

  let ctx = `，${season}`;
  if (todayHoliday) ctx += `，今天是${todayHoliday}`;

  return ctx;
}
const CLEAN_END_RE = /[。！？！?.…」』）)」"’”]/;

// ── Shared SSE stream parser ───────────────────────────────────────────────
async function parseSSEStream(response, provider, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let truncated = false;
  let lastEvent = '';

  try {
    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;

        if (provider === 'anthropic') {
          if (t.startsWith('event:')) { lastEvent = t.slice(6).trim(); continue; }
          if (!t.startsWith('data:')) continue;
          try {
            const obj = JSON.parse(t.slice(5).trim());
            if (lastEvent === 'content_block_delta' && obj.delta?.type === 'text_delta') onChunk(obj.delta.text || '');
            if (lastEvent === 'message_delta' && obj.delta?.stop_reason === 'max_tokens') truncated = true;
          } catch { /* malformed chunk, skip */ }
        } else {
          if (!t.startsWith('data:')) continue;
          const raw = t.slice(5).trim();
          if (raw === '[DONE]') break outer;
          try {
            const obj = JSON.parse(raw);
            const chunk = obj.choices?.[0]?.delta?.content;
            if (chunk) onChunk(chunk);
            const fr = obj.choices?.[0]?.finish_reason;
            if (fr === 'length' || fr === 'max_tokens') truncated = true;
          } catch { /* malformed chunk, skip */ }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { truncated };
}

// ── 1-on-1 Chat Setup ─────────────────────────────────────────────────────
async function buildAIChatSetup(charId, allMsgs) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');

  const c = await dbGet('characters', charId);
  const me = await getSetting('me_settings') || {};
  const provider = await getSetting('api_provider') || 'openai';
  const model = await getSetting('api_model') || getDefModel(provider);
  const base = (await getSetting('api_base') || getDefBase(provider)).replace(/\/$/, '');

  const styleMap = {
    casual: '說話輕鬆自然，像朋友聊天', sweet: '說話甜蜜可愛，偶爾撒嬌',
    cool: '說話冷靜簡短，高冷，話不多', gentle: '說話溫柔體貼，善解人意',
    playful: '說話活潑俏皮，喜歡開玩笑', mature: '說話成熟穩重，有深度',
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

  const allChatMems = await dbIdx('chat_memories', 'charId', charId);
  const enabledMems = allChatMems.filter(m => m.enabled);
  const memCtx = enabledMems.length
    ? `\n【長期記憶】以下是過去對話的重要摘要，請在回覆時參考：\n${enabledMems.map((m, i) => `${i + 1}. ${m.content}`).join('\n')}`
    : '';

  let timeCtx = '';
  if (c.timeAware) {
    const n = new Date();
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    timeCtx = `\n現在時間：${n.getHours()}:${n.getMinutes().toString().padStart(2, '0')}，星期${days[n.getDay()]}${getHolidaySeasonCtx()}。`;

    // 若距上一則訊息超過 3 小時，注入時間流逝提示，讓角色感知到對話中斷了一段時間
    // 最後一則通常是剛送出的使用者訊息（時間差幾乎為 0），取倒數第二則才能正確算出間隔
    const lastMsg = allMsgs.length >= 2 ? allMsgs[allMsgs.length - 2] : (allMsgs.length === 1 && allMsgs[0].role !== 'user' ? allMsgs[0] : null);
    if (lastMsg && lastMsg.createdAt) {
      const gapMs = Date.now() - lastMsg.createdAt;
      const gapHrs = Math.floor(gapMs / 3600000);
      if (gapHrs >= 3) {
        const prev = new Date(lastMsg.createdAt);
        const prevStr = `${prev.getMonth() + 1}/${prev.getDate()} ${prev.getHours()}:${prev.getMinutes().toString().padStart(2, '0')}`;
        const nowStr = `${n.getMonth() + 1}/${n.getDate()} ${n.getHours()}:${n.getMinutes().toString().padStart(2, '0')}`;
        timeCtx += `\n【時間提示】距上次對話已過了約 ${gapHrs} 小時（${prevStr} → ${nowStr}）。請自然地感知這段時間的流逝，不需要特別說明，但語氣和話題要符合現在的時間點。`;
      }
    }
  }

  // 作息設定：把角色的上班時段／地點／作息餵進 prompt，讓角色（與主動訊息）依現在時間有情境感
  const sched = [];
  if (c.workTime) sched.push(`上班時間：${c.workTime}`);
  if (c.workPlace) sched.push(`上班地點：${c.workPlace}`);
  if (c.restTime) sched.push(`作息：${c.restTime}`);
  const scheduleCtx = sched.length
    ? `\n【作息】${sched.join('；')}。請依現在時間推測你此刻的狀態（上班中／通勤／下班放鬆／睡覺等），讓對話與主動訊息符合當下情境，但不要每句都報告自己的行程。`
    : '';

  // 玩家作息：讓角色知道對方現在可能在做什麼，主動訊息更有情境感（例如上班中就用溫柔打擾的方式傳訊）
  const pSched = [];
  if (me.workTime) pSched.push(`上班時間：${me.workTime}`);
  if (me.workPlace) pSched.push(`上班地點：${me.workPlace}`);
  if (me.restTime) pSched.push(`作息：${me.restTime}`);
  const playerScheduleCtx = pSched.length
    ? `\n【對方作息】${pSched.join('；')}。請依現在時間推測對方此刻的狀態（上班中／通勤／休息中／睡覺等），在傳訊或主動關心時考慮對方是否方便，語氣要體貼當下情境。`
    : '';

  // 世界書：掃描近 10 則訊息，命中詞條名稱或別名才注入，節省 token
  const allWorlds = await dbAll('worlds');
  const recentText = allMsgs.slice(-10).map(m => m.content).join(' ');
  const matchedWorlds = allWorlds.filter(w => {
    if (!w.enabled) return false;
    if (w.charScope?.length && !w.charScope.includes(charId)) return false;
    const keywords = [w.name, ...(w.aliases || [])];
    return keywords.some(kw => kw && recentText.includes(kw));
  });
  const worldCtx = matchedWorlds.length
    ? `\n【世界觀設定】以下是相關設定，請在回覆中自然地參考：\n${matchedWorlds.map(w => `▸ ${w.name}：${w.content}`).join('\n')}`
    : '';

  // 生理期被動體貼：僅當此角色開了「生理期關心」且使用者啟用週期追蹤時，
  // 在經期/經期前把對方身體狀態餵進 prompt，讓角色自然地關心（其餘階段為空字串）。
  const cycleCtx = c.cycleCare ? cycleCareContext(getCyclePhase(me)) : '';

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
${c.call ? `平時稱呼對方為「${c.call}」，用此暱稱叫對方，不可擅自改為其他稱謂。` : ''}
${c.phrase ? `口頭禪：${c.phrase}。` : ''}
${c.conflict ? `面對衝突時：${{ direct: '直接表達不滿', cold: '傾向冷戰迴避', cute: '用撒嬌化解', rational: '保持理性溝通' }[c.conflict]}。` : ''}
${c.relation ? `與對方的關係：${{ lover: '戀人', childhood: '青梅竹馬', friend: '好友', online: '網友', colleague: '同事', stranger: '陌生人' }[c.relation] || c.relation}。` : ''}
${c.rel_bg ? `關係背景：${c.rel_bg}` : ''}
${c.rel_pos ? `你在角色心中：${c.rel_pos}` : ''}

【對方資訊】對方本名是「${youName}」${youRole ? `，身份：${youRole}` : ''}${youPersona ? `，個性：${youPersona}` : ''}。無論兩人關係為何，不可幫對方冠夫姓、改姓或更改名字。
${c.taboo ? `【禁止話題】${c.taboo}` : ''}
${c.isAI ? '' : `永遠不要承認你是 AI 或程式。`}
${c.extra ? `【補充指令】${c.extra}` : ''}
${timeCtx}${scheduleCtx}${playerScheduleCtx}${cycleCtx}${worldCtx}${memCtx}
【回覆品質要求】
・每則訊息至少 50～150 字，要有具體內容，不能只是「嗯」「好啊」「哈哈」等空洞回應
・要回應對方說的具體內容，展現你真的在聽、在意
・可以分享自己的感受、想法、記憶、日常細節，讓對話有深度和溫度
・語氣、用詞要完全符合角色個性，不能像客服或 AI
・禁止使用「我理解你的感受」「這很有趣」「確實如此」等通用句
・回覆要有延伸性，可以反問、聊到相關話題、分享自身經歷
【格式規則】一次回${c.minMsg || 1}到${c.maxMsg || 3}則訊息，每則之間用換行分隔。不要加 emoji 除非符合角色個性。絕對不要說「我作為 AI」。`;

  const history = allMsgs.slice(-(c.memory || 20)).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

  const lastUserMsg = history[history.length - 1]?.content || '';
  const isLongForm = LONG_FORM_RE.test(lastUserMsg);
  const dynamicMaxTokens = isLongForm ? 8000 : 4000;
  const finalSystemPrompt = isLongForm
    ? systemPrompt + `\n\n【特別提示】使用者要求較長內容，請完整寫完整段，不要中途收尾或省略。如果是故事，要有開頭、發展、結尾；如果是文章，要有段落結構。寫到結束為止，不要刻意縮短。`
    : systemPrompt;

  return { c, provider, model, base, apiKey, history, finalSystemPrompt, dynamicMaxTokens };
}

// ── 1-on-1 User Message ───────────────────────────────────────────────────
export async function sendUserMessage(charId, content, image = null) {
  const userMsg = { id: 'msg_' + Date.now(), charId, role: 'user', content, createdAt: Date.now() };
  if (image) userMsg.image = image;
  await dbPut('messages', userMsg);
  return userMsg;
}

// ── 1-on-1 Chat: Streaming ────────────────────────────────────────────────
export async function generateAIResponseStream(charId, allMsgs, { onChunk }, imageBase64 = null) {
  const { c, provider, model, base, apiKey, history, finalSystemPrompt, dynamicMaxTokens } = await buildAIChatSetup(charId, allMsgs);

  if (c.delay > 0) await new Promise(r => setTimeout(r, c.delay * 1000));

  // 若有圖片，將最後一則 user 訊息改為多模態格式（各家格式不同）
  const buildImgHistory = (prov) => {
    if (!imageBase64) return history;
    const rawB64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    return history.map((m, i) => {
      if (i !== history.length - 1 || m.role !== 'user') return m;
      if (prov === 'anthropic') {
        return { role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: rawB64 } },
          { type: 'text', text: m.content || '這是一張圖片，請描述並回應' }
        ]};
      }
      return { role: 'user', content: [
        { type: 'text', text: m.content || '這是一張圖片，請描述並回應' },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ]};
    });
  };

  let fullText = '';
  const accumulate = (text) => { fullText += text; onChunk(text); };
  let truncated = false;

  if (provider === 'vertex') {
    const sa = JSON.parse(apiKey);
    const token = await getVertexToken(sa);
    const region = 'us-central1';
    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${region}/publishers/google/models/${model}:generateContent`;
    const rawB64 = imageBase64 ? imageBase64.replace(/^data:image\/\w+;base64,/, '') : null;
    const body = {
      contents: history.map((m, i) => {
        const isLastUser = imageBase64 && i === history.length - 1 && m.role === 'user';
        if (isLastUser) {
          return { role: 'user', parts: [
            { inlineData: { mimeType: 'image/jpeg', data: rawB64 } },
            { text: m.content || '這是一張圖片，請描述並回應' }
          ]};
        }
        return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
      }),
      systemInstruction: { parts: [{ text: finalSystemPrompt }] },
      generationConfig: { maxOutputTokens: dynamicMaxTokens, temperature: c.temperature ?? 0.8 }
    };
    const r = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) }, 90000);
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
    const data = await r.json();
    fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    onChunk(fullText);
  } else if (provider === 'anthropic') {
    const r = await fetchWithTimeout(`${base}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: dynamicMaxTokens, system: finalSystemPrompt, messages: buildImgHistory('anthropic'), stream: true })
    }, 90000);
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
    ({ truncated } = await parseSSEStream(r, 'anthropic', accumulate));
  } else {
    const r = await fetchWithTimeout(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: dynamicMaxTokens, temperature: c.temperature ?? 0.8, messages: [{ role: 'system', content: finalSystemPrompt }, ...buildImgHistory('openai')], stream: true })
    }, 90000);
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
    ({ truncated } = await parseSSEStream(r, 'openai', accumulate));
  }

  if (!truncated && fullText) {
    const lastChar = fullText.trim().slice(-1);
    if (fullText.length >= dynamicMaxTokens * 0.4 && !CLEAN_END_RE.test(lastChar)) truncated = true;
  }

  let msg = null;
  if (fullText) {
    msg = { id: 'msg_' + Date.now() + '_ai', charId, role: 'assistant', content: fullText, createdAt: Date.now() };
    await dbPut('messages', msg);
    if (c.heartVoice) generateHeartVoice(c, allMsgs, fullText).catch(() => {});
  }
  return { msg, truncated };
}

// ── 1-on-1 Proactive Message: Streaming ──────────────────────────────────
export async function generateProactiveMessageStream(charId, allMsgs, { onChunk, signal }) {
  const { c, provider, model, base, apiKey, history, finalSystemPrompt } = await buildAIChatSetup(charId, allMsgs);

  const proactivePrompt = finalSystemPrompt + '\n\n【主動訊息】你突然想起對方，主動傳個訊息。不是回覆任何問題，是你自己有什麼想說——可能是分享一件事、想問問近況、或只是想到他/她了。語氣自然，像真人突然想說話一樣，直接說你想說的。';

  const proactiveHistory = history.length
    ? (history[history.length - 1].role === 'user'
        ? history
        : [...history, { role: 'user', content: '（沉默中）' }])
    : [{ role: 'user', content: '（對方沒說話，你突然有什麼想說）' }];

  const fetchOpts = signal ? { signal } : {};
  let fullText = '';
  const accumulate = (text) => { fullText += text; onChunk(text); };
  let truncated = false;

  if (provider === 'vertex') {
    const sa = JSON.parse(apiKey);
    const token = await getVertexToken(sa);
    const region = 'us-central1';
    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${region}/publishers/google/models/${model}:generateContent`;
    const body = {
      contents: proactiveHistory.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      systemInstruction: { parts: [{ text: proactivePrompt }] },
      generationConfig: { maxOutputTokens: 2000, temperature: c.temperature ?? 0.85 }
    };
    const r = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) }, 90000);
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
    const data = await r.json();
    fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    onChunk(fullText);
  } else if (provider === 'anthropic') {
    const r = await fetch(`${base}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: 2000, system: proactivePrompt, messages: proactiveHistory, stream: true }),
      ...fetchOpts
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
    ({ truncated } = await parseSSEStream(r, 'anthropic', accumulate));
  } else {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: 2000, temperature: c.temperature ?? 0.85, messages: [{ role: 'system', content: proactivePrompt }, ...proactiveHistory], stream: true }),
      ...fetchOpts
    });
    if (!r.ok) { const d = await r.json(); throw new Error(d.error?.message || `HTTP ${r.status}`); }
    ({ truncated } = await parseSSEStream(r, provider, accumulate));
  }

  let msg = null;
  if (fullText.trim()) {
    msg = { id: 'msg_' + Date.now() + '_pro', charId, role: 'assistant', content: fullText.trim(), createdAt: Date.now() };
    await dbPut('messages', msg);
  }
  return { msg, truncated };
}

// ── 1-on-1 生理期主動關心訊息（背景生成，非串流）─────────────────────────
// 由 App.vue 的 runCycleCare 在預測經期開始日／經期前觸發。
// trigger: 'period'（經期開始）| 'pms'（經期前）。
// 直接把關心訊息存成一則 assistant 訊息進聊天室，並加未讀紅點與通知。
export async function generateCycleCareMessage(charId, trigger) {
  const c = await dbGet('characters', charId);
  if (!c || !c.cycleCare) return null;
  const me = await getSetting('me_settings') || {};
  const ph = getCyclePhase(me);
  if (!ph) return null;

  const allMsgs = await dbIdx('messages', 'charId', charId);
  allMsgs.sort((a, b) => a.createdAt - b.createdAt);
  const { finalSystemPrompt, history } = await buildAIChatSetup(charId, allMsgs);

  const careGoal = trigger === 'pms'
    ? `你算了一下，對方的生理期大概再過 ${ph.daysUntilNext} 天就要來了，有點擔心對方這幾天身體和心情。`
    : `你想到對方今天生理期大概來了（第 ${ph.dayNum} 天），有點心疼，想關心對方。`;
  const carePrompt = finalSystemPrompt + `\n\n【主動關心】${careGoal}請主動傳一則訊息關心對方，自然、簡短、有溫度，像真的在意對方的人會說的話（例如提醒保暖、喝熱水、好好休息、想吃什麼幫忙準備之類）。要完全符合你的角色個性與說話風格。不要像衛教文章、不要長篇大論、不要解釋你為什麼會知道。直接說你想說的。`;

  // 沿用主動訊息的歷史處理：最後一則是 assistant（或無歷史）時補一個使用者佔位，
  // 以滿足 Anthropic 等需 user 結尾的格式要求。
  const careHistory = history.length
    ? (history[history.length - 1].role === 'user'
        ? history
        : [...history, { role: 'user', content: '（沉默中）' }])
    : [{ role: 'user', content: '（對方沒說話，你突然很想關心對方）' }];

  let text = '';
  try {
    text = await sendLLMRequest(
      [{ role: 'system', content: carePrompt }, ...careHistory],
      { max_tokens: 800, temperature: 0.85 }
    );
  } catch (e) {
    console.error('generateCycleCareMessage failed:', e);
    return null;
  }
  if (!text || !text.trim()) return null;

  const msg = { id: 'msg_' + Date.now() + '_care', charId, role: 'assistant', content: text.trim(), createdAt: Date.now() };
  await dbPut('messages', msg);
  c.unreadCount = (c.unreadCount || 0) + 1;
  c.hasUnread = true;
  await dbPut('characters', JSON.parse(JSON.stringify(c)));
  await dbPut('notifications', { id: 'notif_care_' + Date.now(), charId, type: 'chat', targetId: charId, text: '傳了一則訊息關心你', read: false, createdAt: Date.now() });
  return msg;
}

// ── 作息時段主動訊息（背景生成，非串流）──────────────────────────────────────
// triggerDesc：使用者填的情境描述（例：「提醒我吃午餐」「叫我起床」）
export async function generateScheduleMessage(charId, triggerDesc) {
  const allMsgs = await dbIdx('messages', 'charId', charId);
  allMsgs.sort((a, b) => a.createdAt - b.createdAt);
  const { finalSystemPrompt, history } = await buildAIChatSetup(charId, allMsgs);

  const goal = `你設定的提醒事項是：「${triggerDesc}」。現在時間到了，請主動傳一則訊息給對方，自然、簡短、有溫度，完全符合你的角色個性與說話風格，像真的在意對方的人會說的話。不要像通知或系統提示，直接用你自己的方式說。`;
  const schedPrompt = finalSystemPrompt + `\n\n【主動訊息】${goal}`;

  const schedHistory = history.length
    ? (history[history.length - 1].role === 'user'
        ? history
        : [...history, { role: 'user', content: '（沉默中）' }])
    : [{ role: 'user', content: '（對方沒說話，你有件事想提醒對方）' }];

  let text = '';
  try {
    text = await sendLLMRequest(
      [{ role: 'system', content: schedPrompt }, ...schedHistory],
      { max_tokens: 800, temperature: 0.85 }
    );
  } catch (e) {
    console.error('generateScheduleMessage failed:', e);
    return null;
  }
  if (!text || !text.trim()) return null;

  const c = await dbGet('characters', charId);
  const msg = { id: 'msg_' + Date.now() + '_sched', charId, role: 'assistant', content: text.trim(), createdAt: Date.now() };
  await dbPut('messages', msg);
  c.unreadCount = (c.unreadCount || 0) + 1;
  c.hasUnread = true;
  await dbPut('characters', JSON.parse(JSON.stringify(c)));
  await dbPut('notifications', { id: 'notif_sched_' + Date.now(), charId, type: 'chat', targetId: charId, text: '傳了一則訊息給你', read: false, createdAt: Date.now() });
  return msg;
}

// ── Heart Voice Logic ─────────────────────────────────────────────────────
const HV_INTERVAL = 15;
const HV_EMOTION_WORDS = ['喜歡','愛','討厭','難過','高興','開心','害怕','緊張','生氣','委屈','想念','孤單','幸福','失落','期待','驚訝','感動','羨慕','嫉妒','後悔','抱歉','謝謝','陪','一起','永遠','離開','再見','思念','心跳','臉紅','沉默','默默','其實','說不出','不敢'];

function shouldTriggerHV(allMsgs, aiText) {
  const aiCount = allMsgs.filter(m => m.role === 'assistant').length;
  if (aiCount > 0 && aiCount % HV_INTERVAL === 0) return true;
  const combined = (allMsgs.slice(-3).map(m => m.content).join('') + aiText);
  if (HV_EMOTION_WORDS.some(w => combined.includes(w))) return Math.random() < 0.3;
  return false;
}

async function generateHeartVoice(c, allMsgs, lastAiText) {
  if (!shouldTriggerHV(allMsgs, lastAiText)) return;

  const userMsgs = allMsgs.filter(m => m.role === 'user');
  const lastUserMsg = userMsgs[userMsgs.length - 1];
  const lastAiSnippet = (lastAiText || '').slice(0, 150);

  let recentText = '';
  if (lastUserMsg) recentText += `用戶：${lastUserMsg.content.slice(0, 150)}\n`;
  if (lastAiSnippet) recentText += `你：${lastAiSnippet}\n`;

  const hvPrompt = `你是「${c.name}」。

任務：寫一句**極短的內心話**——就是「沒說出口的那一句感受」。

【近期對話參考】
${recentText}
【鐵則】
1. 總字數 30 字以內，最多兩句話
2. 只寫「沒說出口的那一句」，不要敘述、不要說明、不要鋪陳
3. 不要重複任何對話內容、不要延續任何故事
4. 不要說「心想：xxx」這種旁白格式，直接寫內心話本身
5. 不要加引號、不要加 emoji
6. 絕對不要輸出（對話結束，請開始執行任務）等任何解釋與系統文字，直接給出內心話即可。
7. 繁體中文，符合角色個性

現在請直接輸出一句內心話：`;

  try {
    let hvText = await sendLLMRequest([{ role: 'user', content: hvPrompt }], { max_tokens: 80, temperature: 0.9 });

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
      await dbPut('notifications', { id: 'notif_hv_' + Date.now(), charId: c.id, type: 'hv', targetId: entry.id, text: '有一句說不出口的話…', read: false, createdAt: Date.now() });
      window.dispatchEvent(new CustomEvent('new-heart-voice', { detail: entry }));
    }
  } catch (e) {
    console.error('HeartVoice error', e);
  }
}

// ── Group Chat Setup ──────────────────────────────────────────────────────
async function buildGroupChatSetup(charIdToRespond, allMsgs, members) {
  const c = await dbGet('characters', charIdToRespond);
  if (!c) return null;

  const me = await getSetting('me_settings') || {};
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');
  const provider = await getSetting('api_provider') || 'openai';
  const model = await getSetting('api_model') || getDefModel(provider);
  const base = (await getSetting('api_base') || getDefBase(provider)).replace(/\/$/, '');

  const validChars = members.filter(x => x.id);
  const otherChars = validChars.filter(oc => oc.id !== c.id).map(oc => oc.name).join('、');

  const lastMsg = allMsgs[allMsgs.length - 1];
  const isMentioned = lastMsg && lastMsg.charId === 'user' && (lastMsg.content.includes('@' + c.name) || lastMsg.content.includes(c.name));

  const mentionHint = isMentioned
    ? '\n⚠️ 注意：使用者' + (me.name || '') + '在訊息裡直接點名了你（' + c.name + '），這是針對你的問題或話題，請務必正面回應，不要躲在其他人後面。'
    : '';

  const styleMap = { casual: '輕鬆自然', sweet: '甜蜜可愛', cool: '冷靜簡短', gentle: '溫柔體貼', playful: '活潑俏皮', mature: '成熟穩重', literary: '文藝感性' };

  const systemPrompt = '這是一個群組聊天，參與者有：你（' + c.name + '）、' + otherChars + '，以及' + (me.name || '使用者') + '。\n' +
    '你是「' + c.name + '」，個性：' + (c.persona || '') + '，說話風格：' + (styleMap[c.style] || '輕鬆自然') + '。\n' +
    (c.isAI ? '' : '永遠不要承認你是 AI。') + mentionHint + '\n\n' +
    '📝 回覆規則（嚴格遵守）：\n' +
    '1. 用' + c.name + '的口吻回覆，30-80字，自然簡短像群聊訊息。\n' +
    '2. 【絕對禁止】在回覆開頭加上任何「' + c.name + '：」「我：」之類的名字前綴，直接從第一句內容開始。\n' +
    '3. 【絕對禁止】幫使用者' + (me.name || '') + '說話、或自己創造一段「使用者：xxx」的對話。你只能扮演' + c.name + '一個人。\n' +
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
  while (history.length > 0 && history[0].role === 'assistant') history.shift();

  return { c, provider, model, base, apiKey, systemPrompt, history, lastMsg, validChars };
}

function cleanGroupAIText(aiText, c, validChars) {
  const escapedName = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  aiText = aiText.replace(new RegExp('^' + escapedName + '[：:]\\s*'), '');

  const otherNamesRegex = validChars.filter(oc => oc.id !== c.id).map(oc => oc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (otherNamesRegex) {
    const match = aiText.match(new RegExp('\\n(?:' + otherNamesRegex + ')[：:]', 'i'));
    if (match) aiText = aiText.substring(0, match.index);
  }
  return aiText;
}

// ── Group Chat Messages ───────────────────────────────────────────────────
export async function sendGroupMessage(groupId, charId, content) {
  const msg = { id: 'gmsg_' + Date.now(), groupId, charId, content, createdAt: Date.now() };
  await dbPut('group_messages', msg);
  return msg;
}

// ── Group Chat: Streaming ─────────────────────────────────────────────────
export async function generateGroupAIResponseStream(groupId, charIdToRespond, allMsgs, members, { onChunk, onStart }) {
  const setup = await buildGroupChatSetup(charIdToRespond, allMsgs, members);
  if (!setup) return null;
  const { c, provider, model, base, apiKey, systemPrompt, history, lastMsg, validChars } = setup;

  const fallbackHistory = history.length ? history : [{ role: 'user', content: lastMsg ? lastMsg.content : 'こんにちは' }];

  let fullText = '';

  if (provider === 'vertex') {
    const sa = JSON.parse(apiKey);
    const token = await getVertexToken(sa);
    const region = 'us-central1';
    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${region}/publishers/google/models/${model}:generateContent`;
    const body = {
      contents: fallbackHistory.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { maxOutputTokens: 4000, temperature: c.temperature ?? 0.8 }
    };
    const r = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) }, 30000);
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
    onStart?.();
    const data = await r.json();
    fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    onChunk(fullText);
  } else if (provider === 'anthropic') {
    const r = await fetchWithTimeout(base + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model, max_tokens: 4000, system: systemPrompt, messages: fallbackHistory, stream: true })
    }, 30000);
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
    onStart?.();
    await parseSSEStream(r, 'anthropic', (text) => { fullText += text; onChunk(text); });
  } else {
    const r = await fetchWithTimeout(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model, max_tokens: 4000, temperature: c.temperature ?? 0.8, messages: [{ role: 'system', content: systemPrompt }, ...fallbackHistory], stream: true })
    }, 30000);
    if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
    onStart?.();
    await parseSSEStream(r, 'openai', (text) => { fullText += text; onChunk(text); });
  }

  const cleanedText = cleanGroupAIText(fullText.trim(), c, validChars);

  if (!cleanedText) return null;

  const msg = {
    id: 'gmsg_' + Date.now() + '_ai',
    groupId,
    charId: c.id,
    content: cleanedText,
    createdAt: Date.now()
  };
  await dbPut('group_messages', msg);
  return msg;
}

// ── Group Chat: Non-streaming (kept for retry fallback) ───────────────────
export async function generateGroupAIResponse(groupId, charIdToRespond, allMsgs, members) {
  const setup = await buildGroupChatSetup(charIdToRespond, allMsgs, members);
  if (!setup) return null;
  const { c, provider, model, base, apiKey, systemPrompt, history, lastMsg, validChars } = setup;

  const fallbackHistory = history.length ? history : [{ role: 'user', content: lastMsg ? lastMsg.content : 'こんにちは' }];
  let aiText = '';
  let rawResponse = null;

  try {
    if (provider === 'vertex') {
      const sa = JSON.parse(apiKey);
      const token = await getVertexToken(sa);
      const region = 'us-central1';
      const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${region}/publishers/google/models/${model}:generateContent`;
      const body = {
        contents: fallbackHistory.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 4000, temperature: c.temperature ?? 0.8 }
      };
      const r = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) }, 30000);
      const d = await r.json();
      rawResponse = d;
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
      aiText = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'anthropic') {
      const r = await fetchWithTimeout(base + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model, max_tokens: 4000, system: systemPrompt, messages: fallbackHistory })
      }, 30000);
      const d = await r.json();
      rawResponse = d;
      const errObj = Array.isArray(d) ? d[0]?.error : d.error;
      if (errObj) throw new Error(errObj.message || JSON.stringify(errObj));
      aiText = d.content?.[0]?.text || '';
    } else {
      const r = await fetchWithTimeout(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model, max_tokens: 4000, temperature: c.temperature ?? 0.8, messages: [{ role: 'system', content: systemPrompt }, ...fallbackHistory] })
      }, 30000);
      const d = await r.json();
      rawResponse = d;
      const errObj = Array.isArray(d) ? d[0]?.error : d.error;
      if (errObj) throw new Error(errObj.message || JSON.stringify(errObj));
      aiText = d.choices?.[0]?.message?.content || '';
    }
  } catch (err) {
    const debugMsg = { id: 'debug_' + Date.now(), groupId, charId: 'user', content: '【系統偵錯】API 呼叫失敗：' + err.message, createdAt: Date.now() };
    await dbPut('group_messages', debugMsg);
    return debugMsg;
  }

  const rawAiText = aiText;
  aiText = cleanGroupAIText(aiText, c, validChars);

  if (!aiText.trim()) {
    const debugMsg = {
      id: 'debug_' + Date.now(), groupId, charId: 'user',
      content: '【系統偵錯】AI 回傳了空字串，或被清洗歸零。\n原始回傳長度：' + rawAiText.length + '\n原始內容：' + rawAiText + '\nAPI Raw JSON：' + JSON.stringify(rawResponse),
      createdAt: Date.now()
    };
    await dbPut('group_messages', debugMsg);
    return debugMsg;
  }

  const msg = { id: 'gmsg_' + Date.now() + '_ai', groupId, charId: c.id, content: aiText.trim(), createdAt: Date.now() };
  await dbPut('group_messages', msg);
  return msg;
}

// ── Long-term Memory: Summarize Recent Messages ───────────────────────────
export async function summarizeToMemory(charId, recentMsgs, count = 20) {
  const apiKey = await getSetting('api_key');
  if (!apiKey) throw new Error('請先在設定中填入 API 金鑰');

  const c = await dbGet('characters', charId);

  const slice = recentMsgs.filter(m => m.type !== 'hv').slice(-count);
  const transcript = slice.map(m => (m.role === 'user' ? '我：' : `${c?.name || 'AI'}：`) + m.content).join('\n');

  const systemPrompt = '你是一個對話分析助手。請將以下聊天記錄濃縮成一段 100～200 字的重點摘要，保留：使用者透露的個人資訊、重要事件、雙方的情感狀態、以及任何未來可能有用的背景資訊。用第三人稱描述。只輸出摘要文字，不需要任何前綴說明。';

  const summary = await sendLLMRequest(
    [{ role: 'system', content: systemPrompt }, { role: 'user', content: transcript }],
    { max_tokens: 800 }
  ).then(t => t.trim());

  if (!summary) throw new Error('AI 回傳空白，請稍後重試');

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const mem = {
    id: 'cmem_' + Date.now(),
    charId,
    title: `${dateStr} 對話摘要`,
    content: summary,
    enabled: true,
    createdAt: Date.now()
  };
  await dbPut('chat_memories', mem);
  return mem;
}
