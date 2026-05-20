<template>
  <nav class="nav" :class="{ 'kb-hidden': globalStore.keyboardOffset > 80 }">
    <router-link to="/" class="ni" active-class="active">
      <div class="ni-icon">
        <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div class="ni-label">首頁</div>
    </router-link>
    <router-link to="/chat" class="ni" active-class="active">
      <div class="ni-icon">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </div>
      <div class="ni-label">對話</div>
    </router-link>
    <router-link to="/moments" class="ni" active-class="active">
      <div class="ni-icon">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/><line x1="8" y1="8" x2="10" y2="8"/></svg>
      </div>
      <div class="ni-label">貼文</div>
    </router-link>
    <router-link to="/settings" class="ni" active-class="active">
      <div class="ni-icon">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div class="ni-label">我的</div>
    </router-link>
  </nav>
</template>

<script setup>
import { globalStore } from '../store/index.js';
</script>
