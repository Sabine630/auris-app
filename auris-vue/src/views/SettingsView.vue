<template>
  <div class="page active" id="pg-settings">
    <div class="ph">
      <div class="ph-back" @click="$router.back()">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回
      </div>
      <div class="ph-title">設定</div>
      <div></div>
    </div>
    
    <!-- 我的資訊卡 -->
    <div class="me-card" @click="$router.push('/me')">
      <div class="me-card-av">
        <img v-if="meAvatar && meAvatar.startsWith('data:')" :src="meAvatar" style="width:100%;height:100%;object-fit:cover;border-radius:14px">
        <span v-else>{{ meAvatar || '🙂' }}</span>
      </div>
      <div class="me-card-info">
        <div class="me-card-name">{{ meName || '設定你的名字' }}</div>
        <div class="me-card-sub">編輯個人資料 ›</div>
      </div>
    </div>

    <div class="sg-label">角色與世界</div>
    <div class="sg">
      <div class="sr" @click="$router.push('/char-manage')">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
        <div class="sr-text">角色管理</div>
        <div class="sr-val">{{ globalStore.characters.length > 0 ? `${globalStore.characters.length} 個角色` : '尚未建立' }}</div><div class="sr-chev">›</div>
      </div>
      <div class="sr" @click="$toast('多世界模式 — Phase 4')">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
        <div class="sr-text">多世界模式</div><div class="sr-val"><span style="padding:3px 9px;background:var(--rose-light);color:var(--rose);border-radius:10px;font-size:10px;font-weight:400;letter-spacing:.04em">即將推出</span></div>
      </div>
      <div class="sr" @click="$router.push('/worlds')">
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

    <div class="sg-label">教學</div>
    <div class="sg">
      <div class="sr" @click="openGuide">
        <div class="sr-ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <div class="sr-text">使用教學</div>
        <div class="sr-val" style="color:var(--rose)">互動示範</div><div class="sr-chev">›</div>
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

    <div class="sg-label">聊天</div>
    <div class="sg">
      <div class="toggle-row">
        <div class="toggle-info">
          <div class="toggle-name">動作排版</div>
          <div class="toggle-desc">開啟後，角色會用 *星號* 表示動作／場景（顯示成斜體旁白），「」表示對話。對所有角色生效。</div>
        </div>
        <div class="toggle" :class="{ on: chatFormatStyle }" @click="toggleFormatStyle"><div class="toggle-knob"></div></div>
      </div>
    </div>

    <div class="sg-label">天氣</div>
    <div class="sg">
      <div style="padding:14px 16px">
        <div style="font-size:13px;font-weight:300;color:var(--text);margin-bottom:4px">所在位置</div>
        <div style="font-size:11px;font-weight:300;color:var(--text-3);line-height:1.6;margin-bottom:12px">
          設定後，開啟「天氣感」的角色會偶爾感知你所在地的天氣（如下雨提醒帶傘）。位置僅存於本機，用於查詢天氣。
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:400;color:var(--text-2)">
            目前：<strong style="color:var(--text)">{{ weatherLoc?.city || '尚未設定' }}</strong>
          </div>
          <div v-if="weatherLoc" @click="clearWeatherLoc" style="font-size:11px;color:var(--red);cursor:pointer;margin-left:auto">清除</div>
        </div>
        <button class="sgbtn" :disabled="weatherBusy" @click="useCurrentLocation">
          {{ weatherBusy ? '定位中…' : '📍 使用目前位置' }}
        </button>
        <div style="display:flex;gap:8px;margin-top:10px">
          <input v-model="cityInput" type="text" placeholder="或手動輸入城市（如 台北、東京）"
            style="flex:1;min-width:0;padding:9px 12px;border:.5px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:13px;font-family:var(--font)"
            @keyup.enter="setCityManual">
          <button class="sgbtn" style="flex:0 0 auto;width:auto;padding:0 16px" :disabled="weatherBusy" @click="setCityManual">設定</button>
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

    <div style="margin:8px 16px 16px;padding:14px 16px;background:var(--surface);border-radius:12px;border:.5px solid var(--border)">
      <div style="font-size:12px;font-weight:700;color:var(--text);letter-spacing:.02em;margin-bottom:8px">⚠️ 使用聲明</div>
      <div style="font-size:11px;font-weight:400;color:var(--text-2);line-height:1.7">
        <strong>請勿未經原創者同意搬運、轉載他人角色設定。</strong>每個角色都是創作者的心血，尊重原創是社群的基石。<br><br>
        <strong>請勿將 API 金鑰或個人資料輸入來源不明的第三方網站。</strong>Auris 所有資料均存於您的裝置本地，不經過任何中間伺服器。
      </div>
    </div>

    <div style="text-align:center;padding:20px 0 40px;font-family:var(--font);user-select:text;-webkit-user-select:text">
      <div style="font-size:11px;font-weight:300;color:var(--text-3);letter-spacing:.08em;margin-bottom:4px">
        Auris · P104
      </div>
      <div style="font-size:10px;font-weight:300;color:var(--text-3);opacity:.7;letter-spacing:.05em">
        P104 佔位符替換與心聲截斷再修：全站新增 {{user}}/{{char}} 替換（角色卡欄位進 prompt 前換真名、AI 輸出落庫前再掃一次），聊天泡泡不再出現 {{user}} 原文；心聲改走可偵測 finish_reason 的路徑，被 max_tokens 硬切的殘句（如「我的早就」「連妳嗔怒的模樣，都」）一律不存，並把額度 220→1000 讓推理型模型講得完
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { globalStore } from '../store/index.js';
import { getSetting, setSetting, exportAllData, importAllData } from '../services/db.js';
import { geocodeCity, reverseGeocode } from '../services/weather.js';
import { demoEntryUrl } from '../services/demoMode.js';

// 使用教學：另開一個分頁進入 ?demo=1 互動示範，不影響目前的真實 App 分頁。
function openGuide() {
  window.open(demoEntryUrl(), '_blank');
}

const themes = [
  {id:'cream', name:'奶白', bg:'#f7f5f2', surface:'#fff',    rose:'#c9887a', text:'#2a2420'},
  {id:'warm',  name:'暖米', bg:'#ede8e0', surface:'#f7f3ee', rose:'#b8705e', text:'#1e1a16'},
  {id:'dark',  name:'深夜', bg:'#0f0e0d', surface:'#1a1816', rose:'#d49080', text:'#e8ddd8'},
  {id:'gray',  name:'霧灰', bg:'#f0eef2', surface:'#fafafa', rose:'#9a8fa0', text:'#1e1c22'},
  {id:'ocean', name:'海霧', bg:'#eef2f5', surface:'#f8fbfc', rose:'#5b8fa8', text:'#0e1e28'},
  {id:'matcha',name:'抹茶', bg:'#eff3ee', surface:'#f8fbf8', rose:'#6a9272', text:'#0e1e12'},
];

const apiKey = ref('');
const meName = ref('');
const meAvatar = ref('');
const chatFormatStyle = ref(false);
const weatherLoc = ref(null);
const cityInput = ref('');
const weatherBusy = ref(false);

onMounted(async () => {
  apiKey.value = (await getSetting('api_key')) || '';
  const me = await getSetting('me_settings');
  meName.value = me?.name || '';
  meAvatar.value = me?.avatar || '🙂';
  chatFormatStyle.value = !!(await getSetting('chat_format_style'));
  weatherLoc.value = await getSetting('weather_loc');
});

async function toggleFormatStyle() {
  chatFormatStyle.value = !chatFormatStyle.value;
  globalStore.chatFormatStyle = chatFormatStyle.value;
  await setSetting('chat_format_style', chatFormatStyle.value);
}

// 天氣定位：自動定位優先（瀏覽器 Geolocation），失敗或拒絕時改用手動輸入城市。
async function saveWeatherLoc(loc) {
  loc.fetchedAt = Date.now();
  await setSetting('weather_loc', loc);
  weatherLoc.value = loc;
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    window.toast_('此瀏覽器不支援定位，請改用手動輸入');
    return;
  }
  weatherBusy.value = true;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const city = await reverseGeocode(lat, lon);
        await saveWeatherLoc({ lat, lon, city: city || '目前位置' });
        window.toast_('定位成功' + (city ? `：${city}` : ''));
      } catch {
        window.toast_('定位失敗，請改用手動輸入');
      } finally {
        weatherBusy.value = false;
      }
    },
    () => {
      weatherBusy.value = false;
      window.toast_('無法取得定位（已拒絕或失敗），請改用手動輸入城市');
    },
    { timeout: 10000, maximumAge: 600000 }
  );
}

async function setCityManual() {
  const name = cityInput.value.trim();
  if (!name) return;
  weatherBusy.value = true;
  try {
    const r = await geocodeCity(name);
    if (!r) { window.toast_('找不到這個城市，請換個寫法試試'); return; }
    await saveWeatherLoc(r);
    cityInput.value = '';
    window.toast_(`已設定：${r.city}`);
  } finally {
    weatherBusy.value = false;
  }
}

async function clearWeatherLoc() {
  await setSetting('weather_loc', null);
  weatherLoc.value = null;
  window.toast_('已清除定位');
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

async function exportData() {
  try {
    window.toast_('正在準備備份檔...');
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // YYYYMMDD-HHMM format
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    
    a.download = `auris_backup_${y}${m}${day}-${h}${min}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.toast_('匯出完成（基於安全，備份不含 API 金鑰）');
  } catch (err) {
    window.toast_('匯出失敗：' + err.message);
  }
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmMsg = '【嚴重警告】\n\n這將會清除您目前所有的聊天紀錄與角色，並完全替換為備份檔的內容。\n\n這個動作無法復原，確定要繼續嗎？';
    if (!await window.confirm_(confirmMsg)) {
      input.value = '';
      return;
    }

    window.toast_('正在匯入資料...');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        await importAllData(json);
        window.toast_('匯入成功，即將重新載入...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        window.toast_('匯入失敗：檔案格式錯誤或損毀。');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
</script>

<style scoped>
.me-card {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 16px 16px 8px;
  padding: 14px 16px;
  background: var(--surface);
  border-radius: 16px;
  border: .5px solid var(--border);
  cursor: pointer;
  transition: opacity .15s;
}
.me-card:active { opacity: .7; }
.me-card-av {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--rose-pale, rgba(201,136,122,.12));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
  overflow: hidden;
}
.me-card-info { flex: 1; min-width: 0; }
.me-card-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.me-card-sub {
  font-size: 12px;
  font-weight: 300;
  color: var(--rose);
  letter-spacing: .02em;
}
.sgbtn {
  width: 100%;
  padding: 9px 12px;
  border: .5px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  font-weight: 400;
  font-family: var(--font);
  cursor: pointer;
  transition: opacity .15s;
}
.sgbtn:active { opacity: .7; }
.sgbtn:disabled { opacity: .5; cursor: default; }
</style>
