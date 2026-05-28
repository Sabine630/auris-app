import { getSetting } from './db.js';

export async function fetchWithTimeout(url, opts = {}, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal })
    .finally(() => clearTimeout(timer))
    .catch((e) => {
      if (e.name === 'AbortError') throw new Error('request_timeout');
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

export async function sendLLMRequest(messages, customConfig = {}) {
  const provider = await getSetting('api_provider');
  const key = await getSetting('api_key');
  let base = await getSetting('api_base');
  const model = await getSetting('api_model') || 'gpt-4o-mini';

  if (!key) throw new Error('API 金鑰未設定');

  const headers = { 'Content-Type': 'application/json' };

  // Vertex AI 走原生格式（contents/parts），與 SillyTavern 相同
  if (provider === 'vertex') {
    const sa = JSON.parse(key);
    const token = await getVertexToken(sa);
    const region = 'us-central1';
    const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${region}/publishers/google/models/${model}:generateContent`;
    headers['Authorization'] = `Bearer ${token}`;

    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system');
    const body = {
      contents: chatMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        maxOutputTokens: customConfig.max_tokens || 800,
        temperature: customConfig.temperature || 0.8
      }
    };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

    const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || JSON.stringify(data.error) || `HTTP Error ${res.status}`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // OpenAI 相容格式（OpenAI / Anthropic / Google AI Studio）
  const payload = {
    model,
    messages,
    max_tokens: customConfig.max_tokens || 800,
    temperature: customConfig.temperature || 0.8,
  };

  let url;
  if (provider === 'anthropic') {
    if (!base) base = 'https://api.anthropic.com/v1';
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    url = `${base}/messages`;
    payload.system = messages.find(m => m.role === 'system')?.content || '';
    payload.messages = messages.filter(m => m.role !== 'system');
  } else {
    if (!base) {
      if (provider === 'openai') base = 'https://api.openai.com/v1';
      else base = 'https://generativelanguage.googleapis.com/v1beta/openai';
    }
    headers['Authorization'] = `Bearer ${key}`;
    url = `${base}/chat/completions`;
    if (provider === 'openai') {
      payload.frequency_penalty = customConfig.frequency_penalty || 0.5;
      payload.presence_penalty = customConfig.presence_penalty || 0.2;
    }
  }

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  const errObj = Array.isArray(data) ? data[0]?.error : data.error;
  if (!res.ok || errObj) {
    throw new Error(errObj?.message || JSON.stringify(errObj) || `HTTP Error ${res.status}`);
  }

  if (provider === 'anthropic') {
    return data.content?.[0]?.text || '';
  }
  return data.choices?.[0]?.message?.content || '';
}
