// ── ElevenLabs adapter（批次 A）────────────────────────────────────────────
//
// 這是唯一組裝 ElevenLabs URL 與 header 的地方。origin 硬編碼，首期不提供
// Custom Base URL：可自訂端點等於「使用者的金鑰可被匯入檔或釣魚設定導去偽造
// 主機」，純前端沒有其他辦法擋。
//
// 注意 import 方向：本檔不得 import providerRegistry.js（registry 會 import 本檔，
// 形成循環）。共用的驗證與錯誤工具放在 ttsShared.js。

import { fetchWithTimeout } from '../../api.js';
import {
  TtsError, assertApiKey, assertText, assertVoiceId,
  errorFromStatus, normalizeNetworkError, readAudioResponse,
} from '../ttsShared.js';

const ORIGIN = 'https://api.elevenlabs.io';
const LIST_TIMEOUT_MS = 20000;
const SYNTH_TIMEOUT_MS = 45000;

export const DEFAULT_MODEL = 'eleven_flash_v2_5';

// 模型 id 也會進 request body，同樣限制字元集，不接受任意字串。
const MODEL_RE = /^[a-z0-9_.-]{1,64}$/i;

function safeModel(model) {
  const m = typeof model === 'string' ? model.trim() : '';
  return MODEL_RE.test(m) ? m : DEFAULT_MODEL;
}

function headers(apiKey) {
  return { 'xi-api-key': apiKey, 'Content-Type': 'application/json' };
}

// 供應商回傳的 voice 物件只取需要的欄位，且 name 一律轉字串後截斷——
// 它會顯示在設定頁，不得挾帶超長內容或非字串型別（顯示端一律用文字插值，不用 v-html）。
function pickVoice(raw) {
  const voiceId = raw?.voice_id;
  if (typeof voiceId !== 'string') return null;
  return {
    voiceId,
    name: String(raw?.name ?? '').slice(0, 80) || voiceId,
    category: String(raw?.category ?? '').slice(0, 40),
    previewUrl: typeof raw?.preview_url === 'string' && raw.preview_url.startsWith(`${ORIGIN}/`)
      ? raw.preview_url
      : '',   // 只接受官方 origin 的試聽連結，其餘丟棄，避免變成追蹤像素
  };
}

const elevenlabs = {
  id: 'elevenlabs',
  label: 'ElevenLabs',
  defaultModel: DEFAULT_MODEL,
  // 設定頁用：讓使用者知道去哪裡拿 Key、以及該給什麼權限。
  keyHelpUrl: 'https://elevenlabs.io/app/settings/api-keys',

  validateConfig(config) {
    assertApiKey(config?.apiKey);
    return true;
  },

  async listVoices(config, { signal } = {}) {
    const apiKey = assertApiKey(config?.apiKey);
    let response;
    try {
      response = await fetchWithTimeout(`${ORIGIN}/v1/voices`, {
        method: 'GET', headers: headers(apiKey), signal,
      }, LIST_TIMEOUT_MS);
    } catch (error) {
      throw normalizeNetworkError(error);
    }
    if (!response.ok) throw errorFromStatus(response.status);

    let data;
    try {
      data = await response.json();
    } catch {
      throw new TtsError('tts_failed');
    }
    const rows = Array.isArray(data?.voices) ? data.voices : [];
    return rows.map(pickVoice).filter(Boolean);
  },

  async synthesize({ config, voiceId, model, text, settings, signal } = {}) {
    const apiKey = assertApiKey(config?.apiKey);
    const id = assertVoiceId(voiceId);
    const body = {
      text: assertText(text),
      model_id: safeModel(model || config?.model),
    };
    // 只放行已知的語音參數，且限制在合法範圍——整包 settings 直傳等於讓匯入
    // 資料決定 request body 的形狀。
    const stability = Number(settings?.stability);
    const similarity = Number(settings?.similarity);
    const voiceSettings = {};
    if (Number.isFinite(stability)) voiceSettings.stability = Math.min(1, Math.max(0, stability));
    if (Number.isFinite(similarity)) voiceSettings.similarity_boost = Math.min(1, Math.max(0, similarity));
    if (Object.keys(voiceSettings).length) body.voice_settings = voiceSettings;

    let response;
    try {
      // encodeURIComponent 是第二道防線；assertVoiceId 已排除斜線與控制字元。
      response = await fetchWithTimeout(
        `${ORIGIN}/v1/text-to-speech/${encodeURIComponent(id)}`,
        { method: 'POST', headers: headers(apiKey), body: JSON.stringify(body), signal },
        SYNTH_TIMEOUT_MS,
      );
    } catch (error) {
      throw normalizeNetworkError(error);
    }
    if (!response.ok) throw errorFromStatus(response.status);
    return readAudioResponse(response);
  },
};

export default elevenlabs;
