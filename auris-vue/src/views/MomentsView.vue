<template>
  <div class="page active" id="pg-moments">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/')">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg> 返回
      </div>
      <div class="ph-title">貼文</div>
      <div class="ph-act" @click="showPostGenPanel = !showPostGenPanel" style="font-size:18px;line-height:1;color:var(--rose)">＋</div>
    </div>

    <!-- Filter chips -->
    <div class="moments-filter">
      <div class="moments-chip" :class="{ sel: filterChar === 'all' }" @click="filterChar = 'all'">全部</div>
      <div v-for="c in globalStore.characters" :key="c.id" class="moments-chip" :class="{ sel: filterChar === c.id }" @click="filterChar = c.id">
        {{ c.name }}
      </div>
    </div>

    <!-- Gen Panel -->
    <div v-if="showPostGenPanel" style="margin:4px 16px 0">
      <button class="diary-gen-btn" @click="generatePost" :disabled="isGenning">
        <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>{{ genLabel }}</span>
      </button>
    </div>

    <!-- Posts List -->
    <div class="moments-list" style="padding-bottom: 80px;">
      <div v-if="!filteredPosts.length" class="bb-empty">
        <div class="bb-empty-ic">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
        </div>
        <div class="bb-empty-ttl">還沒有貼文</div>
        <div class="bb-empty-sub">點擊右上角「＋」發一則貼文</div>
      </div>

      <div v-for="p in filteredPosts" :key="p.id" class="post-card">
        <div class="post-card-top">
          <div class="post-av">
            <img v-if="getChar(p.charId).avatar?.startsWith('data:')" :src="getChar(p.charId).avatar" style="width:100%;height:100%;object-fit:cover;border-radius:12px">
            <span v-else>{{ getChar(p.charId).avatar || '🌸' }}</span>
          </div>
          <div>
            <div class="post-name">{{ getChar(p.charId).name }}</div>
            <div class="post-time">{{ timeAgo(p.createdAt) }}</div>
          </div>
        </div>
        <div class="post-body" v-html="formatContent(p.content)"></div>
        <div v-if="p.tags?.length" class="post-tags">
          <span v-for="t in p.tags" :key="t" class="post-tag">#{{ t }}</span>
        </div>
        <div class="post-actions">
          <div class="post-like-btn" :class="{ liked: p.likedByMe }" @click="toggleLike(p)">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            {{ p.likes || '' }}
          </div>
          <div class="post-comment-btn">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            {{ p.comments?.length || '' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { globalStore } from '../store/index.js';
import { dbAll, dbPut, getSetting } from '../services/db.js';

const posts = ref([]);
const filterChar = ref('all');
const showPostGenPanel = ref(false);
const isGenning = ref(false);

onMounted(async () => {
  await loadPosts();
});

async function loadPosts() {
  const all = await dbAll('moments');
  all.sort((a, b) => b.createdAt - a.createdAt);
  posts.value = all;
}

const filteredPosts = computed(() => {
  if (filterChar.value === 'all') return posts.value;
  return posts.value.filter(p => p.charId === filterChar.value);
});

const genLabel = computed(() => {
  if (isGenning.value) return '生成中...';
  if (filterChar.value !== 'all') {
    const c = getChar(filterChar.value);
    return `讓 ${c.name} 發一則貼文`;
  }
  return '請先選擇上方角色再生成';
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

function formatContent(str) {
  return (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

async function toggleLike(p) {
  p.likedByMe = !p.likedByMe;
  p.likes = (p.likes || 0) + (p.likedByMe ? 1 : -1);
  if (p.likes < 0) p.likes = 0;
  await dbPut('moments', JSON.parse(JSON.stringify(p))); // Vue ref to pure object
}

async function generatePost() {
  if (filterChar.value === 'all') {
    alert('請先在上方選擇要發文的角色！');
    return;
  }
  const charId = filterChar.value;
  isGenning.value = true;
  
  try {
    // We mock the generation for now to avoid freezing the UI since chatEngine logic is huge
    // In next phase we can move generatePost into a momentsEngine.js
    alert('貼文生成引擎即將移植，敬請期待');
  } finally {
    isGenning.value = false;
  }
}
</script>
