<template>
  <div class="page active" id="pg-api">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">API 設定</div>
      <div class="ph-act" @click="saveApi">儲存</div>
    </div>

    <div id="api-status-bar" class="api-bar" :class="hasValidKey ? 'ok' : 'err'" style="margin-top:16px">
      <div class="api-dot"></div>
      <div class="api-bar-text" id="api-bar-msg">{{ hasValidKey ? 'API 金鑰已設定' : '尚未設定 API 金鑰' }}</div>
    </div>

    <div class="form-group" style="margin-top:8px">
      <div class="form-row">
        <div class="form-label">服務商</div>
        <select class="form-input" v-model="apiProvider" @change="onProviderChange" style="cursor:pointer">
          <option value="openai">OpenAI（ChatGPT）</option>
          <option value="anthropic">Anthropic（Claude）</option>
          <option value="google">Google（Gemini）</option>
          <option value="vertex">Google（Vertex AI）</option>
          <option value="openrouter">OpenRouter（多模型）</option>
        </select>
      </div>

      <div class="form-row" v-if="apiProvider !== 'vertex'">
        <div class="form-label">API 金鑰</div>
        <input class="form-input" type="password" v-model="apiKey" placeholder="貼上你的 API 金鑰">
        <div class="form-hint">{{ providerHint }}</div>
      </div>
      <div class="form-row" v-else>
        <div class="form-label">Service Account JSON</div>
        <textarea class="form-input" v-model="apiKey" rows="5" placeholder='貼上 service_account.json 的完整內容…' style="font-size:11px;font-family:monospace;resize:vertical;line-height:1.4"></textarea>
        <div class="form-hint">Google Cloud Console → IAM → 服務帳戶 → 金鑰 → 建立新金鑰 → JSON</div>
        <div class="form-hint" style="color:var(--red);line-height:1.6;margin-top:6px">
          ⚠️ 此 JSON 含一把私鑰，會以明文存在本機瀏覽器。請務必：<br>
          ・該服務帳戶只授予「Vertex AI User」角色，切勿給 Editor／Owner<br>
          ・不要在公用或他人裝置上輸入<br>
          ・若裝置遺失，立即到 GCP Console 刪除這把金鑰
        </div>
      </div>

      <div class="form-row" v-if="apiProvider !== 'vertex'">
        <div class="form-label">自訂 API 位址 <span style="font-size:11px;color:var(--text-3);font-weight:300">選填</span></div>
        <input class="form-input" type="text" v-model="apiBase" :placeholder="defaultBase">
        <div class="form-hint">使用代理服務？填入完整網址，例：<span style="font-family:monospace">https://api.xxx.xyz/v1</span><br>服務商選你使用的模型系列（Claude → Anthropic，GPT → OpenAI），其他不用動。</div>
      </div>
    </div>

    <div class="sg-label">選擇模型<span v-if="modelsLoading" style="font-weight:300;color:var(--text-3)">　載入供應商清單中…</span></div>
    <div class="sg" style="margin-bottom:8px">
      <div id="model-list">
        <div v-for="m in availableModels" :key="m.id" class="model-opt" :class="{ sel: apiModel === m.id }" @click="apiModel = m.id; customModel = ''">
          <div class="m-radio" :class="{ sel: apiModel === m.id }"><div class="m-radio-in"></div></div>
          <div>
            <div style="font-size:13px;font-weight:400;color:var(--text)">{{ m.name }}</div>
            <div style="font-size:11px;font-weight:300;color:var(--text-3);margin-top:2px">{{ m.desc }}</div>
          </div>
        </div>
        <div class="model-opt" :class="{ sel: apiModel === '__custom__' }" @click="apiModel = '__custom__'">
          <div class="m-radio" :class="{ sel: apiModel === '__custom__' }"><div class="m-radio-in"></div></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:400;color:var(--text)">自訂模型</div>
            <div style="font-size:11px;font-weight:300;color:var(--text-3);margin-top:2px">適用代理伺服器或其他模型</div>
            <input v-if="apiModel === '__custom__'" class="form-input" type="text" v-model="customModel" placeholder="輸入模型 ID，例如 gpt-4o" style="margin-top:8px" @input="applyCustomModel">
          </div>
        </div>
      </div>
    </div>

    <button class="btn-primary" @click="testApi" :disabled="isTesting" style="margin-top:8px">{{ isTesting ? '測試中...' : '測試連線' }}</button>
    <button class="btn-secondary" @click="saveApi">儲存設定</button>
    <div style="height:32px"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { getSetting, setSetting } from '../services/db.js';
import { fetchWithTimeout, getVertexToken } from '../services/api.js';
import { describeConnectionFailure } from '../services/connectionError.js';
import { getBuiltinModels } from '../services/modelCatalog.js';
import { useModelList } from '../composables/useModelList.js';

const apiProvider = ref('openai');
const apiModel = ref('gpt-5.4-mini');
const apiKey = ref('');
const apiBase = ref('');
const isTesting = ref(false);
const customModel = ref('');

// 模型清單：內建清單在 services/modelCatalog.js（單一來源）；有金鑰時另向供應商動態抓，
// 抓不到安靜退回內建，已選模型不會被洗掉（P138）。
const { models: availableModels, loading: modelsLoading } = useModelList({
  provider: () => apiProvider.value,
  apiKey: () => apiKey.value,
  apiBase: () => apiBase.value,
  selected: () => apiModel.value,
});

// 動態清單抵達後，若先前因「不在內建清單」而落到自訂、且該 ID 其實在清單內，改回選清單項目。
watch(availableModels, (list) => {
  if (apiModel.value !== '__custom__') return;
  const v = customModel.value.trim();
  if (v && list.some(m => m.id === v)) { apiModel.value = v; customModel.value = ''; }
});

const hasValidKey = computed(() => {
  if (apiProvider.value === 'vertex') {
    try { const p = JSON.parse(apiKey.value); return !!(p.project_id && p.private_key); }
    catch { return false; }
  }
  return !!apiKey.value;
});

const providerHint = computed(() => {
  if (apiProvider.value === 'anthropic') return '前往 console.anthropic.com 申請，格式：sk-ant-…';
  if (apiProvider.value === 'google') return '前往 aistudio.google.com 申請';
  if (apiProvider.value === 'openrouter') return '前往 openrouter.ai 申請，格式：sk-or-…';
  return '前往 platform.openai.com 申請，格式：sk-…';
});

const defaultBase = computed(() => {
  if (apiProvider.value === 'anthropic') return 'https://api.anthropic.com/v1';
  if (apiProvider.value === 'google') return 'https://generativelanguage.googleapis.com/v1beta/openai';
  if (apiProvider.value === 'openrouter') return 'https://openrouter.ai/api/v1';
  return 'https://api.openai.com/v1';
});

onMounted(async () => {
  apiProvider.value = (await getSetting('api_provider')) || 'openai';
  apiKey.value = (await getSetting('api_key')) || '';
  apiBase.value = (await getSetting('api_base')) || '';
  const builtin = getBuiltinModels(apiProvider.value);
  const savedModel = (await getSetting('api_model')) || builtin[0].id;
  if (builtin.find(m => m.id === savedModel)) {
    apiModel.value = savedModel;
  } else {
    apiModel.value = '__custom__';
    customModel.value = savedModel;
  }
});

function onProviderChange() {
  apiModel.value = getBuiltinModels(apiProvider.value)[0].id;
  customModel.value = '';
  apiBase.value = '';
}

function applyCustomModel() {
  const v = customModel.value.trim();
  if (v) apiModel.value = '__custom__';
}

async function saveApi() {
  const modelToSave = apiModel.value === '__custom__' ? customModel.value.trim() : apiModel.value;
  if (apiModel.value === '__custom__' && !modelToSave) {
    window.toast_('請填寫自訂模型 ID');
    return;
  }
  if (apiProvider.value === 'vertex') {
    try { JSON.parse(apiKey.value); }
    catch { window.toast_('JSON 格式有誤，請重新貼上'); return; }
  }
  await setSetting('api_provider', apiProvider.value);
  await setSetting('api_key', apiKey.value);
  await setSetting('api_model', modelToSave);
  await setSetting('api_base', apiBase.value);
  window.toast_('API 設定已儲存！');
}

// 判斷回應是否「長得像」合法的聊天/生成回應——用來識破「位址打錯時代理回 200 + HTML 網頁」的假成功
function looksLikeChatResponse(data) {
  if (!data || typeof data !== 'object' || data.error) return false;
  if (Array.isArray(data.choices) && data.choices.length) return true;       // OpenAI 相容
  if (Array.isArray(data.content) && data.content.length) return true;       // Anthropic 原生
  if (Array.isArray(data.candidates) && data.candidates.length) return true; // Vertex / Gemini 原生
  return false;
}

function describeBadOkBody(data) {
  if (!data) return '位址或端點不正確：伺服器回的是一個網頁而不是 API 回應，請確認自訂網址（需以 /v1 結尾、且不要多餘字元，例如別打成 /v.1）';
  if (data.error) return data.error.message || data.error.status || JSON.stringify(data.error);
  return '伺服器有回應但格式不是預期的聊天回應，請確認自訂網址與模型 ID 是否正確';
}

// 使用者是否真的填了自訂網址（去尾斜線比較；空字串一律視為沒自訂）。
function isUsingCustomBase(base, defBase) {
  const trimmed = String(base ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return false;
  return trimmed !== String(defBase ?? '').replace(/\/+$/, '');
}

async function testApi() {
  if (!apiKey.value) {
    window.toast_('請先填寫金鑰');
    return;
  }
  isTesting.value = true;
  try {
    const headers = { 'Content-Type': 'application/json' };
    let url;

    if (apiProvider.value === 'vertex') {
      const sa = JSON.parse(apiKey.value);
      const token = await getVertexToken(sa);
      const region = 'us-central1';
      const modelId = apiModel.value === '__custom__' ? customModel.value.trim() : apiModel.value;
      url = `https://${region}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${region}/publishers/google/models/${modelId}:generateContent`;
      headers['Authorization'] = `Bearer ${token}`;

      const res = await fetchWithTimeout(url, {
        method: 'POST', headers,
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 16 } })
      }, 15000);
      const text = await res.text().catch(() => '');
      let data = null; try { data = JSON.parse(text); } catch { /* 非 JSON */ }
      if (res.ok && looksLikeChatResponse(data)) {
        window.toast_('連線成功！');
      } else if (res.ok) {
        window.toast_('連線失敗：' + describeBadOkBody(data), 6000);
      } else {
        let raw = `HTTP ${res.status}`;
        if (data) raw = data.error?.message || data.error?.status || raw; else raw = text.slice(0, 120) || raw;
        // Vertex 的網址是程式自己組出來的（project/region/model 拼字串），不是使用者填的，
        // 也不是「自訂網址／預設網址」二選一——404 可能是 project_id 錯，baseKind 標成
        // app-built，讓 describeConnectionFailure 沒點名模型時原樣回傳供應商訊息。
        const friendly = describeConnectionFailure({ status: res.status, raw, data, modelId, baseKind: 'app-built' });
        window.toast_('連線失敗：' + friendly, 6000);
      }
      return;
    } else if (apiProvider.value === 'anthropic') {
      const base = apiBase.value || defaultBase.value;
      url = `${base}/messages`;
      headers['x-api-key'] = apiKey.value;
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    } else {
      const base = apiBase.value || defaultBase.value;
      url = `${base}/chat/completions`;
      headers['Authorization'] = `Bearer ${apiKey.value}`;
    }

    const modelId = apiModel.value === '__custom__' ? customModel.value.trim() : apiModel.value;
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: modelId, max_tokens: 16, messages: [{ role: 'user', content: 'hi' }] })
    }, 15000);

    const text = await res.text().catch(() => '');
    let data = null; try { data = JSON.parse(text); } catch { /* 非 JSON，多半是位址打錯回了 HTML */ }

    if (res.ok && looksLikeChatResponse(data)) {
      window.toast_('連線成功！');
    } else if (res.ok) {
      // HTTP 200 但內容不是合法聊天回應（最常見：位址打錯，代理回了網頁；或回了 error 物件）
      window.toast_('連線失敗：' + describeBadOkBody(data), 6000);
    } else {
      let raw = `HTTP ${res.status}`;
      if (data) raw = data.error?.message || data.error?.status || JSON.stringify(data.error) || raw;
      else raw = text.slice(0, 120) || raw;
      const baseKind = isUsingCustomBase(apiBase.value, defaultBase.value) ? 'custom' : 'default';
      const friendly = describeConnectionFailure({ status: res.status, raw, data, modelId, baseKind });
      window.toast_('連線失敗：' + friendly, 6000);
    }
  } catch (err) {
    const msg = err.message || '';
    let friendly = '連線異常，請確認網路與 API 位址是否正確';
    if (msg.includes('timeout') || msg.includes('request_timeout')) friendly = '連線逾時，請確認網路狀態或 API 位址';
    else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) friendly = '無法連線，請確認網路與 API 位址是否正確';
    window.toast_(friendly, 6000);
  } finally {
    isTesting.value = false;
  }
}
</script>
