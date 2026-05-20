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

let timer;
onMounted(async () => {
  await globalStore.init();
  updateClock();
  timer = setInterval(updateClock, 10000);

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
