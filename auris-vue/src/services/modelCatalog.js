// ── 模型清單（P138）──────────────────────────────────────────────────────────
// 單一來源：內建清單（BUILTIN_MODELS）＋「向供應商動態抓清單」。API 設定頁與 Onboarding
// 共用，不得各自再寫一份。動態抓失敗（離線／CORS／金鑰錯／逾時／格式不對）一律安靜回 null，
// 呼叫端退回內建清單；不拋錯、不 logError（金鑰與 base 不進任何紀錄）。
import { fetchWithTimeout } from './api.js';
import { getDefBase } from './llm.js';
import { isDemo } from './demoMode.js';

// Model IDs verified from official docs (2026-05-22)
export const BUILTIN_MODELS = {
  openai: [
    { id: 'gpt-5.5',      name: 'GPT-5.5',       desc: '最新旗艦，最強（$5/$30/MTok，1M context）' },
    { id: 'gpt-5.4',      name: 'GPT-5.4',        desc: '平衡性能（$2.50/$15/MTok，1M context）' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini',   desc: '推薦：速度快費用低（$0.75/$4.50/MTok）' },
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano',   desc: '最省費，最低延遲' },
    { id: 'gpt-4o',       name: 'GPT-4o',          desc: '前代旗艦，相容性佳' },
    { id: 'gpt-4o-mini',  name: 'GPT-4o mini',     desc: '前代輕量，廣泛相容' },
  ],
  anthropic: [
    { id: 'claude-opus-4-8',  name: 'Claude Opus 4.8',   desc: '最新旗艦，最強推理' },
    { id: 'claude-sonnet-5',  name: 'Claude Sonnet 5',   desc: '推薦：速度與智能兼顧' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5',  desc: '最快最省' },
  ],
  google: [
    { id: 'gemini-3.5-flash',      name: 'Gemini 3.5 Flash',      desc: '最新穩定旗艦，頂尖性能' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', desc: '新一代省費穩定版' },
    { id: 'gemini-2.5-pro',        name: 'Gemini 2.5 Pro',        desc: '複雜任務推薦' },
    { id: 'gemini-2.5-flash',      name: 'Gemini 2.5 Flash',      desc: '速度快，價格平衡' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', desc: '最省費用' },
  ],
  vertex: [
    { id: 'gemini-2.5-pro',        name: 'Gemini 2.5 Pro',        desc: '推薦：最強推理，Vertex AI 支援' },
    { id: 'gemini-2.5-flash',      name: 'Gemini 2.5 Flash',      desc: '速度快，價格平衡' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', desc: '最省費用' },
    { id: 'gemini-2.0-flash',      name: 'Gemini 2.0 Flash',      desc: '穩定版，廣泛相容' },
  ],
  openrouter: [
    { id: 'mistralai/mistral-nemo',               name: 'Mistral Nemo',            desc: '輕量開源，回覆自然' },
    { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'Hermes 3 (405B)',         desc: '推薦：RP 能力強' },
    { id: 'gryphe/mythomax-l2-13b',               name: 'MythoMax L2 13B',         desc: '創作向，老牌 RP 模型' },
    { id: 'anthropic/claude-sonnet-4-6',          name: 'Claude Sonnet 4.6',       desc: '透過 OpenRouter 走 Claude' },
    { id: 'openai/gpt-4o-mini',                   name: 'GPT-4o mini',             desc: '透過 OpenRouter 走 OpenAI' },
  ],
};

export function getBuiltinModels(provider) {
  return BUILTIN_MODELS[provider] || BUILTIN_MODELS.openai;
}

// 動態清單最多顯示幾筆「內建以外」的模型（OpenRouter 動輒數百筆，整串塞進單選清單不堪用；
// 想用清單外的模型走「自訂」）。
export const MAX_EXTRA_MODELS = 60;
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 10 * 60 * 1000;

// ── 非聊天模型過濾 ──────────────────────────────────────────────────────────
// 黑名單：embedding／語音／圖片／影片／審核／即時音訊／純補全舊款。
const NON_CHAT_RE = /embed|tts|whisper|transcribe|speech|voice|dall-?e|image|imagen|veo|sora|video|moderation|guard|rerank|realtime|audio|davinci|babbage|instruct|aqa|robotics|computer-use|-live|native-audio/i;
// 白名單（僅官方預設端點）：官方清單會夾帶大量歷史／微調款，只留各家聊天主力命名。
const OFFICIAL_CHAT_RE = {
  openai: /^(?:gpt-|o\d|chatgpt-)/i,
  anthropic: /^claude-/i,
  google: /^(?:gemini|gemma)/i,
};

// OpenAI 清單會夾帶 chat/completions 端點不能用的款（選了直接失敗）：codex、deep-research、
// *-search*、以及僅 Responses API 可用的 -pro 款（gpt-5-pro、o1-pro、o3-pro…）。
// 只套在 OpenAI 命名（provider=openai 的 gpt-/oN/chatgpt-，或 openrouter 的 openai/ 前綴），
// 不誤擋 gemini-2.5-pro 這類別家的 -pro。（名單依經驗整理，未逐項對照 OpenAI 官方文件查證。）
const OPENAI_NAME_RE = /^(?:openai\/)?(?:gpt-|o\d|chatgpt-|codex)/i;
const OPENAI_NO_CHAT_RE = /codex|deep-research|search|-pro(?:$|-)/i;

function isOpenAiNamed(id, provider) {
  if (provider === 'openai') return OPENAI_NAME_RE.test(id);
  if (provider === 'openrouter') return /^openai\//i.test(id) && OPENAI_NAME_RE.test(id);
  return false;
}

export function isChatModelId(id, provider, { official = false } = {}) {
  if (!id || typeof id !== 'string') return false;
  if (id.startsWith('ft:')) return false;
  if (NON_CHAT_RE.test(id)) return false;
  if (isOpenAiNamed(id, provider) && OPENAI_NO_CHAT_RE.test(id)) return false;
  if (official && OFFICIAL_CHAT_RE[provider] && !OFFICIAL_CHAT_RE[provider].test(id)) return false;
  return true;
}

function stripPrefix(id) {
  return String(id || '').replace(/^models\//, '');
}

function isOfficialBase(provider, base) {
  return String(base || '').replace(/\/+$/, '') === getDefBase(provider).replace(/\/+$/, '');
}

// 把各家回應正規化成 [{ id, name, created }]；格式不符回 null（→ 退回內建）。
export function parseModelListResponse(provider, data, { base } = {}) {
  const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : null;
  if (!arr) return null;
  const official = isOfficialBase(provider, base);
  const out = [];
  const seen = new Set();
  for (const item of arr) {
    const rawId = typeof item === 'string' ? item : item?.id ?? item?.name;
    const id = stripPrefix(rawId);
    if (!isChatModelId(id, provider, { official }) || seen.has(id)) continue;
    // OpenRouter：輸出模態需含文字且不含圖片／音訊（有此欄位才判斷）
    const outMods = item?.architecture?.output_modalities;
    if (Array.isArray(outMods) && (!outMods.includes('text') || outMods.some(m => m === 'image' || m === 'audio'))) continue;
    // Gemini 原生格式若帶 supportedGenerationMethods，需支援 generateContent
    const methods = item?.supportedGenerationMethods;
    if (Array.isArray(methods) && !methods.includes('generateContent')) continue;
    seen.add(id);
    const name = (typeof item?.display_name === 'string' && item.display_name)
      || (provider === 'openrouter' && typeof item?.name === 'string' && item.name)
      || id;
    out.push({ id, name, created: Number(item?.created) || 0 });
  }
  return out;
}

// 合併：內建款（有出現在動態清單者，保留中文說明與順序）→ 其餘動態款 → 使用者目前選的模型
// （無論清單有沒有都保留，不可被洗掉）。動態清單為空／null 時等於內建清單＋已選款。
export function mergeModelList(builtin, fetched, selectedId) {
  const list = [];
  const seen = new Set();
  const push = (m) => { if (!seen.has(m.id)) { seen.add(m.id); list.push(m); } };

  if (Array.isArray(fetched) && fetched.length) {
    const fetchedIds = new Set(fetched.map(m => m.id));
    for (const b of builtin) if (fetchedIds.has(b.id)) push(b);
    const builtinIds = new Set(builtin.map(b => b.id));
    const extras = fetched.filter(m => !builtinIds.has(m.id));
    // 有 created（OpenRouter）就新到舊；否則維持供應商回傳順序（Anthropic 本來就新到舊）
    if (extras.some(m => m.created)) extras.sort((a, b) => (b.created || 0) - (a.created || 0));
    for (const m of extras.slice(0, MAX_EXTRA_MODELS)) {
      push({ id: m.id, name: m.name || m.id, desc: '由供應商清單取得' });
    }
  } else {
    builtin.forEach(push);
  }

  if (selectedId && selectedId !== '__custom__' && !seen.has(selectedId)) {
    const b = builtin.find(m => m.id === selectedId);
    list.unshift(b || { id: selectedId, name: selectedId, desc: '目前使用中的模型' });
  }
  return list;
}

// 金鑰還在輸入中（去空白後不到 20 字元）不發請求，避免每停頓一次就帶半截金鑰打供應商。
export const MIN_KEY_LENGTH = 20;
export function hasPlausibleKey(apiKey) {
  return String(apiKey || '').trim().length >= MIN_KEY_LENGTH;
}

// 組出請求；Vertex 或缺金鑰回 null（維持內建清單）。base 尊重使用者自訂位址。
export function buildModelListRequest(provider, apiKey, apiBase) {
  const key = String(apiKey || '').trim();
  if (!hasPlausibleKey(key) || provider === 'vertex') return null;
  const base = (String(apiBase || '').trim() || getDefBase(provider)).replace(/\/+$/, '');
  if (provider === 'anthropic') {
    return {
      base,
      url: `${base}/models?limit=1000`,
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    };
  }
  return { base, url: `${base}/models`, headers: { Authorization: `Bearer ${key}` } };
}

const _cache = new Map(); // provider|base|key → { at, list }（只在記憶體）

export function clearModelListCache() { _cache.clear(); }

// 回傳 [{id,name,created}]；任何失敗回 null（呼叫端退回內建清單）。
export async function fetchProviderModels({ provider, apiKey, apiBase, signal } = {}) {
  try {
    if (isDemo()) return null;
    const req = buildModelListRequest(provider, apiKey, apiBase);
    if (!req) return null;
    const cacheKey = `${provider}|${req.base}|${req.headers['x-api-key'] || req.headers.Authorization}`;
    const hit = _cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.list;

    const res = await fetchWithTimeout(req.url, { method: 'GET', headers: req.headers, signal }, FETCH_TIMEOUT_MS);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const list = parseModelListResponse(provider, data, { base: req.base });
    if (!list || !list.length) return null;
    _cache.set(cacheKey, { at: Date.now(), list });
    return list;
  } catch {
    return null;
  }
}
