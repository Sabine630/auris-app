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

export async function sendLLMRequest(messages, customConfig = {}) {
  const provider = await getSetting('api_provider');
  const key = await getSetting('api_key');
  let base = await getSetting('api_base');
  const model = await getSetting('api_model') || 'gpt-4o-mini';

  if (!key) throw new Error('API 金鑰未設定');

  // Set default base urls
  if (!base) {
    if (provider === 'openai') base = 'https://api.openai.com/v1';
    else if (provider === 'anthropic') base = 'https://api.anthropic.com/v1';
    else if (provider === 'google') base = 'https://generativelanguage.googleapis.com/v1beta/openai';
  }

  const payload = {
    model,
    messages,
    max_tokens: customConfig.max_tokens || 800,
    temperature: customConfig.temperature || 0.8,
  };

  // 根據 P33 Bug修復：Gemini (google) 不支援 frequency_penalty，因此只有 OpenAI 加入
  if (provider === 'openai') {
    payload.frequency_penalty = customConfig.frequency_penalty || 0.5;
    payload.presence_penalty = customConfig.presence_penalty || 0.2;
  }

  const headers = { 'Content-Type': 'application/json' };
  
  let url = `${base}/chat/completions`;
  
  if (provider === 'anthropic') {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    url = `${base}/messages`;
    // Anthropic API format
    payload.system = messages.find(m => m.role === 'system')?.content || '';
    payload.messages = messages.filter(m => m.role !== 'system');
  } else {
    headers['Authorization'] = `Bearer ${key}`;
  }

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `HTTP Error ${res.status}`);
  }

  if (provider === 'anthropic') {
    return data.content[0].text;
  }
  return data.choices[0].message.content;
}
