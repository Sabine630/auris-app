// ── 角色語音：共用型別、輸入驗證與回應防線（批次 A）────────────────────────
//
// 這裡不 import 任何 provider——registry 會 import adapter、adapter 需要這些工具，
// 共用段若放在 registry 就會形成循環 import。本檔只依賴標準 API。

// ── 錯誤型別 ────────────────────────────────────────────────────────────────
// 只帶白名單化的 code，絕不攜帶 response body／headers／URL（§6.2）。
// message 供顯示用，內容由本檔決定，不採用供應商回傳的文字。
export class TtsError extends Error {
  constructor(code, { status = null } = {}) {
    super(code);
    this.name = 'TtsError';
    this.code = code;
    this.status = status;
  }
}

export const TTS_ERROR_TEXT = Object.freeze({
  tts_provider_unsupported: '此裝置尚未支援這個語音服務商',
  tts_key_missing: '尚未設定語音服務的 API Key',
  tts_key_invalid: 'API Key 無效或已被撤銷',
  tts_forbidden: '這把 Key 沒有語音功能的權限',
  tts_rate_limited: '呼叫太頻繁，請稍候再試',
  tts_quota_exceeded: '服務商帳戶額度不足',
  tts_voice_invalid: '聲音 ID 格式不正確',
  tts_text_empty: '沒有可朗讀的文字',
  tts_text_too_long: '文字太長，請分段朗讀',
  tts_response_too_large: '音訊檔案超過大小上限',
  tts_response_not_audio: '服務商回傳的不是可播放的音訊',
  tts_timeout: '連線逾時',
  tts_network: '網路連線失敗',
  tts_failed: '語音產生失敗',
});

export function ttsErrorText(code) {
  return TTS_ERROR_TEXT[code] || TTS_ERROR_TEXT.tts_failed;
}

// ── 輸入驗證 ────────────────────────────────────────────────────────────────
// Voice ID 會被拼進請求路徑。限制長度與字元集，拒絕控制字元、斜線與任何看起來
// 像 URL 的值——否則 `/v1/text-to-speech/<id>` 可被推去打別的路徑或主機。
const VOICE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidVoiceId(voiceId) {
  return typeof voiceId === 'string' && VOICE_ID_RE.test(voiceId);
}

export function assertVoiceId(voiceId) {
  if (!isValidVoiceId(voiceId)) throw new TtsError('tts_voice_invalid');
  return voiceId;
}

// 單次送出的文字上限。超過先由 UI 提示字數與確認，不在服務層偷偷截斷——
// 截斷會讓使用者付了錢卻只聽到半句。
export const MAX_TTS_TEXT_CHARS = 2000;

export function assertText(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) throw new TtsError('tts_text_empty');
  if (t.length > MAX_TTS_TEXT_CHARS) throw new TtsError('tts_text_too_long');
  return t;
}

export function assertApiKey(apiKey) {
  const k = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!k) throw new TtsError('tts_key_missing');
  return k;
}

// ── 音訊回應防線（§6.4）──────────────────────────────────────────────────
// 只認允許的 MIME，且不只相信 Content-Type——再核對檔頭簽章，避免服務商或
// 中間人回傳偽裝成音訊的內容。
export const ALLOWED_AUDIO_MIME = Object.freeze(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']);
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

function startsWith(bytes, sig) {
  return sig.every((b, i) => bytes[i] === b);
}

// MP3：ID3 標頭或 frame sync（0xFF 0xEx/0xFx）；WAV：RIFF....WAVE；OGG：OggS
export function looksLikeAudio(bytes) {
  if (!bytes || bytes.length < 4) return false;
  if (startsWith(bytes, [0x49, 0x44, 0x33])) return true;                       // "ID3"
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true;             // MPEG frame sync
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46])) {                            // "RIFF"
    return bytes.length >= 12 && startsWith(bytes.slice(8, 12), [0x57, 0x41, 0x56, 0x45]); // "WAVE"
  }
  if (startsWith(bytes, [0x4f, 0x67, 0x67, 0x53])) return true;                 // "OggS"
  return false;
}

export function normalizeMime(contentType) {
  return String(contentType || '').split(';')[0].trim().toLowerCase();
}

// 把回應轉成 Blob，同時套用 MIME、大小與簽章三道檢查。任一不過就拋錯且不落庫。
export async function readAudioResponse(response) {
  const mime = normalizeMime(response.headers?.get?.('content-type'));
  if (!ALLOWED_AUDIO_MIME.includes(mime)) throw new TtsError('tts_response_not_audio');

  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > MAX_AUDIO_BYTES) {
    throw new TtsError('tts_response_too_large');
  }

  const buffer = await response.arrayBuffer();
  // Content-Length 可能缺席或說謊，實際大小要再量一次。
  if (buffer.byteLength > MAX_AUDIO_BYTES) throw new TtsError('tts_response_too_large');
  if (!looksLikeAudio(new Uint8Array(buffer.slice(0, 12)))) {
    throw new TtsError('tts_response_not_audio');
  }
  return new Blob([buffer], { type: mime === 'audio/mp3' ? 'audio/mpeg' : mime });
}

// ── HTTP 狀態轉錯誤碼（§6.5：分開處理，不自動無限重試）─────────────────────
export function errorFromStatus(status) {
  if (status === 401) return new TtsError('tts_key_invalid', { status });
  if (status === 403) return new TtsError('tts_forbidden', { status });
  if (status === 429) return new TtsError('tts_rate_limited', { status });
  // ElevenLabs 額度不足回 402；部分方案以 422 表示可用額度不足。
  if (status === 402 || status === 422) return new TtsError('tts_quota_exceeded', { status });
  return new TtsError('tts_failed', { status });
}

// 把底層 fetch 例外轉成安全錯誤。AbortError（呼叫端主動取消）原樣往上拋，
// 讓 UI 分辨「使用者按了取消」與「真的失敗」。
export function normalizeNetworkError(error) {
  if (error instanceof TtsError) return error;
  if (error?.name === 'AbortError') return error;
  if (error?.message === 'request_timeout') return new TtsError('tts_timeout');
  return new TtsError('tts_network');
}

// 只有網路層錯誤可以重試一次；計費狀態不明（4xx／額度／權限）一律不重試，
// 避免使用者被重複扣費（§6.5）。
export function isRetryable(error) {
  return error instanceof TtsError && error.code === 'tts_network';
}
