<template>
  <div class="page active" id="pg-api">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/settings')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">API 設定</div>
      <div class="ph-act" @click="saveApi">儲存</div>
    </div>
    
    <div id="api-status-bar" class="api-bar" :class="apiKey ? 'ok' : 'err'" style="margin-top:16px">
      <div class="api-dot"></div>
      <div class="api-bar-text" id="api-bar-msg">{{ apiKey ? 'API 金鑰已設定' : '尚未設定 API 金鑰' }}</div>
    </div>
    
    <div class="form-group" style="margin-top:8px">
      <div class="form-row">
        <div class="form-label">服務商</div>
        <select class="form-input" v-model="apiProvider" @change="onProviderChange" style="cursor:pointer">
          <option value="openai">OpenAI（ChatGPT）</option>
          <option value="anthropic">Anthropic（Claude）</option>
          <option value="google">Google（Gemini）</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-label">API 金鑰</div>
        <input class="form-input" type="password" v-model="apiKey" placeholder="貼上你的 API 金鑰">
        <div class="form-hint">{{ providerHint }}</div>
      </div>
      <div class="form-row">
        <div class="form-label">自訂 API 位址 <span style="font-size:11px;color:var(--text-3);font-weight:300">選填</span></div>
        <input class="form-input" type="text" v-model="apiBase" :placeholder="defaultBase">
        <div class="form-hint">使用代理或自架服務才需要填</div>
      </div>
    </div>
    
    <div class="sg-label">選擇模型</div>
    <div class="sg" style="margin-bottom:8px">
      <div id="model-list" style="padding:14px 16px">
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <div v-for="m in availableModels" :key="m" class="opt-btn" :class="{ sel: apiModel === m }" @click="apiModel = m">{{ m }}</div>
        </div>
      </div>
    </div>
    
    <button class="btn-primary" @click="testApi" :disabled="isTesting" style="margin-top:8px">{{ isTesting ? '測試中...' : '測試連線' }}</button>
    <button class="btn-secondary" @click="saveApi">儲存設定</button>
    <div style="height:32px"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getSetting, setSetting } from '../services/db.js';

const apiProvider = ref('openai');
const apiModel = ref('gpt-4o-mini');
const apiKey = ref('');
const apiBase = ref('');
const isTesting = ref(false);

const availableModels = computed(() => {
  if (apiProvider.value === 'anthropic') return ['claude-3-5-sonnet-20240620', 'claude-3-haiku-20240307'];
  if (apiProvider.value === 'google') return ['gemini-1.5-flash', 'gemini-1.5-pro'];
  return ['gpt-4o-mini', 'gpt-4o'];
});

const providerHint = computed(() => {
  if (apiProvider.value === 'anthropic') return '前往 console.anthropic.com 申請';
  if (apiProvider.value === 'google') return '前往 aistudio.google.com 申請';
  return '前往 platform.openai.com 申請，格式：sk-…';
});

const defaultBase = computed(() => {
  if (apiProvider.value === 'anthropic') return 'https://api.anthropic.com/v1';
  if (apiProvider.value === 'google') return 'https://generativelanguage.googleapis.com/v1beta/openai';
  return 'https://api.openai.com/v1';
});

onMounted(async () => {
  apiProvider.value = (await getSetting('api_provider')) || 'openai';
  apiKey.value = (await getSetting('api_key')) || '';
  apiModel.value = (await getSetting('api_model')) || availableModels.value[0];
  apiBase.value = (await getSetting('api_base')) || '';
});

function onProviderChange() {
  apiModel.value = availableModels.value[0];
  apiBase.value = '';
}

async function saveApi() {
  await setSetting('api_provider', apiProvider.value);
  await setSetting('api_key', apiKey.value);
  await setSetting('api_model', apiModel.value);
  await setSetting('api_base', apiBase.value);
  alert('API 設定已儲存！');
}

async function testApi() {
  if (!apiKey.value) {
    alert('請先填寫金鑰');
    return;
  }
  isTesting.value = true;
  try {
    const { fetchWithTimeout } = await import('../services/api.js');
    const base = apiBase.value || defaultBase.value;
    const isAnt = apiProvider.value === 'anthropic';
    const url = isAnt ? `${base}/messages` : `${base}/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    
    if (isAnt) {
      headers['x-api-key'] = apiKey.value;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${apiKey.value}`;
    }

    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: apiModel.value,
        max_tokens: 10,
        messages: [{role: 'user', content: 'hi'}]
      })
    }, 10000);

    if (res.ok) {
      alert('連線成功！');
    } else {
      const d = await res.json();
      alert('連線失敗：' + (d.error?.message || `HTTP ${res.status}`));
    }
  } catch (err) {
    alert('連線異常：' + err.message);
  } finally {
    isTesting.value = false;
  }
}
</script>
