<template>
  <div class="page active" id="pg-settings">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/')">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg> 返回
      </div>
      <div class="ph-title">設定</div>
      <div class="ph-act"></div>
    </div>
    
    <div style="padding-bottom: 60px;">
      <!-- Stats -->
      <div class="s-card" style="margin-top:16px">
        <div class="s-row">
          <div class="s-row-ic"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
          <div class="s-row-name">所有角色</div>
          <div class="s-row-val">{{ globalStore.characters.length }} 個角色</div>
        </div>
      </div>

      <!-- Theme -->
      <div class="sec-label" style="margin-top:24px">主題風格</div>
      <div class="theme-picker">
        <div v-for="t in themes" :key="t.id" class="theme-opt" :class="{ sel: globalStore.theme === t.id }" @click="applyTheme(t.id)">
          <div class="theme-preview" :style="{ background: t.bg }">
            <div class="theme-preview-dot" :style="{ background: t.rose }"></div>
            <div class="theme-preview-dot" :style="{ background: t.text, opacity: 0.3 }"></div>
            <div class="theme-preview-dot" :style="{ background: t.surface, border: '1px solid rgba(0,0,0,.08)' }"></div>
          </div>
          <div class="theme-name">{{ t.name }}</div>
        </div>
      </div>

      <!-- API Settings -->
      <div class="sec-label" style="margin-top:24px">連線設定 (API)</div>
      <div class="s-card">
        <div class="api-bar" :class="apiKey ? 'ok' : 'err'">
          <div class="api-bar-ic">
            <svg v-if="apiKey" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else viewBox="0 0 24 24"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div class="api-bar-msg">{{ apiKey ? 'API 金鑰已設定' : '尚未設定 API 金鑰' }}</div>
        </div>

        <div style="margin-top:16px">
          <div class="form-label">服務商</div>
          <select class="form-input" v-model="apiProvider" @change="onProviderChange">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="google">Google (Gemini)</option>
          </select>
          <div class="form-hint" style="margin-top:4px;margin-bottom:12px">{{ providerHint }}</div>

          <div class="form-label">模型</div>
          <div class="model-opt-group">
            <div v-for="m in availableModels" :key="m" class="opt-btn" :class="{ sel: apiModel === m }" @click="apiModel = m">{{ m }}</div>
          </div>

          <div class="form-label" style="margin-top:12px">API 金鑰</div>
          <input class="form-input" type="password" v-model="apiKey" placeholder="sk-...">

          <div class="form-label" style="margin-top:12px">自訂節點 (Proxy Base URL) - 選填</div>
          <input class="form-input" type="text" v-model="apiBase" :placeholder="defaultBase">
        </div>

        <div style="display:flex;gap:12px;margin-top:20px">
          <button class="api-test-btn" @click="testApi" :disabled="isTesting">{{ isTesting ? '測試中...' : '測試連線' }}</button>
          <button class="api-save-btn" @click="saveApi">儲存設定</button>
        </div>
      </div>

      <!-- Backup -->
      <div class="sec-label" style="margin-top:24px">資料管理</div>
      <div class="s-card">
        <div class="s-row" @click="exportData">
          <div class="s-row-ic"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
          <div class="s-row-name">匯出備份</div>
        </div>
        <div style="height:1px;background:var(--border);margin-left:46px"></div>
        <div class="s-row" @click="importData">
          <div class="s-row-ic"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
          <div class="s-row-name">匯入還原</div>
        </div>
      </div>
      
      <div class="about-footer">
        Auris v2.0 (Vue 重構版)<br>你說，他在聽
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { globalStore } from '../store/index.js';
import { getSetting, setSetting } from '../services/db.js';

const themes = [
  {id:'cream', name:'奶白', bg:'#f7f5f2', surface:'#fff',    rose:'#c9887a', text:'#2a2420'},
  {id:'warm',  name:'暖米', bg:'#ede8e0', surface:'#f7f3ee', rose:'#b8705e', text:'#1e1a16'},
  {id:'dark',  name:'深夜', bg:'#0f0e0d', surface:'#1a1816', rose:'#d49080', text:'#e8ddd8'},
  {id:'gray',  name:'霧灰', bg:'#f0eef2', surface:'#fafafa', rose:'#9a8fa0', text:'#1e1c22'},
  {id:'ocean', name:'海霧', bg:'#eef2f5', surface:'#f8fbfc', rose:'#5b8fa8', text:'#0e1e28'},
  {id:'matcha',name:'抹茶', bg:'#eff3ee', surface:'#f8fbf8', rose:'#6a9272', text:'#0e1e12'},
];

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
  return '前往 platform.openai.com 申請';
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

async function applyTheme(id) {
  globalStore.theme = id;
  await setSetting('theme', id);
  const t = themes.find(x => x.id === id);
  if (t) {
    document.documentElement.style.background = t.bg;
    document.body.style.background = t.bg;
  }
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

function exportData() {
  alert('匯出功能即將支援');
}

function importData() {
  alert('匯入功能即將支援');
}
</script>
