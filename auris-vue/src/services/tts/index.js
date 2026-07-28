// ── 角色語音服務層（批次 A）────────────────────────────────────────────────
//
// 上層（設定頁、角色編輯、聊天室）只碰這個檔。金鑰的讀寫、遮罩與清除、
// provider 派發、重試策略都收斂在這裡；View 不得自行組裝請求。
//
// 資料落點：`settings` 的 `tts_providers` 單一 key。它列在 db.js 的
// LOCAL_ONLY_SETTINGS，因此不進備份、匯入時也一律丟棄（§6.2）。

import { getSetting, setSetting } from '../db.js';
import { getProvider, isSupportedProvider } from './providerRegistry.js';
import { TtsError, isRetryable, normalizeNetworkError } from './ttsShared.js';

export const TTS_SETTINGS_KEY = 'tts_providers';

// ── 設定讀寫 ────────────────────────────────────────────────────────────────
// 讀出時逐欄位重建，不直接回傳 localStorage/IndexedDB 內容——該筆資料可能被
// 手動竄改（例如塞入 baseUrl 或未知 provider），不能原樣流進呼叫端。
function sanitizeProviderConfig(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    enabled: raw.enabled === true,
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : '',
    model: typeof raw.model === 'string' ? raw.model : '',
    connectedAt: Number.isFinite(raw.connectedAt) ? raw.connectedAt : 0,
    lastValidatedAt: Number.isFinite(raw.lastValidatedAt) ? raw.lastValidatedAt : 0,
  };
}

export async function loadTtsConfigs() {
  const stored = await getSetting(TTS_SETTINGS_KEY);
  const out = {};
  if (stored && typeof stored === 'object') {
    for (const [id, raw] of Object.entries(stored)) {
      // 未註冊的 provider 直接丟棄——顯示「此裝置尚未支援」由 UI 依 registry 決定，
      // 不把來路不明的設定留在記憶體裡。
      if (!isSupportedProvider(id)) continue;
      const cfg = sanitizeProviderConfig(raw);
      if (cfg) out[id] = cfg;
    }
  }
  return out;
}

export async function getTtsConfig(providerId) {
  const all = await loadTtsConfigs();
  return all[providerId] || null;
}

export async function saveTtsConfig(providerId, patch = {}) {
  if (!isSupportedProvider(providerId)) throw new TtsError('tts_provider_unsupported');
  const all = await loadTtsConfigs();
  const next = sanitizeProviderConfig({ ...(all[providerId] || {}), ...patch });
  await setSetting(TTS_SETTINGS_KEY, { ...all, [providerId]: next });
  return next;
}

// 清除單一服務商的金鑰。設定頁的「清除語音 Key」走這裡（§6.1 要求必須提供）。
export async function clearTtsKey(providerId) {
  const all = await loadTtsConfigs();
  if (!all[providerId]) return;
  const { [providerId]: _removed, ...rest } = all;
  await setSetting(TTS_SETTINGS_KEY, rest);
}

export async function clearAllTtsKeys() {
  await setSetting(TTS_SETTINGS_KEY, {});
}

// UI 永不再次顯示完整 Key（§6.1）。只回尾四碼，且長度不足時整串遮掉。
export function maskApiKey(apiKey) {
  const k = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!k) return '';
  if (k.length <= 8) return '••••••••';
  return `••••••••${k.slice(-4)}`;
}

export async function hasTtsKey(providerId) {
  const cfg = await getTtsConfig(providerId);
  return !!cfg?.apiKey;
}

// ── 網路操作 ────────────────────────────────────────────────────────────────
// 只有網路層錯誤重試一次。401／403／429／額度不足一律不重試：計費狀態不明時
// 重試等於可能重複扣費（§6.5）。
async function withSingleRetry(run) {
  try {
    return await run();
  } catch (error) {
    const normalized = normalizeNetworkError(error);
    if (!isRetryable(normalized)) throw normalized;
    return run().catch(e => { throw normalizeNetworkError(e); });
  }
}

export async function listVoices(providerId, { signal } = {}) {
  const provider = getProvider(providerId);           // 未註冊 → 這裡就拋，不發請求
  const config = await getTtsConfig(providerId);
  provider.validateConfig(config);                    // 沒有 Key → 不送出請求
  return withSingleRetry(() => provider.listVoices(config, { signal }));
}

// 連線測試：成功即更新 lastValidatedAt，供設定頁顯示「已連線」。
export async function testConnection(providerId, { signal } = {}) {
  const voices = await listVoices(providerId, { signal });
  await saveTtsConfig(providerId, { enabled: true, lastValidatedAt: Date.now() });
  return voices;
}

// 進行中的相同請求去重（§6.5：避免連點重複扣費）。key 涵蓋所有影響輸出與
// 計費的因素；同一組參數在前一次尚未完成前，共用同一個 promise。
const inFlight = new Map();

export function pendingRequestCount() {
  return inFlight.size;
}

// 刻意不是 async function：去重必須在**同步**階段完成註冊。若先 await 讀設定再
// 檢查 inFlight，兩次連點會在任一次註冊前都通過檢查，等於各送一次請求、各扣一次
// 費——去重形同虛設（批次 A 測試實際抓到這個缺陷）。
// key 只由呼叫端參數構成，因此不需要等設定讀完就能算出來。
export function synthesize({ provider: providerId, voiceId, model, text, settings, signal } = {}) {
  // 未註冊 provider 一律在發請求前擋下，但要以 rejected promise 回報：介面若時而
  // 同步拋、時而 reject，呼叫端只寫 .catch 就會漏接。
  let provider;
  try {
    provider = getProvider(providerId);
  } catch (error) {
    return Promise.reject(error);
  }

  const key = JSON.stringify([
    providerId, voiceId, model ?? null, text,
    settings?.stability ?? null, settings?.similarity ?? null,
  ]);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const config = await getTtsConfig(providerId);
    provider.validateConfig(config);          // 沒有 Key → 不送出請求
    return withSingleRetry(() => provider.synthesize({
      config, voiceId, model, text, settings, signal,
    }));
  })().finally(() => inFlight.delete(key));

  inFlight.set(key, task);
  return task;
}

export { TtsError } from './ttsShared.js';
export { ttsErrorText, MAX_TTS_TEXT_CHARS, isValidVoiceId } from './ttsShared.js';
export { SUPPORTED_PROVIDERS, isSupportedProvider, listProviderInfo } from './providerRegistry.js';
