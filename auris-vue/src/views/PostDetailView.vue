<template>
  <div class="page active" id="pg-post-detail" style="display:flex;flex-direction:column;height:100%">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/moments')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">貼文</div>
      <div></div>
    </div>
    
    <div id="post-detail-content" style="flex:1;overflow-y:auto;scrollbar-width:none">
      <div v-if="post" class="post-detail-body">
        <div class="post-card-top">
          <div class="post-av">
            <img v-if="getAvatar(post.charId) && getAvatar(post.charId).startsWith('data:')" :src="getAvatar(post.charId)" style="width:100%;height:100%;object-fit:cover">
            <span v-else>{{ getAvatar(post.charId) || '🌸' }}</span>
          </div>
          <div>
            <div class="post-name">{{ getName(post.charId) }}</div>
            <div class="post-time">{{ timeAgo(post.createdAt) }}</div>
          </div>
        </div>
        <div class="post-body" style="cursor:default" v-html="formatContent(post.content)"></div>
        <div class="post-tags" v-if="post.tags && post.tags.length" style="margin-top:10px">
          <span v-for="t in post.tags" :key="t" class="post-tag">#{{ t }}</span>
        </div>
        <div class="post-actions" style="margin-top:12px">
          <div class="post-like-btn" :class="{ liked: post.likedByMe }" @click="toggleLike">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            <span>{{ post.likes || '' }}</span>
          </div>
        </div>
      </div>
      
      <div class="post-comments" v-if="post">
        <div v-if="!post.comments || post.comments.length === 0" style="text-align:center;padding:32px 0;font-size:12px;font-weight:300;color:var(--text-3)">
          還沒有留言，說點什麼吧
        </div>
        <div v-else>
          <div v-for="(cm, idx) in post.comments" :key="idx" class="post-comment-item">
            <div class="comment-av" :style="cm.role === 'user' ? 'background:var(--surface3)' : ''">
              <span v-if="cm.role === 'user'">🙂</span>
              <template v-else>
                <img v-if="getAvatar(post.charId) && getAvatar(post.charId).startsWith('data:')" :src="getAvatar(post.charId)" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
                <span v-else>{{ getAvatar(post.charId) || '🌸' }}</span>
              </template>
            </div>
            <div class="comment-body">
              <div class="comment-name">{{ cm.role === 'user' ? (meName || '你') : getName(post.charId) }}</div>
              <div class="comment-text" v-html="formatContent(cm.content)"></div>
              <div class="comment-time">{{ timeAgo(cm.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="post-comment-bar">
      <textarea class="post-comment-in" ref="commentInp" v-model="inputComment" placeholder="留個言…" rows="1"
        @keydown.enter.exact.prevent="submitComment" @input="autoResize"></textarea>
      <button class="post-comment-send" @click="submitComment" :disabled="isReplying">
        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { globalStore } from '../store/index.js';
import { dbGet, dbPut, getSetting } from '../services/db.js';
import { generateCommentReply } from '../services/contentEngine.js';

const route = useRoute();
const router = useRouter();
const postId = route.params.id;

const post = ref(null);
const inputComment = ref('');
const commentInp = ref(null);
const meName = ref('');
const isReplying = ref(false);

onMounted(async () => {
  await globalStore.loadCharacters();
  const meSetting = await getSetting('me_settings');
  if (meSetting && meSetting.name) meName.value = meSetting.name;
  
  await loadPost();
});

async function loadPost() {
  const p = await dbGet('moments', postId);
  if (!p) {
    router.push('/moments');
    return;
  }
  post.value = p;
  setTimeout(scrollToBottom, 100);
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
  if (mins < 60) return `${mins}分`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時`;
  return `${Math.floor(hrs / 24)}天`;
}

function formatContent(str) {
  return (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

async function toggleLike() {
  if (!post.value) return;
  post.value.likedByMe = !post.value.likedByMe;
  post.value.likes = (post.value.likes || 0) + (post.value.likedByMe ? 1 : -1);
  await dbPut('moments', JSON.parse(JSON.stringify(post.value)));
}

function autoResize() {
  if (!commentInp.value) return;
  const el = commentInp.value;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function scrollToBottom() {
  const el = document.getElementById('post-detail-content');
  if (el) el.scrollTop = el.scrollHeight;
}

async function submitComment() {
  const text = inputComment.value.trim();
  if (!text || !post.value) return;
  
  isReplying.value = true;
  
  if (!post.value.comments) post.value.comments = [];
  post.value.comments.push({
    role: 'user',
    userName: meName.value || '你',
    content: text,
    createdAt: Date.now()
  });
  
  await dbPut('moments', JSON.parse(JSON.stringify(post.value)));
  inputComment.value = '';
  autoResize();
  scrollToBottom();
  
  try {
    await generateCommentReply(postId, post.value.charId, text);
    // Reload post to get the reply
    await loadPost();
  } catch (err) {
    console.error(err);
  } finally {
    isReplying.value = false;
  }
}
</script>
