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
      <div id="model-list">
        <div v-for="m in availableModels" :key="m.id" class="model-opt" :class="{ sel: apiModel === m.id }" @click="apiModel = m.id">
          <div class="m-radio" :class="{ sel: apiModel === m.id }"><div class="m-radio-in"></div></div>
          <div>
            <div style="font-size:13px;font-weight:400;color:var(--text)">{{ m.name }}</div>
            <div style="font-size:11px;font-weight:300;color:var(--text-3);margin-top:2px">{{ m.desc }}</div>
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
import { ref, computed, onMounted } from 'vue';
import { getSetting, setSetting } from '../services/db.js';

const apiProvider = ref('openai');
const apiModel = ref('gpt-5.4-mini');
const apiKey = ref('');
const apiBase = ref('');
const isTesting = ref(false);

const MODELS = {
  openai: [
    { id: 'gpt-5.5',     name: 'GPT-5.5',          desc: '最新旗艦，最強' },
    { id: 'gpt-5.4',     name: 'GPT-5.4',           desc: '專業工作推薦' },
    { id: 'gpt-5.4-mini',name: 'GPT-5.4 mini',      desc: '速度快，費用低，推薦' },
    { id: 'gpt-4o',      name: 'GPT-4o',            desc: '舊版旗艦，仍可用' },
  ],
  anthropic: [
    { id: 'claude-opus-4-7',          name: 'Claude Opus 4.7',   desc: '最新旗艦' },
    { id: 'claude-opus-4-6',          name: 'Claude Opus 4.6',   desc: '推薦，穩定' },
    { id: 'claude-sonnet-4-6',        name: 'Claude Sonnet 4.6', desc: '推薦日常使用' },
    { id: 'claude-haiku-4-5-20251001',name: 'Claude Haiku 4.5',  desc: '最快最省' },
  ],
  google: [
    { id: 'gemini-2.5-flash',       name: 'Gemini 2.5 Flash',      desc: '推薦，快速穩定' },
    { id: 'gemini-2.5-flash-lite',  name: 'Gemini 2.5 Flash-Lite', desc: '最快最省' },
    { id: 'gemini-2.5-pro',         name: 'Gemini 2.5 Pro',        desc: '複雜任務' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash（預覽）', desc: '最新前沿性能' },
  ],
};

const availableModels = computed(() => MODELS[apiProvider.value] || MODELS.openai);

const providerHint = computed(() => {
  if (apiProvider.value === 'anthropic') return '前往 console.anthropic.com 申請，格式：sk-ant-…';
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
  apiModel.value = (await getSetting('api_model')) || availableModels.value[0].id;
  apiBase.value = (await getSetting('api_base')) || '';
});

function onProviderChange() {
  apiModel.value = availableModels.value[0].id;
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
