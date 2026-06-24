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
          <div class="post-menu-btn" @click.stop="menuPost = p" style="margin-left:auto;padding:2px 8px;font-size:18px;line-height:1;color:var(--text-3);cursor:pointer">⋯</div>
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

    <!-- 貼文管理 Action Sheet -->
    <div class="msg-sheet-mask show" v-if="menuPost" @click="menuPost = null"></div>
    <div class="msg-sheet show" v-if="menuPost">
      <div class="msg-sheet-item" @click="editPost">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>編輯貼文</span>
      </div>
      <div class="msg-sheet-item" @click="regenPost">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        <span>重新生成貼文</span>
      </div>
      <div class="msg-sheet-item danger" @click="removePost">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        <span>刪除貼文</span>
      </div>
      <div class="msg-sheet-cancel" @click="menuPost = null">取消</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../store/index.js';
import { dbAll, dbPut, dbDel } from '../services/db.js';
import { generatePost, regeneratePost } from '../services/contentEngine.js';

const router = useRouter();
const moments = ref([]);
const filterCharId = ref('all');
const showGenPanel = ref(false);
const isGenerating = ref(false);
const menuPost = ref(null);

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

// 「編輯」：進入詳情頁的編輯模式（貼文全文在詳情頁，編輯體驗較好）
function editPost() {
  const id = menuPost.value.id;
  menuPost.value = null;
  router.push('/post/' + id + '?edit=1');
}

async function regenPost() {
  const id = menuPost.value.id;
  menuPost.value = null;
  if (!await window.confirm_('重新生成這則貼文？舊內容與留言會被覆蓋。')) return;
  try {
    const res = await regeneratePost(id);
    if (res && res.entry) {
      const i = moments.value.findIndex(m => m.id === id);
      if (i !== -1) moments.value[i] = res.entry;
      window.toast_('已重新生成');
    }
  } catch (err) {
    window.toast_('重新生成失敗：' + err.message);
  }
}

async function removePost() {
  const id = menuPost.value.id;
  menuPost.value = null;
  if (!await window.confirm_('確定刪除這則貼文？留言會一併刪除。')) return;
  await dbDel('moments', id);
  moments.value = moments.value.filter(m => m.id !== id);
  window.toast_('已刪除貼文');
}
</script>
