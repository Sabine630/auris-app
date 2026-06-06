<template>
  <div class="page active" id="pg-moments">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">貼文</div>
      <div class="ph-act" @click="showGenPanel = !showGenPanel" style="font-size:18px;line-height:1;color:var(--rose)">＋</div>
    </div>
    
    <div class="moments-filter" v-if="globalStore.characters.length > 0">
      <div class="moments-chip" :class="{ sel: filterCharId === 'all' }" @click="filterCharId = 'all'">全部</div>
      <div v-for="c in globalStore.characters" :key="c.id" class="moments-chip" :class="{ sel: filterCharId === c.id }" @click="filterCharId = c.id">
        {{ c.name }}
      </div>
    </div>

    <div v-if="showGenPanel && globalStore.characters.length > 0" style="margin:4px 16px 0">
      <div v-if="filterCharId === 'all'" style="font-size:12px;color:var(--text-3);padding:8px 0">
        請先在上方選擇要發佈貼文的角色。
      </div>
      <button v-else class="diary-gen-btn" @click="doGeneratePost" :disabled="isGenerating">
        <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>{{ isGenerating ? '生成中...' : '為 ' + getName(filterCharId) + ' 生成一則貼文' }}</span>
      </button>
    </div>

    <div class="moments-list">
      <div v-if="filteredMoments.length === 0" style="text-align:center;padding:60px 20px;color:var(--text-3);font-size:13px;font-weight:300">
        還沒有貼文
      </div>
      <div v-for="p in filteredMoments" :key="p.id" class="post-card" @click="openDetail(p.id)">
        <div class="post-card-top">
          <div class="post-av">
            <img v-if="getAvatar(p.charId) && getAvatar(p.charId).startsWith('data:')" :src="getAvatar(p.charId)" style="width:100%;height:100%;object-fit:cover">
            <span v-else>{{ getAvatar(p.charId) || '🌸' }}</span>
          </div>
          <div>
            <div class="post-name">{{ getName(p.charId) }}</div>
            <div class="post-time">{{ timeAgo(p.createdAt) }}</div>
          </div>
        </div>
        <div class="post-body">{{ p.content.length > 80 ? p.content.substring(0, 80) + '...' : p.content }}</div>
        <div class="post-tags" v-if="p.tags && p.tags.length">
          <span v-for="t in p.tags" :key="t" class="post-tag">#{{ t }}</span>
        </div>
        <div class="post-actions">
          <div class="post-like-btn" :class="{ liked: p.likedByMe }" @click.stop="toggleLike(p)">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            <span>{{ p.likes || '' }}</span>
          </div>
          <div class="post-like-btn" style="pointer-events:none">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>{{ (p.comments && p.comments.length) || '' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../store/index.js';
import { dbAll, dbPut } from '../services/db.js';
import { generatePost } from '../services/contentEngine.js';

const router = useRouter();
const moments = ref([]);
const filterCharId = ref('all');
const showGenPanel = ref(false);
const isGenerating = ref(false);

const filteredMoments = computed(() => {
  let list = moments.value;
  if (filterCharId.value !== 'all') {
    list = list.filter(m => m.charId === filterCharId.value);
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
});

onMounted(async () => {
  await globalStore.loadCharacters();
  await loadMoments();
});

async function loadMoments() {
  const all = await dbAll('moments');
  moments.value = all;
}

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

async function doGeneratePost() {
  if (filterCharId.value === 'all') return;
  isGenerating.value = true;
  try {
    const res = await generatePost(filterCharId.value);
    if (res && res.entry) {
      moments.value.push(res.entry);
      if (res.truncated) window.toast_('⚠ 貼文可能被截斷');
    }
  } catch (err) {
    window.toast_('生成失敗：' + err.message);
  } finally {
    isGenerating.value = false;
    showGenPanel.value = false;
  }
}

async function toggleLike(p) {
  p.likedByMe = !p.likedByMe;
  p.likes = (p.likes || 0) + (p.likedByMe ? 1 : -1);
  await dbPut('moments', JSON.parse(JSON.stringify(p)));
}

function openDetail(id) {
  router.push('/post/' + id);
}
</script>
