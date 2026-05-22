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
import { ref, computed, onMounted } from 'vue';
import { getSetting, setSetting } from '../services/db.js';

const apiProvider = ref('openai');
const apiModel = ref('gpt-5.4-mini');
const apiKey = ref('');
const apiBase = ref('');
const isTesting = ref(false);
const customModel = ref('');

// Model IDs verified from official docs (2026-05-22)
const MODELS = {
  openai: [
    { id: 'gpt-5.5',      name: 'GPT-5.5',       desc: '最新旗艦，最強（$5/$30/MTok，1M context）' },
    { id: 'gpt-5.4',      name: 'GPT-5.4',        desc: '平衡性能（$2.50/$15/MTok，1M context）' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini',   desc: '推薦：速度快費用低（$0.75/$4.50/MTok）' },
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano',   desc: '最省費，最低延遲' },
    { id: 'gpt-4o',       name: 'GPT-4o',          desc: '前代旗艦，相容性佳' },
    { id: 'gpt-4o-mini',  name: 'GPT-4o mini',     desc: '前代輕量，廣泛相容' },
  ],
  anthropic: [
    { id: 'claude-opus-4-7',          name: 'Claude Opus 4.7',   desc: '最新旗艦，最強推理' },
    { id: 'claude-sonnet-4-6',        name: 'Claude Sonnet 4.6', desc: '推薦：速度與智能兼顧' },
    { id: 'claude-haiku-4-5-20251001',name: 'Claude Haiku 4.5',  desc: '最快最省' },
  ],
  google: [
    { id: 'gemini-3.5-flash',      name: 'Gemini 3.5 Flash',      desc: '最新穩定旗艦，頂尖性能' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', desc: '新一代省費穩定版' },
    { id: 'gemini-2.5-pro',        name: 'Gemini 2.5 Pro',        desc: '複雜任務推薦' },
    { id: 'gemini-2.5-flash',      name: 'Gemini 2.5 Flash',      desc: '速度快，價格平衡' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', desc: '最省費用' },
  ],
};

const availableModels = computed(() => MODELS[apiProvider.value] || MODELS.openai);
const isCustomModel = computed(() => !availableModels.value.find(m => m.id === apiModel.value));

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
  apiBase.value = (await getSetting('api_base')) || '';
  const savedModel = (await getSetting('api_model')) || availableModels.value[0].id;
  if (availableModels.value.find(m => m.id === savedModel)) {
    apiModel.value = savedModel;
  } else {
    apiModel.value = '__custom__';
    customModel.value = savedModel;
  }
});

function onProviderChange() {
  apiModel.value = availableModels.value[0].id;
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
  await setSetting('api_provider', apiProvider.value);
  await setSetting('api_key', apiKey.value);
  await setSetting('api_model', modelToSave);
  await setSetting('api_base', apiBase.value);
  window.toast_('API 設定已儲存！');
}

async function testApi() {
  if (!apiKey.value) {
    window.toast_('請先填寫金鑰');
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
      window.toast_('連線成功！');
    } else {
      const d = await res.json();
      window.toast_('連線失敗：' + (d.error?.message || `HTTP ${res.status}`));
    }
  } catch (err) {
    window.toast_('連線異常：' + err.message);
  } finally {
    isTesting.value = false;
  }
}
</script>
