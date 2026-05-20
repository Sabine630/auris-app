<template>
  <div class="page active" id="pg-diary">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/')">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg> 返回
      </div>
      <div class="ph-title">日記與夢境</div>
      <div class="ph-act"></div>
    </div>

    <!-- Mode Tabs -->
    <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--bg);border-bottom:.5px solid var(--border)">
      <div class="chat-tab" :class="{ active: mode === 'diary' }" @click="mode = 'diary'">日記</div>
      <div class="chat-tab" :class="{ active: mode === 'dream' }" @click="mode = 'dream'">夢境</div>
    </div>

    <div class="diary-list" style="padding-bottom: 80px; padding-top: 16px;">
      <div v-if="!items.length" class="bb-empty">
        <div class="bb-empty-ic">
          <svg v-if="mode === 'diary'" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </div>
        <div class="bb-empty-ttl">還沒有{{ mode === 'diary' ? '日記' : '夢境' }}</div>
        <div class="bb-empty-sub">系統會根據您的設定自動生成</div>
      </div>

      <div v-for="item in items" :key="item.id" class="diary-card">
        <div class="diary-top">
          <div class="diary-av">
            <img v-if="getChar(item.charId).avatar?.startsWith('data:')" :src="getChar(item.charId).avatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
            <span v-else>{{ getChar(item.charId).avatar || '🌸' }}</span>
          </div>
          <div>
            <div class="diary-name">{{ getChar(item.charId).name }}</div>
            <div class="diary-time">{{ timeAgo(item.createdAt) }}</div>
          </div>
        </div>
        <div class="diary-preview">{{ getPreview(item.content) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { globalStore } from '../store/index.js';
import { dbAll } from '../services/db.js';

const mode = ref('diary');
const allDiaries = ref([]);
const allDreams = ref([]);

onMounted(async () => {
  const [diaries, dreams] = await Promise.all([
    dbAll('diary'),
    dbAll('dreams')
  ]);
  diaries.sort((a, b) => b.createdAt - a.createdAt);
  dreams.sort((a, b) => b.createdAt - a.createdAt);
  
  allDiaries.value = diaries;
  allDreams.value = dreams;
});

const items = computed(() => {
  return mode.value === 'diary' ? allDiaries.value : allDreams.value;
});

function getChar(id) {
  return globalStore.characters.find(c => c.id === id) || { name: 'Unknown', avatar: '🌸' };
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分鐘前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小時前';
  return Math.floor(diff / 86400000) + ' 天前';
}

function getPreview(content) {
  if (!content) return '';
  const firstLine = content.split('\n')[0];
  return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
}
</script>
