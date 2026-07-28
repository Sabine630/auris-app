<template>
  <div class="page active" id="pg-voice">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">角色語音</div>
      <div class="ph-act" @click="save" :style="saving ? 'opacity:.5' : ''">{{ saving ? '儲存中' : '儲存' }}</div>
    </div>

    <div class="api-bar" :class="connected ? 'ok' : 'err'" style="margin-top:16px">
      <div class="api-dot"></div>
      <div class="api-bar-text">{{ connected ? `已連接 ElevenLabs・${voices.length} 個聲音` : '尚未連接語音服務' }}</div>
    </div>

    <!-- 費用與資料傳送告知（計畫 §6.6）：在輸入 Key 之前就要看到 -->
    <div class="voice-notice">
      <div class="voice-notice-title">開始前請先了解</div>
      <ul class="voice-notice-list">
        <li><strong>費用由你自己的 ElevenLabs 帳號支付</strong>，Auris 不代收也不代墊。ElevenLabs 依朗讀的字元數計費。</li>
        <li>播放時，<strong>要朗讀的文字</strong>會連同聲音 ID 與語音參數送到 ElevenLabs。其餘對話內容不會送出。</li>
        <li>只有你按下試聽或播放才會產生語音，Auris 不會自動朗讀。</li>
        <li>金鑰、聲音設定只存在這台裝置，<strong>不會進入備份或匯出檔</strong>；換裝置需要重新設定。</li>
      </ul>
    </div>

    <!-- 純前端的金鑰風險揭露（計畫 §6.1）：不得宣稱本機儲存等於完全保密 -->
    <div class="voice-warn">
      <div class="voice-warn-title">⚠️ 關於 API Key 的安全性</div>
      <div class="voice-warn-text">
        Auris 是純前端 App，金鑰存在這台裝置的瀏覽器裡。<strong>這無法達到後端保管的安全性</strong>——瀏覽器擴充套件或惡意程式仍可能讀取。建議你：
        <br>・在 ElevenLabs 另建一把<strong>只有語音權限</strong>的 Key，不要用主帳號的萬用 Key
        <br>・在 ElevenLabs 後台設定<strong>用量或信用額度上限</strong>
        <br>・不使用時用下方的「清除金鑰」移除
      </div>
    </div>

    <div class="form-group" style="margin-top:8px">
      <div class="form-row">
        <div class="form-label">API 金鑰</div>
        <input
          class="form-input" type="password" v-model="keyInput"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
          :placeholder="storedMask ? `已儲存（${storedMask}）` : '貼上 ElevenLabs API Key'">
        <div class="form-hint">
          到 ElevenLabs 後台 → Settings → API Keys 產生。<span v-if="storedMask">已儲存的金鑰不會再顯示；留空即維持原本的金鑰。</span>
        </div>
      </div>

      <div class="form-row">
        <div class="form-label">預設模型</div>
        <select class="form-input" v-model="model" style="cursor:pointer">
          <option value="eleven_flash_v2_5">Flash v2.5（快、便宜）</option>
          <option value="eleven_multilingual_v2">Multilingual v2（品質較佳）</option>
        </select>
        <div class="form-hint">角色可各自覆寫；沒有指定就用這個。</div>
      </div>
    </div>

    <div class="voice-actions">
      <button class="btn-secondary" @click="testConnect" :disabled="busy">
        {{ testing ? '連線中…' : '測試連線並載入聲音' }}
      </button>
      <button v-if="storedMask" class="btn-secondary voice-btn-danger" @click="clearKey" :disabled="busy">清除金鑰</button>
    </div>

    <div v-if="errorText" class="voice-error">{{ errorText }}</div>

    <template v-if="voices.length">
      <div class="sg-label">可用聲音（{{ voices.length }}）</div>
      <div class="voice-list">
        <div class="voice-item" v-for="v in voices" :key="v.voiceId">
          <div class="voice-item-main">
            <div class="voice-item-name">{{ v.name }}</div>
            <div class="voice-item-meta">{{ v.category || '—' }} · {{ v.voiceId }}</div>
          </div>
          <button class="voice-play" @click="preview(v)" :disabled="busy"
            :class="{ active: playingId === v.voiceId }">
            {{ previewingId === v.voiceId ? '產生中…' : (playingId === v.voiceId ? '停止' : '試聽') }}
          </button>
        </div>
      </div>
      <div class="voice-foot">試聽會朗讀一句固定短句「{{ PREVIEW_TEXT }}」，每次都會消耗你的 ElevenLabs 額度。</div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  getTtsConfig, saveTtsConfig, clearTtsKey, maskApiKey,
  testConnection, synthesize, ttsErrorText,
} from '../services/tts/index.js';

const PROVIDER = 'elevenlabs';
const PREVIEW_TEXT = '你回來啦，今天過得還好嗎。';

const keyInput = ref('');
const storedMask = ref('');
const model = ref('eleven_flash_v2_5');
const voices = ref([]);
const connected = ref(false);
const saving = ref(false);
const testing = ref(false);
const previewingId = ref('');
const playingId = ref('');
const errorText = ref('');

// 任一操作進行中就鎖住所有按鈕：連點試聽＝重複扣費（計畫 §6.5）。
const busy = computed(() => saving.value || testing.value || !!previewingId.value);

// 播放資源必須成對釋放：離開畫面若沒 revoke，object URL 會一直佔著 Blob。
let audio = null;
let objectUrl = '';

function releaseAudio() {
  if (audio) {
    audio.pause();
    audio.onended = null;
    audio.onerror = null;
    audio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = '';
  }
  playingId.value = '';
}

// 進行中的請求要能被中斷——離開畫面時不該讓已無人接收的合成繼續跑。
let controller = null;

async function load() {
  const cfg = await getTtsConfig(PROVIDER);
  storedMask.value = maskApiKey(cfg?.apiKey || '');
  model.value = cfg?.model || 'eleven_flash_v2_5';
  connected.value = !!cfg?.lastValidatedAt && !!cfg?.apiKey;
}

function currentKeyPatch() {
  // 留空＝維持原金鑰。輸入框永不回顯完整 Key，所以空字串不能解讀成「清除」。
  const typed = keyInput.value.trim();
  return typed ? { apiKey: typed } : {};
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  errorText.value = '';
  try {
    await saveTtsConfig(PROVIDER, { ...currentKeyPatch(), model: model.value });
    keyInput.value = '';
    await load();
    window.toast_?.('語音設定已儲存');
  } catch (e) {
    errorText.value = ttsErrorText(e?.code);
  } finally {
    saving.value = false;
  }
}

async function testConnect() {
  if (busy.value) return;
  testing.value = true;
  errorText.value = '';
  controller = new AbortController();
  try {
    // 先把當下輸入的 Key 存起來再測，否則使用者得先按儲存才能測。
    await saveTtsConfig(PROVIDER, { ...currentKeyPatch(), model: model.value });
    keyInput.value = '';
    voices.value = await testConnection(PROVIDER, { signal: controller.signal });
    connected.value = true;
    await load();
    window.toast_?.(`連線成功，載入 ${voices.value.length} 個聲音`);
  } catch (e) {
    if (e?.name !== 'AbortError') {
      connected.value = false;
      errorText.value = ttsErrorText(e?.code);
    }
  } finally {
    testing.value = false;
    controller = null;
  }
}

async function preview(voice) {
  if (playingId.value === voice.voiceId) { releaseAudio(); return; }
  if (busy.value) return;

  releaseAudio();
  previewingId.value = voice.voiceId;
  errorText.value = '';
  controller = new AbortController();
  try {
    const blob = await synthesize({
      provider: PROVIDER, voiceId: voice.voiceId, model: model.value,
      text: PREVIEW_TEXT, signal: controller.signal,
    });
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.onended = releaseAudio;
    audio.onerror = () => { errorText.value = ttsErrorText('tts_failed'); releaseAudio(); };
    playingId.value = voice.voiceId;
    await audio.play();
  } catch (e) {
    if (e?.name !== 'AbortError') errorText.value = ttsErrorText(e?.code);
    releaseAudio();
  } finally {
    previewingId.value = '';
    controller = null;
  }
}

async function clearKey() {
  if (busy.value) return;
  if (!(await window.confirm_('清除語音金鑰？角色已選的聲音會保留，但需要重新貼上金鑰才能播放。'))) return;
  releaseAudio();
  await clearTtsKey(PROVIDER);
  voices.value = [];
  connected.value = false;
  keyInput.value = '';
  await load();
  window.toast_?.('已清除語音金鑰');
}

onMounted(load);
onUnmounted(() => {
  controller?.abort();
  releaseAudio();
});
</script>

<style scoped>
.voice-notice, .voice-warn {
  margin: 12px 16px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.65;
}
.voice-notice { background: var(--card); border: 0.5px solid var(--border); color: var(--text-2); }
.voice-notice-title, .voice-warn-title {
  font-size: 12px; font-weight: 500; margin-bottom: 6px; color: var(--text);
}
.voice-notice-list { margin: 0; padding-left: 18px; }
.voice-notice-list li { margin-bottom: 4px; }
.voice-warn { border: 1px solid var(--rose); background: color-mix(in srgb, var(--rose) 8%, transparent); color: var(--text-2); }
.voice-warn-title { color: var(--rose); }

.voice-actions { display: flex; gap: 8px; margin: 4px 16px 0; flex-wrap: wrap; }
.voice-actions .btn-secondary { flex: 1; min-width: 130px; }
.voice-btn-danger { color: var(--red); }

.voice-error {
  margin: 10px 16px 0; padding: 10px 12px; border-radius: 10px;
  background: color-mix(in srgb, var(--red) 10%, transparent);
  color: var(--red); font-size: 12px; line-height: 1.6;
}

.voice-list { margin: 0 16px; }
.voice-item {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 13px; margin-bottom: 8px;
  background: var(--card); border: 0.5px solid var(--border); border-radius: 12px;
}
.voice-item-main { flex: 1; min-width: 0; }
.voice-item-name { font-size: 14px; color: var(--text); }
/* voiceId 可能很長：換行而非撐破容器（驗收要求 320px 無溢位） */
.voice-item-meta {
  font-size: 11px; color: var(--text-3); margin-top: 2px;
  overflow-wrap: anywhere;
}
.voice-play {
  flex-shrink: 0; padding: 7px 13px; border-radius: 999px;
  border: 0.5px solid var(--border); background: transparent;
  color: var(--rose); font-size: 12px; cursor: pointer;
}
.voice-play:disabled { opacity: .45; cursor: default; }
.voice-play.active { background: var(--rose); color: #fff; border-color: var(--rose); }
.voice-foot { margin: 4px 16px 20px; font-size: 11px; color: var(--text-3); line-height: 1.6; }
</style>
