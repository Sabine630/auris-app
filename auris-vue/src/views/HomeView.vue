<template>
  <div class="page active" id="pg-home">
    <div class="h-top">
      <div class="h-greeting" id="greet">Good evening</div>
      <div class="h-name">Hello, <em>Sabine</em></div>
    </div>
    
    <!-- Character bar -->
    <div class="h-chars">
      <div class="h-char-all" @click="$router.push('/settings')">
        <div class="h-char-all-ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg></div>
        <div class="h-char-all-name">新增角色</div>
      </div>
      <div v-for="char in globalStore.characters" :key="char.id" class="h-char-item" @click="$router.push('/chat/' + char.id)">
        <div class="h-char-av" :class="{ online: char.hasUnread }">
          <img v-if="char.avatar && char.avatar.startsWith('data:')" :src="char.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:13px">
          <span v-else>{{ char.avatar || '🌸' }}</span>
          <div class="h-char-av-dot" v-if="char.hasUnread"></div>
        </div>
        <div class="h-char-name">{{ char.name }}</div>
      </div>
    </div>

    <div class="h-divider"></div>
    <div class="h-sec">動態與紀錄</div>
    <div class="tg tg3">
      <div class="tile accent" @click="$router.push('/moments')">
        <div class="t-bar"></div>
        <div class="t-ic"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/><line x1="8" y1="8" x2="10" y2="8"/></svg></div>
        <div class="t-name">貼文</div>
        <div class="t-sub">最新動態</div>
      </div>
      <div class="tile" @click="$router.push('/diary')">
        <div class="t-bar" style="background:var(--surface2)"></div>
        <div class="t-ic"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
        <div class="t-name">日記</div>
        <div class="t-sub">生活點滴</div>
      </div>
      <div class="tile" @click="$router.push('/diary')">
        <div class="t-bar" style="background:var(--surface2)"></div>
        <div class="t-ic"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>
        <div class="t-name">夢境</div>
        <div class="t-sub">潛意識</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { globalStore } from '../store/index.js';
</script>
