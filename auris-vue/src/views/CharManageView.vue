<template>
  <div class="page active" id="pg-char-manage">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/settings')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">角色管理</div>
      <div class="ph-act" @click="$router.push('/char-edit')">＋ 新增</div>
    </div>
    
    <div id="char-list" style="padding:12px 0">
      <div v-if="globalStore.characters.length === 0" class="empty">
        <div class="empty-ic"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="empty-ttl">還沒有角色</div>
        <div class="empty-sub">點右上角「＋ 新增」建立第一個角色</div>
      </div>
      
      <div v-for="c in globalStore.characters" :key="c.id" class="char-card">
        <div class="char-card-bar"></div>
        <div class="char-av">
          <img v-if="c.avatar && c.avatar.startsWith('data:')" :src="c.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:13px">
          <span v-else>{{ c.avatar || '🌸' }}</span>
        </div>
        <div class="char-info">
          <div class="char-name">{{ c.name }}</div>
          <div class="char-tagline">{{ c.tagline || '尚未設定介紹' }}</div>
          <div v-if="c.tags && c.tags.length" class="char-tags">
            <span v-for="t in c.tags" :key="t" class="char-tag">{{ t }}</span>
          </div>
        </div>
        <div class="char-btns">
          <button class="char-chat-btn" @click="$router.push('/chat/' + c.id)">聊天</button>
          <button class="char-edit-btn" @click="$router.push('/char-edit/' + c.id)">編輯</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { globalStore } from '../store/index.js';
</script>
