import { callLLM, resolveLLMConfig } from './llm.js';

export async function fetchWithTimeout(url, opts = {}, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // 合併呼叫端自帶的 signal（例如可手動中斷的主動訊息串流）：逾時或外部 abort 任一觸發都中斷請求。
  const ext = opts.signal;
  if (ext) {
    if (ext.aborted) controller.abort();
    else ext.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const { signal: _ext, ...rest } = opts;
  return fetch(url, { ...rest, signal: controller.signal })
    .finally(() => clearTimeout(timer))
    .catch((e) => {
      if (e.name === 'AbortError') {
        // 外部主動中斷 → 保留 AbortError 讓上層辨識（auto-interrupt）；逾時 → request_timeout
        if (ext && ext.aborted) throw e;
        throw new Error('request_timeout');
      }
      throw e;
    });
}

// Vertex AI: OAuth2 token cache
let _vtok = null, _vtokExp = 0;

function _b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function getVertexToken(sa) {
  const saObj = typeof sa === 'string' ? JSON.parse(sa) : sa;
  if (_vtok && Date.now() < _vtokExp) return _vtok;

  const now = Math.floor(Date.now() / 1000);
  const header = _b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = _b64url(new TextEncoder().encode(JSON.stringify({
    iss: saObj.client_email,
    sub: saObj.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    iat: now, exp: now + 3600
  })));

  const pemKey = saObj.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const keyBytes = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sigInput = `${header}.${payload}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(sigInput));
  const jwt = `${sigInput}.${_b64url(sig)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Vertex token 取得失敗：' + (data.error_description || data.error || JSON.stringify(data)));

  _vtok = data.access_token;
  _vtokExp = Date.now() + 3500000;
  return _vtok;
}

// 各 provider 未設定 api_model 時的預設款（僅在 onboarding/設定頁未寫入時作為保底）。
// 皆為當下該家「中階主力、非 preview」的現行模型；provider 值：openai/anthropic/google/openrouter/vertex。
export function getDefModel(provider) {
  if (provider === 'anthropic') return 'claude-sonnet-5';
  if (provider === 'google') return 'gemini-3.5-flash';
  if (provider === 'vertex') return 'gemini-2.5-flash';   // Vertex 上以 2.5 為穩定可用款
  if (provider === 'openrouter') return 'openai/gpt-4o-mini';
  return 'gpt-5.4-mini';
}

// GPT-5 系列與 o 系列是「推理型」模型：只接受 temperature 預設值(1)，並會拒絕 frequency/presence_penalty。
// 對這些模型一律不送取樣參數（送了會 400）。用模型名判斷即可，跨 provider 通用（含 openrouter 的 openai/ 前綴）。
export function isReasoningModel(model) {
  return /(?:^|\/)(?:gpt-5|o[1-9])/i.test(model || '');
}

// 非串流一次性請求的薄包裝（貼文/日記/心聲/摘要/背景主動訊息等走這裡）。
// provider 分支已全數收斂進 llm.js 的 callLLM；此處只負責拆 system 訊息與帶入預設取樣參數。
export async function sendLLMRequest(messages, customConfig = {}) {
  const config = await resolveLLMConfig();
  if (!config.apiKey) throw new Error('API 金鑰未設定');

  const sysMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');

  const { fullText } = await callLLM({
    ...config,
    system: sysMsg?.content || '',
    messages: chatMsgs,
    maxTokens: customConfig.max_tokens ?? 800,
    temperature: customConfig.temperature ?? 0.8,
    stream: false,
    // openai 非推理型沿用固定 penalty 預設（callLLM 內只在 provider==='openai' 時帶上）
    extra: {
      frequency_penalty: customConfig.frequency_penalty ?? 0.5,
      presence_penalty: customConfig.presence_penalty ?? 0.2,
    },
  });
  return fullText;
}
