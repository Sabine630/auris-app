// ── 角色語音：服務商註冊表（批次 A）────────────────────────────────────────
//
// View 與上層服務一律只認 provider id，不得自行組裝 URL 或 Authorization header。
// 未註冊的 provider 必須在「發出任何網路請求之前」就被擋下——匯入檔或被竄改的
// 本機設定都可能塞進未知 provider，若等到 adapter 內才檢查，金鑰已經被組進 header。

import elevenlabs from './providers/elevenlabs.js';
import { TtsError } from './ttsShared.js';

const PROVIDERS = new Map([[elevenlabs.id, elevenlabs]]);

export const SUPPORTED_PROVIDERS = Object.freeze([...PROVIDERS.keys()]);

export function isSupportedProvider(id) {
  return typeof id === 'string' && PROVIDERS.has(id);
}

// 供設定頁列出可選服務商；不外流 adapter 本體，避免 View 直接呼叫其網路方法。
export function listProviderInfo() {
  return [...PROVIDERS.values()].map(p => ({
    id: p.id, label: p.label, defaultModel: p.defaultModel, keyHelpUrl: p.keyHelpUrl,
  }));
}

// 取得 adapter。未註冊一律拋 tts_provider_unsupported，呼叫端不得自行 fallback
// 到其他服務商（會把金鑰送去使用者沒有授權的目的地）。
export function getProvider(id) {
  if (!isSupportedProvider(id)) throw new TtsError('tts_provider_unsupported');
  return PROVIDERS.get(id);
}
