<template>
  <div class="page active" id="pg-settings">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/')">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回
      </div>
      <div class="ph-title">設定</div>
      <div></div>
    </div>
    
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 24px 20px">
      <div style="width:68px;height:68px;border-radius:20px;background:linear-gradient(135deg,var(--rose),#e8b09e);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(201,136,122,0.28)">
        <svg width="30" height="30" viewBox="0 0 24 24" style="stroke:#fff;fill:none;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round"><path d="M3 18v-1a5 5 0 015-5h8a5 5 0 015 5v1"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div style="font-family:var(--font-serif);font-size:20px;font-style:italic;color:var(--text)">Auris</div>
      <div style="font-size:12px;font-weight:300;color:var(--text-3)">你說，他在聽</div>
    </div>

    <div class="sg-label">角色與世界</div>
    <div class="sg">
      <div class="sr" @click="$router.push('/char-manage')">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="sr-text">角色管理</div>
        <div class="sr-val">{{ globalStore.characters.length > 0 ? `${globalStore.characters.length} 個角色` : '尚未建立' }}</div><div class="sr-chev">›</div>
      </div>
      <div class="sr" @click="$router.push('/me')">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="sr-text">我的設定</div>
        <div class="sr-val">未設定</div><div class="sr-chev">›</div>
      </div>
      <div class="sr" @click="$toast('多世界模式 — Phase 4')">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
        <div class="sr-text">多世界模式</div><div class="sr-val">主世界</div><div class="sr-chev">›</div>
      </div>
      <div class="sr" @click="$toast('世界書 — 即將加入')">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div>
        <div class="sr-text">世界書</div><div class="sr-chev">›</div>
      </div>
    </div>

    <div class="sg-label">API 設定</div>
    <div class="sg">
      <div class="sr" @click="$router.push('/api')">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></div>
        <div class="sr-text">API 金鑰與模型</div>
        <div class="sr-val" :style="{ color: apiKey ? 'var(--text-3)' : 'var(--red)' }">{{ apiKey ? '已設定' : '未設定' }}</div><div class="sr-chev">›</div>
      </div>
    </div>

    <div class="sg-label">外觀</div>
    <div class="sg">
      <div style="padding:14px 16px">
        <div style="font-size:13px;font-weight:300;color:var(--text);margin-bottom:12px">主題</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px" id="theme-picker">
          <div v-for="t in themes" :key="t.id" class="theme-opt" :class="{ sel: globalStore.theme === t.id }" @click="applyTheme(t.id)">
            <div class="theme-preview" :style="{ background: t.bg }">
              <div class="theme-preview-dot" :style="{ background: t.rose }"></div>
              <div class="theme-preview-dot" :style="{ background: t.text, opacity: 0.3 }"></div>
              <div class="theme-preview-dot" :style="{ background: t.surface, border: '1px solid rgba(0,0,0,.08)' }"></div>
            </div>
            <div class="theme-name">{{ t.name }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="sg-label">資料</div>
    <div class="sg" style="margin-bottom:32px">
      <div class="sr" @click="exportData">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
        <div class="sr-text">匯出資料</div><div class="sr-chev">›</div>
      </div>
      <div class="sr" @click="importData">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
        <div class="sr-text">匯入資料</div><div class="sr-chev">›</div>
      </div>
    </div>

    <div style="text-align:center;padding:20px 0 40px;font-family:var(--font);user-select:text;-webkit-user-select:text">
      <div style="font-size:11px;font-weight:300;color:var(--text-3);letter-spacing:.08em;margin-bottom:4px">
        Auris · v0.39
      </div>
      <div style="font-size:10px;font-weight:300;color:var(--text-3);opacity:.7;letter-spacing:.05em">
        7 項 Bug 修復 · 動態 PWA/Favicon 圖示
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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

const apiKey = ref('');

onMounted(async () => {
  apiKey.value = (await getSetting('api_key')) || '';
});

async function applyTheme(id) {
  globalStore.theme = id;
  await setSetting('theme', id);
  const t = themes.find(x => x.id === id);
  if (t) {
    document.documentElement.style.background = t.bg;
    document.body.style.background = t.bg;
  }
}

function exportData() {
  window.toast_('匯出功能即將支援');
}

function importData() {
  window.toast_('匯入功能即將支援');
}
</script>
