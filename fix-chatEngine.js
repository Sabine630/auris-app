const fs = require('fs');
const path = '/Users/sabinetsai/Desktop/AI測試/auris-app/auris-vue/src/services/chatEngine.js';
let content = fs.readFileSync(path, 'utf8');

const splitPoint = 'export async function generateGroupAIResponse(groupId, charIdToRespond, allMsgs, members) {';
const parts = content.split(splitPoint);

if (parts.length === 2) {
  let before = parts[0];
  const newFunc = `export async function generateGroupAIResponse(groupId, charIdToRespond, allMsgs, members) {
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
  base = base.replace(/\\/$/, '');

  const validChars = members.filter(x => x.id);
  const otherChars = validChars.filter(oc => oc.id !== c.id).map(oc => oc.name).join('、');
  
  const lastMsg = allMsgs[allMsgs.length - 1];
  const isMentioned = lastMsg && lastMsg.charId === 'user' && (lastMsg.content.includes('@' + c.name) || lastMsg.content.includes(c.name));
  
  const mentionHint = isMentioned
    ? '\\n⚠️ 注意：使用者' + (me.name||'') + '在訊息裡直接點名了你（' + c.name + '），這是針對你的問題或話題，請務必正面回應，不要躲在其他人後面。'
    : '';
    
  const styleMap = { casual: '輕鬆自然', sweet: '甜蜜可愛', cool: '冷靜簡短', gentle: '溫柔體貼', playful: '活潑俏皮', mature: '成熟穩重', literary: '文藝感性' };
  
  const systemPrompt = '這是一個群組聊天，參與者有：你（' + c.name + '）、' + otherChars + '，以及' + (me.name||'使用者') + '。\\n' +
    '你是「' + c.name + '」，個性：' + (c.persona||'') + '，說話風格：' + (styleMap[c.style]||'輕鬆自然') + '。\\n' +
    (c.isAI ? '' : '永遠不要承認你是 AI。') + mentionHint + '\\n\\n' +
    '📝 回覆規則（嚴格遵守）：\\n' +
    '1. 用' + c.name + '的口吻回覆，30-80字，自然簡短像群聊訊息。\\n' +
    '2. 【絕對禁止】在回覆開頭加上任何「' + c.name + '：」「我：」之類的名字前綴，直接從第一句內容開始。\\n' +
    '3. 【絕對禁止】幫使用者' + (me.name||'') + '說話、或自己創造一段「使用者：xxx」的對話。你只能扮演' + c.name + '一個人。\\n' +
    '4. 【絕對禁止】輸出多個角色的對話片段。即使要回應其他角色說過的話，也只用' + c.name + '的口吻單獨講一段。\\n' +
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
      history[history.length - 1].content += '\\n\\n' + m.content;
    } else {
      history.push(m);
    }
  }

  while (history.length > 0 && history[0].role === 'assistant') {
    history.shift();
  }

  let aiText = '';

  if (provider === 'anthropic') {
    const r = await fetchWithTimeout(base + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 800, system: systemPrompt, messages: history.length ? history : [{ role: 'user', content: lastMsg ? lastMsg.content : '哈囉' }] })
    }, 30000);
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    aiText = d.content?.[0]?.text || '';
  } else {
    const r = await fetchWithTimeout(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({ model, max_tokens: 800, temperature: c.temperature ?? 0.8, messages: [{ role: 'system', content: systemPrompt }, ...(history.length ? history : [{ role: 'user', content: lastMsg ? lastMsg.content : '哈囉' }])] })
    }, 30000);
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    aiText = d.choices?.[0]?.message?.content || '';
  }

  const escapedName = c.name.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
  const namePrefix = new RegExp('^' + escapedName + '[：:]\\\\s*');
  aiText = aiText.replace(namePrefix, '');
  
  const otherNamesRegex = validChars.filter(oc => oc.id !== c.id).map(oc => oc.name.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&')).join('|');
  if (otherNamesRegex) {
    const dialogSwitchRegex = new RegExp('\\\\n(?:' + otherNamesRegex + ')[：:]', 'i');
    const match = aiText.match(dialogSwitchRegex);
    if (match) {
      aiText = aiText.substring(0, match.index);
    }
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
`;
  
  fs.writeFileSync(path, before + newFunc, 'utf8');
  console.log('Replaced function successfully.');
} else {
  console.log('Function not found exactly once.');
}
