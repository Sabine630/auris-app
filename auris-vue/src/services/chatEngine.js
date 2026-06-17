import { dbGet, dbPut, dbIdx, dbAll, getSetting, setSetting } from './db.js';
import { fetchWithTimeout, sendLLMRequest, getVertexToken } from './api.js';
import { getCyclePhase, cycleCareContext } from './cycle.js';
import { splitReply } from './format.js';

// 把 AI 一次回覆的整段文字依空行切成多則訊息並寫入 DB（真人連發短泡泡）。
// 回傳已落庫的訊息陣列（同角色、createdAt 以毫秒位移保序，會被 isCont 歸為連續訊息）。
// maxSegments 預設取角色 maxMsg，避免一句一泡泡；kind 供主動訊息標記用。
async function persistReplySegments(charId, fullText, { maxSegments = 3, kind = null } = {}) {
  const segs = splitReply(fullText, maxSegments);
  const base = Date.now();
  const msgs = segs.map((content, i) => {
    const m = { id: 'msg_' + base + '_ai_' + i, charId, role: 'assistant', content, createdAt: base + i };
    if (kind) m.kind = kind;
    return m;
  });
  for (const m of msgs) await dbPut('messages', m);
  return msgs;
}

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

// 個人紀念日感知：回傳今天與角色/玩家生日、相識日、在一起紀念日相關的提示字串
function getPersonalDateCtx(char, me) {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, '0');
  const dd = String(n.getDate()).padStart(2, '0');
  const today = mm + '-' + dd;
  const parts = [];

  function mmdd(dateStr) {
    if (!dateStr) return null;
    return dateStr.slice(5);
  }

  if (mmdd(char.birthday) === today) parts.push('今天是「' + char.name + '」的生日🎂');
  if (mmdd(me && me.birthday) === today) parts.push('今天是「對方」的生日🎂，請特別祝福、表達心意');
  if (mmdd(char.meetDate) === today) parts.push('今天是你們的相識紀念日🌸');
  if (mmdd(char.togetherDate) === today) {
    const start = new Date(char.togetherDate);
    const days = Math.floor((n - start) / 86400000);
    parts.push('今天是你們在一起的紀念日❤️（第 ' + days + ' 天）');
  }

  return parts.length ? ('\n【紀念日】' + parts.join('；')) : '';
}

const CLEAN_END_RE = /[。！？！?.…」』）)」”'”]/;

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
  const formatStyle = await getSetting('chat_format_style');
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

  // 個人紀念日（生日、相識日、在一起紀念日）——不依賴 timeAware，只要有設定就注入
  const personalDateCtx = getPersonalDateCtx(c, me);

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

  // 動作排版（全域開關）：請角色用 *星號* 包動作／場景敘述、用「」包對話，前端會渲染成斜體旁白與上色。
  const formatCtx = formatStyle
    ? '\n【排版規則】把動作、表情、場景等敘述用半形星號 *像這樣* 包起來（會顯示成斜體旁白），角色說出口的話用「」括住。例：*他笑了笑*「好啊，那走吧。」自然運用即可，不要每句都硬套。'
    : '';

  // 回覆長度貼合角色個性：高冷／話少的角色不該被硬性字數逼著湊長段（取代舊的固定「50～150 字」）。
  const isTerse = c.talkative === 'quiet' || c.style === 'cool';
  const lengthGuide = isTerse
    ? '・回覆長度貼合你的個性：你話不多、偏高冷，可以只回一兩句短訊息，不必湊字數；但每句都要有具體內容，不能是「嗯」「好啊」這種空洞敷衍'
    : c.talkative === 'lots'
      ? '・你話多、愛聊天，可以回得長一些、自然地連發多則訊息，內容要具體、有細節與溫度'
      : '・回覆長度適中，要有具體內容，不要只是「嗯」「好啊」「哈哈」這種空洞回應';

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
${timeCtx}${scheduleCtx}${playerScheduleCtx}${personalDateCtx}${cycleCtx}${worldCtx}${memCtx}${formatCtx}
【回覆品質要求】
${lengthGuide}
・要回應對方說的具體內容，展現你真的在聽、在意
・可以分享自己的感受、想法、記憶、日常細節，讓對話有深度和溫度
・語氣、用詞要完全符合角色個性，不能像客服或 AI
・禁止使用「我理解你的感受」「這很有趣」「確實如此」等通用句
・回覆要有延伸性，可以反問、聊到相關話題、分享自身經歷
【格式規則】一次回${c.minMsg || 1}到${c.maxMsg || 2}則訊息，每則訊息之間「空一行」分隔（前端會把每則顯示成獨立的訊息泡泡，像真人連發）。不要加 emoji 除非符合角色個性。絕對不要說「我作為 AI」。${REPLY_NO_NARRATION}`;

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

  let msgs = [];
  if (fullText) {
    msgs = await persistReplySegments(charId, fullText, { maxSegments: c.maxMsg || 2 });
    if (c.heartVoice) generateHeartVoice(c, allMsgs, fullText).catch(() => {});
  }
  return { msgs, truncated };
}

// ── 主動訊息共用工具 ───────────────────────────────────────────────────────
// 把「現在該主動傳訊」的指令放到對話最尾端（最新近的一則），模型才會確實執行主動任務，
// 而不是順著上面的舊話題回。同時維持 user/assistant 交替（Gemini/Anthropic 會拒絕連續同角色）：
// 最後一則「真實對話」訊息（排除 heart voice）距今未滿此時間，視為「使用者還在熱聊」。
// 熱聊中主動訊息要順著對話穿插；冷場才另起新話題開場白（P80）。
export const PROACTIVE_ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 分鐘

export function isRecentlyActive(allMsgs) {
  let latest = 0;
  for (const m of allMsgs || []) {
    if (m.type === 'hv') continue;
    if (m.createdAt > latest) latest = m.createdAt;
  }
  return latest > 0 && (Date.now() - latest) < PROACTIVE_ACTIVE_WINDOW_MS;
}

// 熱聊中要附加在主動訊息 system prompt 後的提醒：別自顧自講、順著當下對話帶進來。
const PROACTIVE_ACTIVE_TAIL = '\n\n（補充：對方此刻正在跟你聊天，上面是你們最近的對話。'
  + '請順著當下的對話與情境，自然地把這份心意接進去說——要承接對方剛剛說的內容，'
  + '不要無視剛才聊的話、也不要硬起一個不相干的新話題。）';

// 正常回覆共用尾巴：禁止 AI 把即時聊天回覆寫成小說場景／時間旁白（比照主動訊息的 PROACTIVE_NO_NARRATION）。
// 接在一般回覆 system prompt 末端（正常回覆與重新生成共用）。動作排版開著時仍可用 *星號* 簡短帶過動作。
const REPLY_NO_NARRATION = '\n（重要：這是即時聊天訊息，不是小說章節。不要寫「隔天早上」「手機震動」'
  + '「書房裡咖啡剛沏好」這類場景旁白、時間旁白或大段敘事鋪陳；就像真人傳訊一樣，直接說你想說的話。'
  + '若有用星號標動作，也只是簡短點綴，不要整段場景描寫。）';

// 主動訊息共用尾巴：禁止 AI 把「主動傳訊」演成小說場景／時間旁白（B）。
// 主動訊息是即時送出的一則訊息，不該出現「隔天早上」「手機震動」「書房裡…」這類鋪陳。
const PROACTIVE_NO_NARRATION = '\n\n（重要：直接以你要傳出的訊息正文開始。不要寫「隔天早上」「手機震動」'
  + '「書房裡咖啡剛沏好」這類場景旁白、時間旁白或敘事鋪陳，也不要用星號＊＊把場景描述包起來——'
  + '這是一則此刻即時傳出的訊息，不是小說章節，開頭就直接說你想對對方說的話。）';

// 主動訊息時間錨（C）：不依賴角色的 timeAware 開關——主動訊息一定是在現實的某一刻送出的，
// 把當下的時段強制餵進去，避免「早上問午餐吃了沒」「半夜說早安」這種時段錯亂。
function proactiveTimeAnchor() {
  const n = new Date();
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const h = n.getHours();
  let period;
  if (h < 5) period = '深夜';
  else if (h < 8) period = '清晨';
  else if (h < 11) period = '早上';
  else if (h < 13) period = '中午';
  else if (h < 17) period = '下午';
  else if (h < 19) period = '傍晚';
  else if (h < 23) period = '晚上';
  else period = '深夜';
  const hh = String(h).padStart(2, '0');
  const mm = String(n.getMinutes()).padStart(2, '0');
  return `\n\n【現在時間】現在是 ${n.getMonth() + 1}/${n.getDate()}（星期${days[n.getDay()]}）${period} ${hh}:${mm}。`
    + `這則訊息是此刻送出的，內容（問候語、提到的時段、用餐——早餐／午餐／晚餐／宵夜）都要對齊現在：`
    + `${period}就用符合${period}的話，不要問已經過去或還沒到的時段（例如早上別問午餐吃了沒、深夜別說早安）。`;
}

// 若最後一則是 user（對方留言還沒回），就把指令併進那則 user，而不是再補一則 user。
// task：本次主動訊息的具體任務（例：「你之前設定要提醒對方：『喝水』，現在時間到了。」）
// active：對方是否還在熱聊——熱聊時要承接對話自然帶進去，冷場時才另起新話題開場白。
function buildProactiveHistory(history, task, active) {
  const instr = active
    ? `（這不是對方傳來的訊息，而是給你的系統提示：${task}`
      + `對方正在跟你聊天，上面是你們最近的對話。請順著現在的對話與情境，把這個念頭自然地接進去——`
      + `承接對方剛剛說的內容、像真人邊聊邊提起，不要無視剛才的對話、也不要硬轉成不相干的開場白，`
      + `更不要把這段提示原文寫進訊息。）`
    : `（這不是對方傳來的訊息，而是給你的系統提示：${task}`
      + `請你現在主動傳一則訊息，用你自己的角色口吻與說話風格，自然、簡短、有溫度，`
      + `不要接續上面的舊話題、不要等對方先開口、也不要把這段提示原文寫進訊息。）`;
  if (!history.length) return [{ role: 'user', content: instr }];
  const out = history.slice();
  const last = out[out.length - 1];
  if (last.role === 'user') {
    out[out.length - 1] = { ...last, content: last.content + '\n\n' + instr };
  } else {
    out.push({ role: 'user', content: instr });
  }
  return out;
}

// 所有「角色主動發起」訊息的內部標記值（純邏輯判斷用，不渲染成標籤）。
// 派發器靠它判斷「上一則是不是還沒回的主動開場白」，避免一次堆好幾則。
export const PROACTIVE_KINDS = new Set(['proactive', 'cycleCare', 'schedule', 'missYou', 'dailyQuestion']);

// 該角色最新一則「真實對話」訊息（排除 heart voice）是否為一則尚未回覆的主動訊息。
// 用於派發前的防堆疊閘門：上一則主動開場白還沒被回，就先不要再丟新的。
export async function hasUnrepliedProactive(charId) {
  const msgs = await dbIdx('messages', 'charId', charId);
  if (!msgs.length) return false;
  msgs.sort((a, b) => b.createdAt - a.createdAt);
  const last = msgs.find(m => m.type !== 'hv');
  return !!(last && last.role === 'assistant' && PROACTIVE_KINDS.has(last.kind));
}

// ── 1-on-1 Proactive Message: Streaming ──────────────────────────────────
export async function generateProactiveMessageStream(charId, allMsgs, { onChunk, signal }) {
  const { c, provider, model, base, apiKey, history, finalSystemPrompt } = await buildAIChatSetup(charId, allMsgs);

  const active = isRecentlyActive(allMsgs);
  const proactivePrompt = finalSystemPrompt
    + (active
      ? '\n\n【主動訊息】你想主動再說點什麼。順著你們現在的對話與情境自然地接下去，承接對方剛剛說的內容，像真人邊聊邊補一句，語氣自然。'
      : '\n\n【主動訊息】你突然想起對方，主動傳個訊息。不是回覆任何問題，是你自己有什麼想說——可能是分享一件事、想問問近況、或只是想到他/她了。語氣自然，像真人突然想說話一樣，直接說你想說的。')
    + proactiveTimeAnchor() + PROACTIVE_NO_NARRATION;

  const proactiveHistory = buildProactiveHistory(history, '你想主動再說點什麼——分享一件事、問問近況、或只是想到他／她了。', active);

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

  let msgs = [];
  if (fullText.trim()) {
    msgs = await persistReplySegments(charId, fullText, { maxSegments: c.maxMsg || 2, kind: 'proactive' });
    // 聊天室即時主動也計入「上一則主動訊息時間」，讓背景派發的 3h min-gap 不會在你在場時又疊一則
    try { await setSetting('last_proactive_' + charId, Date.now()); } catch (_) {}
  }
  return { msgs, truncated };
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

  const active = isRecentlyActive(allMsgs);
  const careGoal = trigger === 'pms'
    ? `你算了一下，對方的生理期大概再過 ${ph.daysUntilNext} 天就要來了，有點擔心對方這幾天身體和心情。`
    : `你想到對方今天生理期大概來了（第 ${ph.dayNum} 天），有點心疼，想關心對方。`;
  const carePrompt = finalSystemPrompt + `\n\n【主動關心】${careGoal}請主動傳一則訊息關心對方，自然、簡短、有溫度，像真的在意對方的人會說的話（例如提醒保暖、喝熱水、好好休息、想吃什麼幫忙準備之類）。要完全符合你的角色個性與說話風格。不要像衛教文章、不要長篇大論、不要解釋你為什麼會知道。直接說你想說的。` + (active ? PROACTIVE_ACTIVE_TAIL : '') + proactiveTimeAnchor() + PROACTIVE_NO_NARRATION;

  const careHistory = buildProactiveHistory(history, `${careGoal}你想主動傳訊關心對方。`, active);

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

  const msg = { id: 'msg_' + Date.now() + '_care', charId, role: 'assistant', content: text.trim(), kind: 'cycleCare', createdAt: Date.now() };
  await dbPut('messages', msg);
  c.unreadCount = (c.unreadCount || 0) + 1;
  c.hasUnread = true;
  await dbPut('characters', JSON.parse(JSON.stringify(c)));
  await dbPut('notifications', { id: 'notif_care_' + Date.now(), charId, type: 'chat', targetId: charId, messageId: msg.id, text: '傳了一則訊息關心你', read: false, createdAt: Date.now() });
  // 開著的聊天室即時撈出這則背景訊息（E）
  try { window.dispatchEvent(new CustomEvent('new-proactive-msg', { detail: { charId } })); } catch (_) {}
  return msg;
}

// ── 作息時段主動訊息（背景生成，非串流）──────────────────────────────────────
// triggerDesc：使用者填的情境描述（例：「提醒我吃午餐」「叫我起床」）
export async function generateScheduleMessage(charId, triggerDesc) {
  const allMsgs = await dbIdx('messages', 'charId', charId);
  allMsgs.sort((a, b) => a.createdAt - b.createdAt);
  const { finalSystemPrompt, history } = await buildAIChatSetup(charId, allMsgs);

  const active = isRecentlyActive(allMsgs);
  const goal = `你設定的提醒事項是：「${triggerDesc}」。現在時間到了，請主動傳一則訊息給對方，自然、簡短、有溫度，完全符合你的角色個性與說話風格，像真的在意對方的人會說的話。不要像通知或系統提示，直接用你自己的方式說。`;
  const schedPrompt = finalSystemPrompt + `\n\n【主動訊息】${goal}` + (active ? PROACTIVE_ACTIVE_TAIL : '') + proactiveTimeAnchor() + PROACTIVE_NO_NARRATION;

  const schedHistory = buildProactiveHistory(history, `你之前設定要在這個時間主動提醒對方：「${triggerDesc}」，現在時間到了。`, active);

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
  const msg = { id: 'msg_' + Date.now() + '_sched', charId, role: 'assistant', content: text.trim(), kind: 'schedule', createdAt: Date.now() };
  await dbPut('messages', msg);
  c.unreadCount = (c.unreadCount || 0) + 1;
  c.hasUnread = true;
  await dbPut('characters', JSON.parse(JSON.stringify(c)));
  await dbPut('notifications', { id: 'notif_sched_' + Date.now(), charId, type: 'chat', targetId: charId, messageId: msg.id, text: '傳了一則訊息給你', read: false, createdAt: Date.now() });
  // 開著的聊天室即時撈出這則背景訊息（E），避免之後重開才「插進歷史中間」
  try { window.dispatchEvent(new CustomEvent('new-proactive-msg', { detail: { charId } })); } catch (_) {}
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
  const formatStyle = await getSetting('chat_format_style');
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
    '5. 若使用者直接問你，要先正面回答自己的想法。直接輸出訊息內容本身。' +
    (formatStyle ? '\n6. 把動作／表情／場景敘述用半形星號 *像這樣* 包起來，說出口的話用「」括住。' : '');

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

// ── 「我想你」輕觸（背景生成，非串流）────────────────────────────────────
// 由 App.vue 的 runMissYou 在開 app 時隨機觸發（每角色每天最多一次，40% 機率）。
// 需開啟角色的 missYouEnabled，且有至少 5 則對話記錄。
export async function generateMissYouMessage(charId) {
  const allMsgs = await dbIdx('messages', 'charId', charId);
  allMsgs.sort((a, b) => a.createdAt - b.createdAt);
  const { finalSystemPrompt, history } = await buildAIChatSetup(charId, allMsgs);

  const active = isRecentlyActive(allMsgs);
  const missYouPrompt = finalSystemPrompt
    + (active
      ? '\n\n【我想你】你想讓對方知道你正想著他／她。順著你們現在的對話自然帶一句，承接剛剛聊的內容，簡短（一兩句就好），有溫度但不刻意煽情，不要用問句作結。'
      : '\n\n【我想你】你突然想到對方了，想傳一個很短、很自然的訊息。不是因為有事要說，就是想到他／她了。語氣要像真實的人，直接說你想說的，簡短（一兩句就好），有溫度但不刻意煽情。不要用問句作結。')
    + proactiveTimeAnchor() + PROACTIVE_NO_NARRATION;

  const missHistory = buildProactiveHistory(history, '你突然想到對方了，想傳一個很短、很自然的訊息給他／她，不是因為有事，就是單純想到了。', active);

  let text = '';
  try {
    text = await sendLLMRequest(
      [{ role: 'system', content: missYouPrompt }, ...missHistory],
      { max_tokens: 120, temperature: 0.9 }
    );
  } catch (e) {
    console.error('generateMissYouMessage failed:', e);
    return null;
  }
  if (!text || !text.trim()) return null;

  const c = await dbGet('characters', charId);
  const msg = { id: 'msg_' + Date.now() + '_miss', charId, role: 'assistant', content: text.trim(), kind: 'missYou', createdAt: Date.now() };
  await dbPut('messages', msg);
  c.unreadCount = (c.unreadCount || 0) + 1;
  c.hasUnread = true;
  await dbPut('characters', JSON.parse(JSON.stringify(c)));
  await dbPut('notifications', { id: 'notif_miss_' + Date.now(), charId, type: 'chat', targetId: charId, messageId: msg.id, text: '突然想到你了', read: false, createdAt: Date.now() });
  // 開著的聊天室即時撈出這則背景訊息（E）
  try { window.dispatchEvent(new CustomEvent('new-proactive-msg', { detail: { charId } })); } catch (_) {}
  return msg;
}

// ── 每日一問（背景生成，非串流）──────────────────────────────────────────
// 由 App.vue 的 runDailyQuestions 在開 app 時觸發（每角色每天一次）。
// 需開啟角色的 dailyQuestionEnabled，且有至少 3 則對話記錄。
export async function generateDailyQuestion(charId) {
  const allMsgs = await dbIdx('messages', 'charId', charId);
  allMsgs.sort((a, b) => a.createdAt - b.createdAt);
  const { finalSystemPrompt, history } = await buildAIChatSetup(charId, allMsgs);

  const active = isRecentlyActive(allMsgs);
  const dqPrompt = finalSystemPrompt + '\n\n【每日一問】今天你想主動問對方一個問題——關於他／她最近的生活、心情、想法、或你們共同感興趣的話題。問題要真誠、自然，像真的想了解對方的人會問的，不要太制式或像問卷。可以先說一點引子再問，整體簡短（三句以內）。' + (active ? PROACTIVE_ACTIVE_TAIL : '') + proactiveTimeAnchor() + PROACTIVE_NO_NARRATION;

  const dqHistory = buildProactiveHistory(history, '今天你想主動問對方一個問題——關於他／她最近的生活、心情、想法、或你們共同感興趣的話題，問得真誠自然、不要像問卷。', active);

  let text = '';
  try {
    text = await sendLLMRequest(
      [{ role: 'system', content: dqPrompt }, ...dqHistory],
      { max_tokens: 200, temperature: 0.85 }
    );
  } catch (e) {
    console.error('generateDailyQuestion failed:', e);
    return null;
  }
  if (!text || !text.trim()) return null;

  const c = await dbGet('characters', charId);
  const msg = { id: 'msg_' + Date.now() + '_dq', charId, role: 'assistant', content: text.trim(), kind: 'dailyQuestion', createdAt: Date.now() };
  await dbPut('messages', msg);
  c.unreadCount = (c.unreadCount || 0) + 1;
  c.hasUnread = true;
  await dbPut('characters', JSON.parse(JSON.stringify(c)));
  await dbPut('notifications', { id: 'notif_dq_' + Date.now(), charId, type: 'chat', targetId: charId, messageId: msg.id, text: '今天想問你一個問題', read: false, createdAt: Date.now() });
  // 開著的聊天室即時撈出這則背景訊息（E）
  try { window.dispatchEvent(new CustomEvent('new-proactive-msg', { detail: { charId } })); } catch (_) {}
  return msg;
}
