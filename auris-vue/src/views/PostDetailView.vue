<template>
  <div ref="pageRoot" class="page active keyboard-page" id="pg-post-detail" style="display:flex;flex-direction:column">
    <div class="ph keyboard-header">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">貼文</div>
      <div></div>
    </div>
    
    <div id="post-detail-content" class="keyboard-scroll">
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
          <div class="post-menu-btn" @click="showPostMenu = true" style="margin-left:auto;padding:2px 8px;font-size:18px;line-height:1;color:var(--text-3);cursor:pointer">⋯</div>
        </div>
        <div v-if="!editingPost" class="post-body" style="cursor:default" v-html="formatContent(post.content)"></div>
        <div v-else style="margin-top:6px">
          <textarea v-model="editPostText" class="post-edit-area" rows="6"></textarea>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
            <button class="post-edit-btn" @click="editingPost = false">取消</button>
            <button class="post-edit-btn primary" @click="saveEditPost">儲存</button>
          </div>
        </div>
        <div class="post-tags" v-if="!editingPost && post.tags && post.tags.length" style="margin-top:10px">
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
          <div v-for="(cm, idx) in post.comments" :key="idx" class="post-comment-item"
            @touchstart="startPressComment($event, idx)" @touchend="cancelPressComment" @touchmove="cancelPressComment"
            @mousedown="startPressComment($event, idx)" @mouseup="cancelPressComment" @mouseleave="cancelPressComment">
            <div class="comment-av" :style="cm.role === 'user' ? 'background:var(--surface3)' : ''">
              <template v-if="cm.role === 'user'">
                <img v-if="meAvatar && meAvatar.startsWith('data:')" :src="meAvatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
                <span v-else>{{ meAvatar || '🙂' }}</span>
              </template>
              <template v-else>
                <img v-if="getAvatar(post.charId) && getAvatar(post.charId).startsWith('data:')" :src="getAvatar(post.charId)" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
                <span v-else>{{ getAvatar(post.charId) || '🌸' }}</span>
              </template>
            </div>
            <div class="comment-body">
              <div class="comment-name">{{ cm.role === 'user' ? (meName || '你') : getName(post.charId) }}</div>
              <div v-if="editingCommentIdx !== idx" class="comment-text" v-html="formatContent(cm.content)"></div>
              <div v-else style="margin:2px 0">
                <textarea v-model="editCommentText" class="post-edit-area" rows="3"></textarea>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
                  <button class="post-edit-btn" @click="editingCommentIdx = -1">取消</button>
                  <button class="post-edit-btn primary" @click="saveEditComment(idx)">儲存</button>
                </div>
              </div>
              <div class="comment-time">{{ timeAgo(cm.createdAt) }}</div>
            </div>
          </div>
        </div>
        <!-- Replying Indicator -->
        <div v-if="isReplying" class="post-comment-item" style="opacity:0.6">
          <div class="comment-av">
            <img v-if="getAvatar(post.charId) && getAvatar(post.charId).startsWith('data:')" :src="getAvatar(post.charId)" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
            <span v-else>{{ getAvatar(post.charId) || '🌸' }}</span>
          </div>
          <div class="comment-body">
            <div class="comment-name">{{ getName(post.charId) }}</div>
            <div style="display:flex;gap:4px;align-items:center;padding:4px 0">
              <div class="tdot"></div><div class="tdot"></div><div class="tdot"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="post-comment-bar keyboard-input-bar">
      <textarea class="post-comment-in" ref="commentInp" v-model="inputComment" placeholder="留個言…" rows="1"
        @keydown.enter.ctrl.prevent="submitComment" @keydown.enter.meta.prevent="submitComment" @input="autoResize"></textarea>
      <button class="post-comment-send" @click="submitComment" :disabled="isReplying">
        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>

    <!-- 貼文管理 Action Sheet -->
    <div class="msg-sheet-mask show" v-if="showPostMenu" @click="showPostMenu = false"></div>
    <div class="msg-sheet show" v-if="showPostMenu">
      <div class="msg-sheet-item" @click="startEditPost">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>編輯貼文</span>
      </div>
      <div class="msg-sheet-item" @click="doRegeneratePost">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        <span>重新生成貼文</span>
      </div>
      <div class="msg-sheet-item danger" @click="doDeletePost">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        <span>刪除貼文</span>
      </div>
      <div class="msg-sheet-cancel" @click="showPostMenu = false">取消</div>
    </div>

    <!-- 留言/回覆管理 Action Sheet -->
    <div class="msg-sheet-mask show" v-if="activeComment" @click="activeComment = null"></div>
    <div class="msg-sheet show" v-if="activeComment">
      <div class="msg-sheet-item" @click="doCopyComment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>
        <span>複製</span>
      </div>
      <div class="msg-sheet-item" @click="startEditComment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>編輯</span>
      </div>
      <div class="msg-sheet-item" v-if="activeComment.role === 'assistant'" @click="doRegenerateComment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        <span>重新生成回覆</span>
      </div>
      <div class="msg-sheet-item danger" @click="doDeleteComment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        <span>刪除</span>
      </div>
      <div class="msg-sheet-cancel" @click="activeComment = null">取消</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { globalStore } from '../store/index.js';
import { dbGet, dbPut, dbDel, getSetting } from '../services/db.js';
import { generateCommentReply, regenerateCommentReply, regeneratePost } from '../services/contentEngine.js';
import { formatContent } from '../services/format.js';
import { installKeyboardViewport } from '../services/keyboardViewport.js';

const route = useRoute();
const router = useRouter();
const postId = route.params.id;

const post = ref(null);
const inputComment = ref('');
const commentInp = ref(null);
const pageRoot = ref(null);
let stopKeyboardViewport = null;
const meName = ref('');
const meAvatar = ref('🙂');
const isReplying = ref(false);

// 管理：貼文選單／編輯、留言選單／編輯
const showPostMenu = ref(false);
const editingPost = ref(false);
const editPostText = ref('');
const activeComment = ref(null);   // 長按選中的留言物件
const activeCommentIdx = ref(-1);
const editingCommentIdx = ref(-1);
const editCommentText = ref('');

onMounted(async () => {
  stopKeyboardViewport = installKeyboardViewport(pageRoot.value);
  await globalStore.loadCharacters();
  const meSetting = await getSetting('me_settings');
  if (meSetting && meSetting.name) meName.value = meSetting.name;
  if (meSetting && meSetting.avatar) meAvatar.value = meSetting.avatar;

  await loadPost();
  if (route.query.edit) startEditPost();   // 從列表「編輯貼文」進來
});

onUnmounted(() => {
  stopKeyboardViewport?.();
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
  if (mins < 60) return `${mins}分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小時前`;
  return `${Math.floor(hrs / 24)}天前`;
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
    console.error('Comment reply error:', err);
    // Still reload to check if there's a partial result
    await loadPost();
  } finally {
    isReplying.value = false;
  }
}

// ── 貼文管理 ──
function startEditPost() {
  showPostMenu.value = false;
  editPostText.value = post.value?.content || '';
  editingPost.value = true;
}

async function saveEditPost() {
  const text = editPostText.value.trim();
  if (!text) { window.toast_('內容不可空白'); return; }
  post.value.content = text;
  await dbPut('moments', JSON.parse(JSON.stringify(post.value)));
  editingPost.value = false;
  window.toast_('已儲存');
}

async function doRegeneratePost() {
  showPostMenu.value = false;
  if (!await window.confirm_('重新生成這則貼文？舊內容與留言會被覆蓋。')) return;
  try {
    await regeneratePost(postId);
    await loadPost();
    window.toast_('已重新生成');
  } catch (err) {
    window.toast_('重新生成失敗：' + err.message);
  }
}

async function doDeletePost() {
  showPostMenu.value = false;
  if (!await window.confirm_('確定刪除這則貼文？留言會一併刪除。')) return;
  await dbDel('moments', postId);
  window.toast_('已刪除貼文');
  router.push('/moments');
}

// ── 留言/回覆長按選單 ──
let pressTimer = null;
let pressStartXY = null;

function startPressComment(e, idx) {
  if (editingCommentIdx.value === idx) return;   // 編輯中不觸發
  const t = e.touches ? e.touches[0] : e;
  pressStartXY = { x: t.clientX, y: t.clientY };
  pressTimer = setTimeout(() => {
    if (navigator.vibrate) navigator.vibrate(20);
    activeCommentIdx.value = idx;
    activeComment.value = post.value?.comments?.[idx] || null;
  }, 380);
}

function cancelPressComment(e) {
  if (e && (e.type === 'touchmove' || e.type === 'mousemove') && pressStartXY) {
    const t = e.touches ? e.touches[0] : e;
    if (Math.abs(t.clientX - pressStartXY.x) < 8 && Math.abs(t.clientY - pressStartXY.y) < 8) return;
  }
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
  pressStartXY = null;
}

function copyTextSync(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.focus();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) return true;
  } catch (e) {}
  if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).catch(() => {}); return true; }
  return false;
}

function doCopyComment() {
  const ok = copyTextSync(activeComment.value?.content || '');
  activeComment.value = null;
  window.toast_(ok ? '已複製' : '複製失敗，請手動選取');
}

function startEditComment() {
  editingCommentIdx.value = activeCommentIdx.value;
  editCommentText.value = activeComment.value?.content || '';
  activeComment.value = null;
}

async function saveEditComment(idx) {
  const text = editCommentText.value.trim();
  if (!text) { window.toast_('內容不可空白'); return; }
  post.value.comments[idx].content = text;
  await dbPut('moments', JSON.parse(JSON.stringify(post.value)));
  editingCommentIdx.value = -1;
  window.toast_('已儲存');
}

async function doDeleteComment() {
  const idx = activeCommentIdx.value;
  activeComment.value = null;
  if (idx < 0) return;
  if (!await window.confirm_('確定刪除這則留言？')) return;
  post.value.comments.splice(idx, 1);
  await dbPut('moments', JSON.parse(JSON.stringify(post.value)));
  window.toast_('已刪除');
}

async function doRegenerateComment() {
  const idx = activeCommentIdx.value;
  activeComment.value = null;
  if (idx < 0) return;
  isReplying.value = true;
  try {
    await regenerateCommentReply(postId, idx);
    await loadPost();
  } catch (err) {
    console.error('regenerate comment error:', err);
    await loadPost();
  } finally {
    isReplying.value = false;
  }
}
</script>
