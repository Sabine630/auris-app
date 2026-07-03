// ── 統一 LLM 呼叫層（P99）─────────────────────────────────────────────────
// 所有 provider（openai / anthropic / google / openrouter / vertex）的「請求組裝 + 回應解析」
// 都收斂在這個檔案；其餘模組一律透過 callLLM 呼叫。新增 provider 或改 header 只需動這裡，
// 不必再改散落各處的三叉分支。本層為純搬運：送出的 request body 與回應處理與改版前語意等價。
import { getSetting } from './db.js';
import { fetchWithTimeout, getVertexToken, getDefModel, isReasoningModel } from './api.js';

const VERTEX_REGION = 'us-central1';

// 各 provider 未設 api_base 時的預設端點（OpenAI 相容路徑；vertex 自組 URL、不走 base）。
export function getDefBase(provider) {
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1';
  if (provider === 'google') return 'https://generativelanguage.googleapis.com/v1beta/openai';
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1';
  return 'https://api.openai.com/v1';
}

// 讀 settings 解析出 provider / model / base / apiKey。
// （原本散在 buildAIChatSetup、buildGroupChatSetup、sendLLMRequest 三處，邏輯相同）
// base 去尾斜線；provider 未設時預設 openai（比照聊天主路徑）。
export async function resolveLLMConfig() {
  const apiKey = await getSetting('api_key');
  const provider = await getSetting('api_provider') || 'openai';
  const model = await getSetting('api_model') || getDefModel(provider);
  const base = (await getSetting('api_base') || getDefBase(provider)).replace(/\/$/, '');
  return { provider, model, base, apiKey };
}

// ── Shared SSE stream parser ───────────────────────────────────────────────
// anthropic 與 OpenAI 相容格式兩種 SSE 協定；回傳 { truncated }（是否被 max_tokens 截斷）。
export async function parseSSEStream(response, provider, onChunk) {
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

// system 可為字串或 blocks 陣列 [{ text, cache?: true }]；非 anthropic 一律攤平成單一字串。
function systemToString(system) {
  if (typeof system === 'string') return system || '';
  if (Array.isArray(system)) return system.map(b => b.text).join('');
  return '';
}

// anthropic system：字串直接傳；陣列轉 [{ type:'text', text, cache_control?: ephemeral }]，
// cache:true 的段設快取點（5 分鐘內重複輸入只收 1 折）。
function systemToAnthropicBlocks(system) {
  if (typeof system === 'string') return system || '';
  const blocks = [];
  for (const b of system) {
    const block = { type: 'text', text: b.text };
    if (b.cache) block.cache_control = { type: 'ephemeral' };
    blocks.push(block);
  }
  return blocks;
}

// 圖片多模態：把 base64 data URL 附加到最後一則 user 訊息（各家格式不同）。
// vertex 因走 parts 格式，在 vertex body builder 內另行處理，不經此函式。
function applyImage(messages, image, provider) {
  if (!image) return messages;
  const rawB64 = image.replace(/^data:image\/\w+;base64,/, '');
  return messages.map((m, i) => {
    if (i !== messages.length - 1 || m.role !== 'user') return m;
    const fallback = m.content || '這是一張圖片，請描述並回應';
    if (provider === 'anthropic') {
      return { role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: rawB64 } },
        { type: 'text', text: fallback }
      ]};
    }
    return { role: 'user', content: [
      { type: 'text', text: fallback },
      { type: 'image_url', image_url: { url: image } }
    ]};
  });
}

// ── 統一入口 ───────────────────────────────────────────────────────────────
// opts：
//   provider / model / base / apiKey  由 resolveLLMConfig() 或 build*Setup 傳入
//   system      string 或 blocks 陣列（cache 只對 anthropic 生效，其餘 join 成純字串）
//   messages    [{ role, content }]（content 可為多模態陣列）
//   maxTokens、temperature（anthropic 與推理型模型一律不送 temperature）
//   stream      true 走 SSE（vertex 不支援串流 → 一次回、onChunk 收整段，行為與現況一致）
//   onChunk、onStart（HTTP OK 後、讀串流前呼叫）、signal（可中斷）
//   image       base64 data URL，附加到最後一則 user 訊息
//   extra       { frequency_penalty, presence_penalty }：僅 provider==='openai' 且非推理型時帶上
// 回傳 { fullText, truncated }
export async function callLLM({
  provider, model, base, apiKey,
  system = '', messages = [],
  maxTokens = 800, temperature = 0.8,
  stream = false, onChunk, onStart, signal,
  image = null, extra = null,
}) {
  // ── Vertex AI：原生 contents/parts 格式（不支援串流，一次回整段）──────────
  if (provider === 'vertex') {
    const sa = JSON.parse(apiKey);
    const token = await getVertexToken(sa);
    const url = `https://${VERTEX_REGION}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${VERTEX_REGION}/publishers/google/models/${model}:generateContent`;
    const rawB64 = image ? image.replace(/^data:image\/\w+;base64,/, '') : null;
    const contents = messages.map((m, i) => {
      const isLastUser = rawB64 && i === messages.length - 1 && m.role === 'user';
      if (isLastUser) {
        return { role: 'user', parts: [
          { inlineData: { mimeType: 'image/jpeg', data: rawB64 } },
          { text: m.content || '這是一張圖片，請描述並回應' }
        ]};
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
    });
    const body = {
      contents,
      generationConfig: { maxOutputTokens: maxTokens, temperature: temperature ?? 0.8 }
    };
    const sysStr = systemToString(system);
    if (sysStr) body.systemInstruction = { parts: [{ text: sysStr }] };

    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body),
      signal
    }, 90000);

    if (stream) {
      if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
      onStart?.();
      const data = await r.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      onChunk?.(text);
      return { fullText: text, truncated: false };
    }
    const data = await r.json();
    if (!r.ok || data.error) throw new Error(data.error?.message || JSON.stringify(data.error) || `HTTP Error ${r.status}`);
    return { fullText: data.candidates?.[0]?.content?.parts?.[0]?.text || '', truncated: false };
  }

  // ── Anthropic Messages API ────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const sysBlocks = systemToAnthropicBlocks(system);
    const hasCache = Array.isArray(sysBlocks) && sysBlocks.some(b => b.cache_control);
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
    if (hasCache) headers['anthropic-beta'] = 'prompt-caching-2024-07-31';
    // anthropic 現行款一律不送 temperature（送非預設值會被拒）。
    const body = { model, max_tokens: maxTokens, system: sysBlocks, messages, stream };

    const r = await fetchWithTimeout(`${base}/messages`, {
      method: 'POST', headers, body: JSON.stringify(body), signal
    }, 90000);

    if (stream) {
      if (!r.ok) { const e = await r.json(); throw new Error(e.error?.message || `HTTP ${r.status}`); }
      onStart?.();
      let fullText = '';
      const { truncated } = await parseSSEStream(r, 'anthropic', (t) => { fullText += t; onChunk?.(t); });
      return { fullText, truncated };
    }
    const data = await r.json();
    const errObj = Array.isArray(data) ? data[0]?.error : data.error;
    if (!r.ok || errObj) throw new Error(errObj?.message || JSON.stringify(errObj) || `HTTP Error ${r.status}`);
    return { fullText: data.content?.[0]?.text || '', truncated: false };
  }

  // ── OpenAI 相容格式（openai / google AI Studio / openrouter）───────────────
  const omitSampling = isReasoningModel(model);
  const sysStr = systemToString(system);
  const msgs = applyImage(messages, image, provider);
  const finalMsgs = sysStr ? [{ role: 'system', content: sysStr }, ...msgs] : msgs;
  const body = { model, max_tokens: maxTokens, messages: finalMsgs, stream };
  if (!omitSampling) body.temperature = temperature ?? 0.8;
  if (extra && provider === 'openai' && !omitSampling) {
    body.frequency_penalty = extra.frequency_penalty;
    body.presence_penalty = extra.presence_penalty;
  }
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

  const r = await fetchWithTimeout(`${base}/chat/completions`, {
    method: 'POST', headers, body: JSON.stringify(body), signal
  }, 90000);

  if (stream) {
    if (!r.ok) { const d = await r.json(); throw new Error(d.error?.message || `HTTP ${r.status}`); }
    onStart?.();
    let fullText = '';
    const { truncated } = await parseSSEStream(r, 'openai', (t) => { fullText += t; onChunk?.(t); });
    return { fullText, truncated };
  }
  const data = await r.json();
  const errObj = Array.isArray(data) ? data[0]?.error : data.error;
  if (!r.ok || errObj) throw new Error(errObj?.message || JSON.stringify(errObj) || `HTTP Error ${r.status}`);
  return { fullText: data.choices?.[0]?.message?.content || '', truncated: false };
}
