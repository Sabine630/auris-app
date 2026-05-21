<template>
  <div id="phone-container" class="phone" :data-theme="globalStore.theme" :style="{ paddingBottom: globalStore.keyboardOffset + 'px' }">
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { globalStore } from './store/index.js';
import { getSetting } from './services/db.js';
import BottomNav from './components/BottomNav.vue';

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

let timer;
onMounted(async () => {
  await globalStore.init();
  updateClock();
  timer = setInterval(updateClock, 10000);

  // Generate PWA icon and manifest
  generatePWAIcon();

  // Check onboarding
  const obDone = await getSetting('onboarding_done');
  if (!obDone && route.name !== 'onboarding') {
    router.push('/onboarding');
  }
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
