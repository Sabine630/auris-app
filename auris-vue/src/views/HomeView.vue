<template>
  <div class="page active" id="pg-home">
    <div class="h-top anim">
      <div class="h-greeting" id="greet">Good evening</div>
      <div class="h-name">你的 <em>世界</em></div>
      <div class="h-ann-btn" @click="openAnnouncement">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        P47–P52 更新公告
      </div>
    </div>

    <!-- Character bar -->
    <div class="h-chars anim" style="animation-delay:.05s">
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

    <div class="h-world anim" style="animation-delay:.08s" @click="console.log('多世界模式即將開放')">
      <div class="h-world-name">▸ &nbsp;主世界 · World One</div>
      <svg width="10" height="7" viewBox="0 0 10 7" style="flex-shrink:0"><path d="M1 1.5L5 5.5L9 1.5" stroke="var(--rose)" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>

    <div class="h-divider"></div>
    <div class="h-sec">對話</div>
    <div class="tg">
      <div class="tile accent anim" style="animation-delay:.07s" @click="$router.push('/chat-list')">
        <div class="t-bar"></div>
        <div class="t-ic"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
        <div class="t-name">聊天</div>
        <div class="t-sub">開始對話</div>
      </div>
      <div class="tile anim" style="animation-delay:.10s" @click="$router.push('/moments')">
        <div class="t-ic"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg></div>
        <div class="t-name">貼文</div><div class="t-sub">查看動態</div>
      </div>
      <div class="tile anim" style="animation-delay:.13s" @click="$router.push('/diary')">
        <div class="t-ic"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h5"/></svg></div>
        <div class="t-name">日記</div><div class="t-sub">今日未生成</div>
      </div>
      <div class="tile anim" style="animation-delay:.16s" @click="$router.push('/dream')">
        <div class="t-ic"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
        <div class="t-name">夢境</div><div class="t-sub">點擊生成</div>
      </div>
    </div>

    <div class="h-sec">角色生活</div>
    <div class="tg">
      <div class="tile anim" style="animation-delay:.07s" @click="$router.push('/blackbox')">
        <div class="t-ic"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
        <div class="t-name">黑盒子</div><div class="t-sub">內心活動</div>
      </div>
      <div class="tile anim" style="animation-delay:.10s" @click="$router.push('/notifications')">
        <div class="t-ic"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>
        <div class="t-name">通知</div><div class="t-sub">無新通知</div>
      </div>
      <div class="tile anim" style="animation-delay:.13s" @click="$router.push('/group-list')">
        <div class="t-ic"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
        <div class="t-name">群組</div><div class="t-sub">多角色聊天</div>
      </div>
      <div class="tile anim" style="animation-delay:.16s" @click="console.log('定位即將開放')">
        <div class="t-ic"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <div class="t-name">定位</div><div class="t-sub">查看行踪</div>
      </div>
    </div>

    <div class="h-sec">劇情創作</div>
    <div class="tw anim" style="animation-delay:.07s" @click="console.log('劇本即將開放')">
      <div class="tw-icon"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
      <div class="tw-body"><div class="tw-name">劇本體驗</div><div class="tw-sub">互動故事 · AI 生成劇情</div></div>
      <div class="tw-chev">›</div>
    </div>
    <div class="tw anim" style="animation-delay:.10s" @click="console.log('小說即將開放')">
      <div class="tw-icon"><svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg></div>
      <div class="tw-body"><div class="tw-name">小說</div><div class="tw-sub">AI 陪你寫長篇故事</div></div>
      <div class="tw-chev">›</div>
    </div>
    <div class="tw anim" style="animation-delay:.13s" @click="console.log('線下模式即將開放')">
      <div class="tw-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div>
      <div class="tw-body"><div class="tw-name">線下模式</div><div class="tw-sub">IF 分支 · 長篇敘事</div></div>
      <div class="tw-chev">›</div>
    </div>

    <div class="h-sec">養成 & 系統</div>
    <div class="tg tg3" style="margin-bottom:24px">
      <div class="tile anim" style="animation-delay:.07s;min-height:76px" @click="console.log('寵物屋即將開放')">
        <div class="t-ic"><svg viewBox="0 0 24 24" style="width:22px;height:22px"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div>
        <div class="t-name" style="font-size:11px">寵物屋</div>
      </div>
      <div class="tile anim" style="animation-delay:.10s;min-height:76px" @click="console.log('任務即將開放')">
        <div class="t-ic"><svg viewBox="0 0 24 24" style="width:22px;height:22px"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>
        <div class="t-name" style="font-size:11px">任務</div>
      </div>
      <div class="tile anim" style="animation-delay:.13s;min-height:76px" @click="$router.push('/settings')">
        <div class="t-ic"><svg viewBox="0 0 24 24" style="width:22px;height:22px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></div>
        <div class="t-name" style="font-size:11px">設定</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { globalStore } from '../store/index.js';

function openAnnouncement() {
  window.openAnnouncement_?.();
}
</script>

<style scoped>
.h-ann-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  padding: 5px 12px;
  background: transparent;
  border: .5px solid var(--border-2);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 300;
  color: var(--text-3);
  cursor: pointer;
  transition: opacity .2s;
  letter-spacing: .03em;
}
.h-ann-btn:active { opacity: .6; }
</style>
