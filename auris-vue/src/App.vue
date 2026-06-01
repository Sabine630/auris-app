<template>
  <div id="phone-container" class="phone" :data-theme="globalStore.theme">
    <!-- Status Bar (Desktop Only Preview) -->
    <div class="sb">
      <div class="sb-time" id="clock">{{ time }}</div>
      <div class="di"><div class="di-cam"></div></div>
      <div class="sb-r">
        <svg viewBox="0 0 24 24" width="16" height="16"><rect x="2" y="7" width="20" height="10" rx="2"/><rect x="22" y="10" width="2" height="4"/></svg>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="screen">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
    <!-- Toast -->
    <div id="toast" class="toast"></div>

    <!-- Bottom Navigation -->
    <BottomNav v-if="showNav" />

    <!-- Announcement Modal -->
    <AnnouncementModal v-if="showAnnouncement" @close="closeAnnouncement" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { globalStore } from './store/index.js';
import { getSetting, setSetting, dbAll, dbIdx, dbGet } from './services/db.js';
import { generateDiary, generatePost } from './services/contentEngine.js';
import { generateCycleCareMessage } from './services/chatEngine.js';
import { getCyclePhase } from './services/cycle.js';
import BottomNav from './components/BottomNav.vue';
import AnnouncementModal from './components/AnnouncementModal.vue';

const ANNOUNCEMENT_VERSION = 'P59';
const showAnnouncement = ref(false);

async function closeAnnouncement() {
  showAnnouncement.value = false;
  await setSetting('last_seen_announcement', ANNOUNCEMENT_VERSION);
}

window.openAnnouncement_ = () => { showAnnouncement.value = true; };

const route = useRoute();
const router = useRouter();
const time = ref('');

const showNav = computed(() => {
  const hiddenRoutes = ['chat', 'onboarding', 'api', 'lock', 'char-edit', 'char-manage', 'group-room', 'group-create', 'post-detail', 'diary-detail', 'dream-detail'];
  return !hiddenRoutes.includes(route.name);
});

function updateClock() {
  const n = new Date();
  const h = n.getHours();
  const m = n.getMinutes().toString().padStart(2, '0');
  time.value = `${h}:${m}`;
}

let toastTimer;
window.toast_ = (msg, ms = 4500) => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
};

const THEME_BG = {
  cream: '#f7f5f2', warm: '#ede8e0', dark: '#0f0e0d',
  gray: '#f0eef2', ocean: '#eef2f5', matcha: '#eff3ee'
};

function generatePWAIcon() {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const ctx = c.getContext('2d');
    // 圓角矩形背景
    const r = 42;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(192 - r, 0); ctx.quadraticCurveTo(192, 0, 192, r);
    ctx.lineTo(192, 192 - r); ctx.quadraticCurveTo(192, 192, 192 - r, 192);
    ctx.lineTo(r, 192); ctx.quadraticCurveTo(0, 192, 0, 192 - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fillStyle = '#f7f5f2'; ctx.fill();
    // 文字 A
    ctx.fillStyle = '#c9887a';
    ctx.font = 'italic 300 96px Georgia,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('A', 96, 134);
    const png = c.toDataURL('image/png');
    // 設定 Apple Touch Icon
    const atiEl = document.getElementById('ati');
    if (atiEl) atiEl.href = png;
    // 設定 Favicon
    const favEl = document.getElementById('fav');
    if (favEl) favEl.href = png;
    // 動態生成 manifest（跟當前主題同步）
    const themeBg = THEME_BG[globalStore.theme] || THEME_BG.cream;
    const manifest = {
      name: 'Auris',
      short_name: 'Auris',
      description: '你說，他在聽',
      start_url: './',
      display: 'standalone',
      background_color: themeBg,
      theme_color: themeBg,
      icons: [
        { src: png, sizes: '192x192', type: 'image/png' },
        { src: png, sizes: '512x512', type: 'image/png' }
      ]
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(manifestBlob);
    const manifestLink = document.getElementById('manifest-link');
    if (manifestLink) manifestLink.href = manifestURL;
    // 同步 theme-color meta
    const themeMeta = document.getElementById('theme-color-meta');
    if (themeMeta) themeMeta.content = themeBg;
  } catch (e) {
    console.error('PWA Icon generation failed:', e);
  }
}

// Sync html element background with current theme so iOS keyboard flash matches app color
function syncRootBg(theme) {
  document.documentElement.style.background = THEME_BG[theme] || THEME_BG.cream;
}
watch(() => globalStore.theme, syncRootBg);

async function runDailyAutoGen() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = await getSetting('last_auto_gen_date');
    if (lastDate === today) return;
    await setSetting('last_auto_gen_date', today);

    const chars = await dbAll('characters');
    let count = 0;
    for (const c of chars) {
      if (c.autoDiary) {
        const diaries = await dbIdx('diary', 'charId', c.id);
        if (!diaries.some(d => d.date === today)) {
          try { const r = await generateDiary(c.id); if (r) count++; } catch (_) {}
        }
      }
      if (c.autoPost) {
        try { const r = await generatePost(c.id); if (r) count++; } catch (_) {}
      }
    }
    if (count > 0) window.toast_?.(`已自動生成今日內容（${count} 則）`);
  } catch (_) {}
}

// 生理期主動關心：在「預測經期開始日」與「經期前 2 天」各觸發一次，
// 讓有開「生理期關心」的角色主動傳一則關心訊息進聊天室。
// 以 per-char 的日期 setting 去重，同一天不重複傳；兩個觸發日為不同日期，各自只會發一次。
async function runCycleCare() {
  try {
    const me = await getSetting('me_settings');
    if (!me || !me.cycleEnabled || !me.lastPeriodStart) return;
    const ph = getCyclePhase(me);
    if (!ph) return;

    let trigger = null;
    if (ph.dayInCycle === 0) trigger = 'period';      // 預測經期開始日
    else if (ph.daysUntilNext === 2) trigger = 'pms'; // 經期前 2 天
    if (!trigger) return;

    const today = new Date().toISOString().slice(0, 10);
    const chars = await dbAll('characters');
    for (const c of chars) {
      if (!c.cycleCare) continue;
      const key = 'cycle_care_' + c.id;
      if (await getSetting(key) === today) continue;
      await setSetting(key, today);
      try { await generateCycleCareMessage(c.id, trigger); } catch (_) {}
    }
  } catch (_) {}
}

let timer;
onMounted(async () => {
  await globalStore.init();
  syncRootBg(globalStore.theme);
  updateClock();
  timer = setInterval(updateClock, 10000);

  // Generate PWA icon and manifest
  generatePWAIcon();

  // Check onboarding — also skip if user already has characters (e.g. after backup restore)
  const obDone = await getSetting('onboarding_done');
  if (!obDone && route.name !== 'onboarding') {
    const chars = await dbAll('characters');
    if (chars && chars.length > 0) {
      await setSetting('onboarding_done', true);
    } else {
      router.push('/onboarding');
    }
  }

  // Show announcement modal if user hasn't seen this version yet
  const lastSeen = await getSetting('last_seen_announcement');
  if (lastSeen !== ANNOUNCEMENT_VERSION) {
    setTimeout(() => { showAnnouncement.value = true; }, 600);
  }

  // Daily auto-generation (runs silently in background, P50)
  runDailyAutoGen();

  // 生理期主動關心（背景靜默執行，P59）
  runCycleCare();

  // Prevent iOS Safari swipe-back gesture (left/right edge swipe)
  document.addEventListener('touchstart', (e) => {
    const x = e.touches[0].clientX;
    if (x < 20 || x > window.innerWidth - 20) e.preventDefault();
  }, { passive: false });

  // iOS PWA keyboard: scroll focused input into view after keyboard animates in
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA')) return;
    if (t.id === 'lock-in') return;
    setTimeout(() => {
      try { t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
    }, 300);
  });
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
