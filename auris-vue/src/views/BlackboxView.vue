<template>
  <div class="page active" id="pg-blackbox">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">心聲</div>
      <div class="ph-act" style="font-size:11px;color:var(--text-3)">{{ filteredMemories.length ? `${filteredMemories.length} 則` : '' }}</div>
    </div>
    
    <!-- 角色篩選 -->
    <div class="bb-filter">
      <div class="bb-chip" :class="{ sel: filterCharId === 'all' }" @click="filterCharId = 'all'">全部</div>
      <div v-for="c in charsWithMemories" :key="c.id" class="bb-chip" :class="{ sel: filterCharId === c.id }" @click="filterCharId = c.id">
        {{ c.name }}
      </div>
    </div>
    
    <!-- 條目列表 -->
    <div class="bb-list">
      <div v-if="filteredMemories.length === 0" class="bb-empty">
        <div class="bb-empty-ic"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
        <div class="bb-empty-ttl">{{ allMemories.length === 0 ? '還沒有心聲' : '這個角色還沒有心聲' }}</div>
        <div class="bb-empty-sub" v-html="allMemories.length === 0 ? '開啟角色設定中的「Heart Voice」<br>與他對話後，他的內心話會出現在這裡' : '繼續和他聊天，他的心聲<br>會悄悄記錄在這裡'"></div>
      </div>
      <div v-else>
        <div v-for="m in filteredMemories" :key="m.id" class="bb-entry">
          <div class="bb-av">
            <img v-if="getAvatar(m.charId) && getAvatar(m.charId).startsWith('data:')" :src="getAvatar(m.charId)" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
            <span v-else>{{ getAvatar(m.charId) || '🌸' }}</span>
          </div>
          <div class="bb-body">
            <div class="bb-meta">
              <span class="bb-name">{{ getName(m.charId) }}</span>
              <span class="bb-time">{{ timeAgo(m.createdAt) }}</span>
            </div>
            <div class="bb-tag">heart voice</div>
            <div class="bb-text" v-html="formatContent(m.content)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { globalStore } from '../store/index.js';
import { dbAll } from '../services/db.js';
import { formatContent } from '../services/format.js';

const allMemories = ref([]);
const filterCharId = ref('all');

const charsWithMemories = computed(() => {
  const ids = [...new Set(allMemories.value.map(m => m.charId))];
  return ids.map(id => globalStore.characters.find(c => c.id === id)).filter(Boolean);
});

const filteredMemories = computed(() => {
  let list = [...allMemories.value];
  if (filterCharId.value !== 'all') {
    list = list.filter(m => m.charId === filterCharId.value);
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
});

onMounted(async () => {
  await globalStore.loadCharacters();
  allMemories.value = await dbAll('memories');
});

function getAvatar(charId) {
  const c = globalStore.characters.find(x => x.id === charId);
  return c ? c.avatar : '🌸';
}
function getName(charId) {
  const c = globalStore.characters.find(x => x.id === charId);
  return c ? c.name : 'Unknown';
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins}分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小時前`;
  return `${Math.floor(hrs / 24)}天前`;
}
</script>
