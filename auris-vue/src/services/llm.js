// ── 統一 LLM 呼叫層（P99）─────────────────────────────────────────────────
// 所有 provider（openai / anthropic / google / openrouter / vertex）的「請求組裝 + 回應解析」
// 都收斂在這個檔案；其餘模組一律透過 callLLM 呼叫。新增 provider 或改 header 只需動這裡，
// 不必再改散落各處的三叉分支。本層為純搬運：送出的 request body 與回應處理與改版前語意等價。
import { getSetting } from './db.js';
import { fetchWithTimeout, getVertexToken, getDefModel, isReasoningModel } from './api.js';
import { isDemo } from './demoMode.js';
import { demoReply } from './demoData.js';
import { logError, sanitizeCode } from './diag.js';
import { createThinkingStreamFilter, stripThinking } from './thinkingFilter.js';

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

// Anthropic 非串流回應的 content 是 block 陣列，可能混入 thinking／redacted_thinking／
// tool_use。只取 content[0] 會在模型先吐 thinking block 時整段變空字串——P132 實機病灶：
// 擷取器、總結、日記、貼文等所有非串流背景任務全部悄悄拿到 ''，不拋錯、不留紀錄，
// 待續的事因此永遠是空的（串流那條有正確過濾 text_delta，所以聊天看起來一切正常）。
function anthropicText(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter(b => b?.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join('');
}

// Gemini 的 candidate.content.parts 同樣是陣列：長回覆會被拆成多段 text，思考摘要則
// 帶 thought: true。舊實作只取 parts[0]?.text——多段時後半被默默丟掉（使用者看到回覆
// 無故斷在半路），parts[0] 不是 text 時整段變空字串。與上面 anthropicText 是同一個洞，
// P132 只補了 Anthropic，Vertex 這條從 P54 接入以來一直沒修。
function vertexText(parts) {
  if (!Array.isArray(parts)) return '';
  return parts
    .filter(p => p && p.thought !== true && typeof p.text === 'string')
    .map(p => p.text)
    .join('');
}

// Vertex 回應 → { text, truncated, emptyReason }。空回應的原因優先序：
// prompt 端被擋（promptFeedback.blockReason）→ 連 candidate 都沒有 → candidate 自己的
// finishReason（MAX_TOKENS／SAFETY／RECITATION…）→ 都正常卻沒有 parts。
function readVertexCandidate(data) {
  const cand = data?.candidates?.[0];
  const text = vertexText(cand?.content?.parts);
  const truncated = cand?.finishReason === 'MAX_TOKENS';
  if (text) return { text, truncated };

  const blockReason = data?.promptFeedback?.blockReason;
  const finishReason = cand?.finishReason;
  let emptyReason;
  if (blockReason) emptyReason = blockReason;
  else if (!cand) emptyReason = 'no_candidates';
  else if (finishReason && finishReason !== 'STOP') emptyReason = finishReason;
  else emptyReason = 'no_parts';
  return { text, truncated, emptyReason };
}

// ── 空回應原因（P133）───────────────────────────────────────────────────────
// 供應商回 HTTP 200 但沒有任何可用文字時，唯一能事後定層的線索就是它的 finish/stop/
// block 欄位。這些值是固定枚舉，但仍**不放行原字串**——一律映射到自家 allowlist，
// 未知值收斂成 other，確保任何供應商字串都進不了診斷匯出（比照 diag.js 的 SAFE_CODES）。
const EMPTY_REASONS = new Set([
  'max_tokens', 'safety', 'recitation', 'blocklist', 'prohibited_content',
  'spii', 'malformed_function_call', 'stop', 'end_turn', 'content_filter',
  'no_candidates', 'no_parts', 'no_chunks', 'other', 'unknown',
]);

// 同一件事各家名稱不同，先收斂成同義詞再查 allowlist（OpenAI 的 length ＝ 被
// max_tokens 切斷；Gemini 的 PROHIBITED_CONTENT 與 OpenAI 的 content_filter 同義）。
const REASON_ALIASES = { length: 'max_tokens', model_length: 'max_tokens' };

export function normalizeEmptyReason(raw) {
  const key = String(raw ?? '').trim().toLowerCase();
  if (!key) return 'unknown';
  const canonical = REASON_ALIASES[key] || key;
  return EMPTY_REASONS.has(canonical) ? canonical : 'other';
}

// ── 供應商錯誤代碼擷取（pcode，P134 第三批）─────────────────────────────────
// HTTP 404／429 各自可能是好幾種原因（模型不存在 vs 網址錯；速率上限 vs 配額用完），
// 但這件事只有供應商自己的錯誤代碼欄位答得出來，各家鍵名不同（Google error.status、
// OpenAI error.type／error.code、Anthropic error.type）。刻意不寫死路徑——結構猜錯
// 就整個抓不到，改用鍵名優先序＋深度受限（≤4 層）掃描解析後的錯誤物件，鍵名對得上
// 就用，不管它在物件裡的哪個位置。**絕對不讀 error.message**（自由文字欄位，使用者
// 對話片段可能被供應商原樣夾帶回來）——這裡的候選鍵名清單裡完全沒有 message，
// 結構上就保證讀不到它。
// 優先序：code 必須排在 type 之前。OpenAI 的錯誤同時有 type（籠統的分類桶，如
// invalid_request_error）與 code（具體原因，如 model_not_found／insufficient_quota），
// 而「具體原因」才是這個欄位存在的意義——籠統值答不出「404 是模型還是網址」。
// 其餘 provider 不受影響：Google 由 status 先命中（其 code 是數字 404，本來就會跳過），
// Anthropic 沒有 code 欄位、仍會落到 type。
const PCODE_MAIN_KEYS = ['status', 'code', 'type', 'reason', 'errorType'];
const PCODE_QUOTA_KEYS = ['quotaId', 'quotaMetric', 'quota_metric', 'metric'];
const PCODE_MAX_DEPTH = 4;

// 蒐集 errObj 底下所有「鍵名＋值」，depth 從 1（errObj 自身的鍵）起算，最深到
// PCODE_MAX_DEPTH。只走物件（陣列也是 typeof 'object'，一併掃，Google 的配額細節
// 常包在 details 陣列裡）。
function collectPcodeCandidates(node, depth, out) {
  if (!node || typeof node !== 'object' || depth > PCODE_MAX_DEPTH) return;
  for (const [key, value] of Object.entries(node)) {
    out.push({ key, value });
    if (value && typeof value === 'object') collectPcodeCandidates(value, depth + 1, out);
  }
}

// 依鍵名優先序找第一個「字串值、且通過 sanitizeCode」的候選——數字一律跳過
// （Google 的 error.code 是 HTTP 狀態碼數字 404，error.status 才是 NOT_FOUND；
// 收到數字就代表抓錯欄位，不能把 404 當代碼記進去）。同一個鍵名若有多個符合的
// 節點，取掃描順序中第一個通過清洗的；該鍵名完全沒有可用值才換下一個鍵名。
function findPcode(candidates, keyNames) {
  for (const name of keyNames) {
    for (const { key, value } of candidates) {
      if (key !== name || typeof value !== 'string') continue;
      const cleaned = sanitizeCode(value);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

// errObj：httpError 呼叫端已經剝出來的錯誤子物件（各 provider 分支既有的
// data.error／e.error 等）。抓不到就回 undefined，呼叫端不帶這個欄位。
function extractPcode(errObj) {
  if (!errObj || typeof errObj !== 'object') return undefined;
  const candidates = [];
  collectPcodeCandidates(errObj, 1, candidates);
  const main = findPcode(candidates, PCODE_MAIN_KEYS);
  if (!main) return undefined;
  const quota = findPcode(candidates, PCODE_QUOTA_KEYS);
  return quota ? `${main}/${quota}` : main;
}

// HTTP 錯誤一律帶上狀態碼。供應商的 error.message 多半不含 "HTTP 503" 字樣
// （例：「The model is overloaded. Please try again later.」），diag 的 parseStatus
// 就抓不到、classifyCode 只好塌成 runtime_error——上游超載／認證失敗／配額不足
// 在匯出檔裡長得一模一樣。狀態碼改用例外欄位傳遞，不依賴訊息字串。
// errObj（選填）：供應商回傳的錯誤子物件，用來擷取 pcode；不傳就不帶 pcode。
function httpError(message, status, errObj) {
  const err = new Error(message || `HTTP ${status}`);
  err.status = status;
  const pcode = extractPcode(errObj);
  if (pcode) err.pcode = pcode;
  return err;
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
// 失敗一律記進診斷 ring buffer（provider/model＋HTTP status／錯誤分類）；第三方
// response message 不會保存。使用者主動中斷（AbortError）不算失敗、不記。
// 統一出口：所有 provider、串流與非串流的結果都在這裡剝掉模型的思考區塊（P132）。
// 串流時額外包一層 stateful filter，避免 <thinking> 先閃在畫面上再被清掉。
export async function callLLM(opts) {
  try {
    const filter = opts.stream && opts.onChunk
      ? createThinkingStreamFilter(opts.onChunk)
      : null;
    const inner = filter
      ? { ...opts, onChunk: chunk => filter.push(chunk) }
      : opts;
    const result = await callLLMInner(inner);
    filter?.flush();
    const fullText = stripThinking(result?.fullText);
    // 空回應（HTTP 200 但沒有任何可用文字）在 P133 之前完全不留痕跡：不拋錯 → 進不了
    // 下面的 catch，使用者只看到一句寫死的代理提示，匯出檔裡什麼都沒有。這裡補記原因，
    // 讓「思考佔滿額度／被安全設定擋／被判定為複述」下次一眼可辨。只記枚舉，不記內容。
    // 正規化一次、log 與回傳共用。**回傳值也必須是正規化過的**——各家的原始值大小寫
    // 不一（Vertex 回 'MAX_TOKENS'、OpenAI 回 'length'），UI 端以此值查文案表，
    // 直接回傳原始值會查不到而退回代理提示，等於整個原因驅動的文案沒生效。
    // 附帶效果：值必為 allowlist 內的枚舉，呼叫端拿它查表不會撞到 Object 原型上的鍵。
    if (!fullText || !fullText.trim()) {
      const emptyReason = normalizeEmptyReason(result?.emptyReason);
      logError('llm', 'empty_response', {
        code: 'empty_response',
        provider: opts.provider,
        model: opts.model,
        reason: emptyReason,
      });
      return { ...result, fullText, emptyReason };
    }
    return { ...result, fullText, emptyReason: undefined };
  } catch (e) {
    if (e?.name !== 'AbortError') {
      logError('llm', e, { provider: opts.provider, model: opts.model, status: e?.status, pcode: e?.pcode });
    }
    throw e;
  }
}

async function callLLMInner({
  provider, model, base, apiKey,
  system = '', messages = [],
  maxTokens = 800, temperature = 0.8,
  stream = false, onChunk, onStart, signal,
  image = null, extra = null,
}) {
  // ── Demo/教學模式：攔下所有 AI 呼叫，回假腳本（免金鑰、不外連）──────────────
  // 相容串流與非串流：串流時先 onStart，再把假文字分成小段逐塊吐出，重現打字機效果。
  if (isDemo()) {
    const fullText = demoReply({ system, messages });
    if (stream) {
      onStart?.();
      const chunks = fullText.match(/[\s\S]{1,3}/g) || [fullText];
      for (const c of chunks) {
        onChunk?.(c);
        // 稍微拉開間隔，讓逐字動畫看得出來（不阻塞太久）。
        await new Promise(r => setTimeout(r, 24));
      }
    }
    return { fullText, truncated: false };
  }

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
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw httpError(e.error?.message, r.status, e.error); }
      onStart?.();
      const data = await r.json();
      const { text, ...rest } = readVertexCandidate(data);
      onChunk?.(text);
      return { fullText: text, ...rest };
    }
    const data = await r.json();
    if (!r.ok || data.error) throw httpError(data.error?.message || JSON.stringify(data.error), r.status, data.error);
    const { text, ...rest } = readVertexCandidate(data);
    return { fullText: text, ...rest };
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
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw httpError(e.error?.message, r.status, e.error); }
      onStart?.();
      let fullText = '';
      const { truncated } = await parseSSEStream(r, 'anthropic', (t) => { fullText += t; onChunk?.(t); });
      return { fullText, truncated, emptyReason: fullText ? undefined : 'no_chunks' };
    }
    const data = await r.json();
    const errObj = Array.isArray(data) ? data[0]?.error : data.error;
    if (!r.ok || errObj) throw httpError(errObj?.message || JSON.stringify(errObj), r.status, errObj);
    const text = anthropicText(data.content);
    return {
      fullText: text,
      truncated: data.stop_reason === 'max_tokens',
      emptyReason: text ? undefined : (data.stop_reason || 'no_parts'),
    };
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
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw httpError(d.error?.message, r.status, d.error); }
    onStart?.();
    let fullText = '';
    const { truncated } = await parseSSEStream(r, 'openai', (t) => { fullText += t; onChunk?.(t); });
    // no_chunks＝HTTP 200 但整條 SSE 沒有任何 delta。P60 那個「代理位址打錯、閘道回自己
    // 的 HTML」正是這一種，代理提示文案只在這個原因下才成立。
    return { fullText, truncated, emptyReason: fullText ? undefined : 'no_chunks' };
  }
  const data = await r.json();
  const errObj = Array.isArray(data) ? data[0]?.error : data.error;
  if (!r.ok || errObj) throw httpError(errObj?.message || JSON.stringify(errObj), r.status, errObj);
  // 非串流也要看 finish_reason——P94 只在 SSE 路徑偵測截斷，非串流永遠回 false，
  // 心聲等背景生成被 max_tokens 硬切時呼叫端無從得知、殘句照存。
  const fr = data.choices?.[0]?.finish_reason;
  const text = data.choices?.[0]?.message?.content || '';
  return {
    fullText: text,
    truncated: fr === 'length' || fr === 'max_tokens',
    emptyReason: text ? undefined : (fr || 'no_parts'),
  };
}
