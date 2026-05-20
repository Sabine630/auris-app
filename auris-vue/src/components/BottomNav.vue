<template>
  <nav class="nav" :class="{ 'kb-hidden': globalStore.keyboardOffset > 80 }">
    <div class="ni" :class="{ active: route.name === 'home' }" @click="router.push('/')">
      <div class="ni-icon">
        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div class="ni-label">首頁</div>
    </div>
    <div class="ni" :class="{ active: isChatActive }" @click="router.push('/chat-list')">
      <div class="ni-icon">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </div>
      <div class="ni-label">對話</div>
    </div>
    <div class="ni" :class="{ active: isMomentsActive }" @click="router.push('/moments')">
      <div class="ni-icon">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/><line x1="8" y1="8" x2="10" y2="8"/></svg>
      </div>
      <div class="ni-label">貼文</div>
    </div>
    <div class="ni" :class="{ active: route.name === 'settings' }" @click="router.push('/settings')">
      <div class="ni-icon">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div class="ni-label">我的</div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { globalStore } from '../store/index.js';

const route = useRoute();
const router = useRouter();

const isChatActive = computed(() =>
  ['chat-list', 'chat', 'group-list', 'group-create', 'group-room'].includes(route.name)
);
const isMomentsActive = computed(() =>
  ['moments', 'post-detail'].includes(route.name)
);
</script>
