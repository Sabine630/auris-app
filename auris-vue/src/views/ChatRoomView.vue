<template>
  <div class="page active" id="pg-chat-room" style="display:flex;flex-direction:column; height: 100%">
    <!-- Header -->
    <div class="chat-hd">
      <div class="chat-hd-back" @click="$router.push('/')">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>
      </div>
      <div class="chat-hd-av" id="chat-av">
        <img v-if="cAvatar && cAvatar.startsWith('data:')" :src="cAvatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
        <span v-else>{{ cAvatar || '🌸' }}</span>
      </div>
      <div class="chat-hd-info">
        <div class="chat-hd-name" id="chat-name">{{ cName }}</div>
        <div class="chat-hd-status" id="chat-status">在線</div>
      </div>
      <div class="chat-hd-mem" @click="openMemDrawer" :title="enabledMemCount ? `${enabledMemCount} 筆記憶已開啟` : '記憶抽屜'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        </svg>
        <span v-if="enabledMemCount" class="mem-badge">{{ enabledMemCount }}</span>
      </div>
      <div class="chat-hd-more" @click="showMenu = true">⋯</div>
    </div>

    <!-- Scroll Area -->
    <div style="flex:1;overflow-y:auto;scrollbar-width:none" id="chat-scroll" ref="scrollArea">
      <div class="chat-msgs" id="chat-msgs">
        
        <div v-if="!messages.length" style="text-align:center;padding:32px 0;font-size:12px;font-weight:300;color:var(--text-3);letter-spacing:.04em">
          說點什麼，開始你們的故事
        </div>

        <template v-for="(m, i) in messages" :key="m.id">
          <!-- Heart Voice Insert -->
          <div v-if="m.type === 'hv'" class="hv-inline">
            <div class="hv-label">heart voice</div>
            <div class="hv-text">{{ m.content }}</div>
          </div>

          <!-- User Message -->
          <div v-else-if="m.role === 'user'" class="msg-with-av me-side">
            <div v-if="!isCont(i)" class="msg-av">
              <img v-if="meAvatar && meAvatar.startsWith('data:')" :src="meAvatar" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
              <span v-else>{{ meAvatar || '🙂' }}</span>
            </div>
            <div v-else class="msg-av-spacer"></div>
            <div class="msg me">
              <div class="msg-bubble" :class="{ 'long-pressing': pressingMsgId === m.id }" :data-msg-id="m.id" data-role="user" v-html="formatContent(m.content)" @touchstart="startPress($event, m)" @touchmove="cancelPress" @touchend="cancelPress" @touchcancel="cancelPress" @mousedown="startPress($event, m)" @mousemove="cancelPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent></div>
              <div v-if="m.reaction" class="msg-reaction" @click="removeReaction(m)">{{ m.reaction }}</div>
              <div v-if="!isCont(i)" class="msg-time">{{ fmtT(m.createdAt) }}</div>
            </div>
          </div>

          <!-- AI Message -->
          <template v-else>
            <div v-if="!isCont(i)" class="msg-with-av">
              <div class="msg-av">
                <img v-if="cAvatar && cAvatar.startsWith('data:')" :src="cAvatar" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
                <span v-else>{{ cAvatar || '🌸' }}</span>
              </div>
              <div class="msg them">
                <div class="msg-bubble" :class="{ 'long-pressing': pressingMsgId === m.id, streaming: m.isStreaming }" :data-msg-id="m.id" data-role="assistant" v-html="formatContent(m.content)" @touchstart="startPress($event, m)" @touchmove="cancelPress" @touchend="cancelPress" @touchcancel="cancelPress" @mousedown="startPress($event, m)" @mousemove="cancelPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent></div>
                <div v-if="m.reaction" class="msg-reaction" @click="removeReaction(m)">{{ m.reaction }}</div>
                <div class="msg-time">{{ fmtT(m.createdAt) }}</div>
              </div>
            </div>
            <div v-else class="msg-cont them">
              <div class="msg-bubble" :class="{ 'long-pressing': pressingMsgId === m.id, streaming: m.isStreaming }" :data-msg-id="m.id" data-role="assistant" v-html="formatContent(m.content)" @touchstart="startPress($event, m)" @touchmove="cancelPress" @touchend="cancelPress" @touchcancel="cancelPress" @mousedown="startPress($event, m)" @mousemove="cancelPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent></div>
              <div v-if="m.reaction" class="msg-reaction msg-reaction-cont" @click="removeReaction(m)">{{ m.reaction }}</div>
            </div>
          </template>
        </template>

        <!-- Typing Indicator -->
        <div v-if="isTyping" class="msg them" id="typing">
          <div class="msg-bubble" style="padding:12px 16px;border:.5px solid var(--border);background:var(--surface);border-radius:18px 18px 18px 4px;box-shadow:var(--sh)">
            <div style="display:flex;gap:4px;align-items:center">
              <div class="tdot"></div><div class="tdot"></div><div class="tdot"></div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Mode Bar -->
    <div v-if="editingMsgRef" style="background:var(--rose);color:#fff;font-size:12px;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;animation:fade-in .2s ease">
      <div style="display:flex;align-items:center;gap:6px">
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>正在編輯歷史訊息...</span>
      </div>
      <div @click="cancelEdit" style="font-weight:600;padding:4px 8px;border-radius:4px;background:rgba(255,255,255,0.2);cursor:pointer">取消</div>
    </div>

    <!-- Input Area -->
    <div class="chat-ia">
      <textarea class="chat-in" ref="chatInp" v-model="inputContent" placeholder="說點什麼…" rows="1"
        @keydown.enter.exact.prevent="sendMsg" @input="handleInput"></textarea>
      <button class="chat-send" @click="sendMsg" :disabled="isTyping">
        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>

    <!-- Options Menu -->
    <div class="menu-overlay" v-if="showMenu" @click="showMenu = false"></div>
    <div class="bottom-menu" :style="{ display: showMenu ? 'block' : 'none' }">
      <div style="padding:16px;border-bottom:.5px solid var(--border);text-align:center;font-weight:500">聊天選項</div>
      <div style="padding:8px 0">
        <div class="menu-item" @click="goCharInfo">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span>角色資訊</span>
        </div>
        <div class="menu-item" @click="clearChat">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          <span>清除聊天記錄</span>
        </div>
        <div class="menu-item" @click="exportChat">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--text);stroke-width:1.5;fill:none">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>匯出聊天記錄</span>
        </div>
      </div>
      <div style="padding:0 16px 16px">
        <button @click="showMenu = false" style="width:100%;padding:12px;border-radius:12px;background:var(--surface);color:var(--text-3);border:.5px solid var(--border);font-size:13px;font-weight:400;cursor:pointer">取消</button>
      </div>
    </div>

    <!-- Clear Chat Confirm -->
    <div class="menu-overlay" v-if="showClearConfirm" @click="showClearConfirm = false"></div>
    <div class="bottom-menu" :style="{ display: showClearConfirm ? 'block' : 'none' }">
      <div style="padding:20px 16px;text-align:center">
        <div style="font-weight:500;font-size:15px;margin-bottom:6px">確定要清除聊天記錄嗎？</div>
        <div style="font-size:12px;color:var(--text-3);font-weight:300;line-height:1.6">
          清除後所有與「{{ cName }}」的對話記錄將無法復原。
        </div>
      </div>
      <div style="display:flex;gap:10px;padding:0 16px 20px">
        <button @click="showClearConfirm = false"
          style="flex:1;padding:12px;border-radius:12px;background:var(--surface);color:var(--text);border:.5px solid var(--border);font-size:14px;font-weight:400;cursor:pointer">取消</button>
        <button @click="confirmClearChat"
          style="flex:1;padding:12px;border-radius:12px;background:#e74c3c;color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer">確認清除</button>
      </div>
    </div>

    <!-- Memory Drawer -->
    <div class="menu-overlay" v-if="showMemDrawer" @click="showMemDrawer = false"></div>
    <div class="mem-drawer" :class="{ open: showMemDrawer }">
      <div class="mem-drawer-hd">
        <span>記憶抽屜</span>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="mem-add-btn" @click="startAddMem" title="手動新增記憶">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <div class="mem-drawer-close" @click="showMemDrawer = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
        </div>
      </div>

      <!-- 手動新增記憶表單 -->
      <div class="mem-new-form" v-if="showNewMemForm">
        <input class="mem-edit-title" v-model="newMemTitle" placeholder="標題（選填）" />
        <textarea class="mem-edit-content" v-model="newMemContent" rows="4" placeholder="輸入記憶內容..."></textarea>
        <div class="mem-edit-actions">
          <button class="mem-edit-cancel" @click="cancelAddMem">取消</button>
          <button class="mem-edit-save" @click="saveNewMem" :disabled="!newMemContent.trim()">新增</button>
        </div>
      </div>

      <div style="padding:12px 16px 8px">
        <button class="mem-sum-btn" @click="doSummarize" :disabled="isSummarizing">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:16px;height:16px;flex-shrink:0">
            <path d="M12 2a10 10 0 110 20A10 10 0 0112 2z"/><path d="M12 8v4l3 3"/>
          </svg>
          <span>{{ isSummarizing ? 'AI 總結中…' : `AI 總結近期 ${sumCount} 則對話` }}</span>
        </button>
      </div>

      <div class="mem-list" v-if="chatMems.length">
        <div class="mem-item" v-for="mem in chatMems" :key="mem.id">
          <!-- 編輯模式 -->
          <template v-if="editingMemId === mem.id">
            <div class="mem-edit-body">
              <input class="mem-edit-title" v-model="editTitle" placeholder="標題" />
              <textarea class="mem-edit-content" v-model="editContent" rows="4" placeholder="記憶內容"></textarea>
              <div class="mem-edit-actions">
                <button class="mem-edit-cancel" @click="cancelEditMem">取消</button>
                <button class="mem-edit-save" @click="saveEditMem(mem)">儲存</button>
              </div>
            </div>
          </template>
          <!-- 一般模式 -->
          <template v-else>
            <label class="mem-toggle">
              <input type="checkbox" :checked="mem.enabled" @change="toggleMem(mem)">
              <span class="mem-toggle-track"></span>
            </label>
            <div class="mem-body" @click="expandedMemId = expandedMemId === mem.id ? null : mem.id">
              <div class="mem-title">{{ mem.title }}</div>
              <div class="mem-content" :class="{ expanded: expandedMemId === mem.id }">{{ mem.content }}</div>
            </div>
            <div class="mem-edit-btn" @click="startEditMem(mem)" title="編輯">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <div class="mem-del" @click="deleteMem(mem.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </div>
          </template>
        </div>
      </div>
      <div v-else style="padding:24px 16px;text-align:center;font-size:12px;font-weight:300;color:var(--text-3)">
        還沒有記憶。點上方按鈕讓 AI 自動總結對話吧
      </div>

      <div class="mem-footer">
        <span>已開啟 {{ enabledMemCount }} 筆・約 {{ enabledTokenEstimate }} token</span>
      </div>
    </div>

    <!-- Message Action Sheet -->
    <div class="msg-sheet-mask show" v-if="activeMsg" @click="activeMsg = null"></div>
    <div class="msg-sheet show" v-if="activeMsg">
      <div class="msg-react-bar">
        <div v-for="e in REACTIONS" :key="e" class="msg-react-opt" :class="{ sel: activeMsg.reaction === e }" @click="setReaction(activeMsg, e)">{{ e }}</div>
      </div>
      <div class="msg-sheet-item" @click="doCopy(activeMsg)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>
        <span>複製</span>
      </div>
      <div class="msg-sheet-item" v-if="isLatestUserMsg(activeMsg)" @click="doEditAndResend(activeMsg)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>編輯並重傳</span>
      </div>
      <div class="msg-sheet-item" v-if="isLatestAiMsg(activeMsg)" @click="doRegenerate(activeMsg)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        <span>重新生成回覆</span>
      </div>
      <div class="msg-sheet-cancel" @click="activeMsg = null">取消</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet, dbIdx, dbDel, dbPut, getSetting } from '../services/db.js';
import { sendUserMessage, generateAIResponseStream, generateProactiveMessageStream, summarizeToMemory } from '../services/chatEngine.js';
import { formatContent } from '../services/format.js';

const route = useRoute();
const router = useRouter();
const charId = route.params.id;

const messages = ref([]);
const character = ref(null);
const inputContent = ref('');
const isTyping = ref(false);
const showMenu = ref(false);
const showClearConfirm = ref(false);

const scrollArea = ref(null);
const chatInp = ref(null);

const cName = ref('—');
const cAvatar = ref('');
const meAvatar = ref('🙂');

// ── Long Press & Actions State ──
const activeMsg = ref(null);
const pressingMsgId = ref(null);
let pressTimer = null;
let pressStartXY = null;
const editingMsgRef = ref(null);

// ── Memory Drawer State ──
const showMemDrawer = ref(false);
const chatMems = ref([]);
const isSummarizing = ref(false);
const expandedMemId = ref(null);
const editingMemId = ref(null);
const editTitle = ref('');
const editContent = ref('');
const showNewMemForm = ref(false);
const newMemTitle = ref('');
const newMemContent = ref('');
const sumCount = 20;
let isAutoSumming = false;
const REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

const enabledMemCount = computed(() => chatMems.value.filter(m => m.enabled).length);
const enabledTokenEstimate = computed(() => {
  const total = chatMems.value.filter(m => m.enabled).reduce((acc, m) => acc + m.content.length, 0);
  return Math.ceil(total / 3);
});

// ── Proactive Timer State (P49) ──
let proactiveTimer = null;
let proactiveController = null;
const isProactiveGenerating = ref(false);
const CARE_INTERVALS = { rarely: [12, 25], sometimes: [4, 10], often: [1, 4] };

onMounted(async () => {
  const c = await dbGet('characters', charId);
  if (!c) {
    router.push('/');
    return;
  }
  character.value = c;
  cName.value = c.name;
  cAvatar.value = c.avatar;

  const me = await getSetting('me_settings');
  if (me?.avatar) meAvatar.value = me.avatar;

  await loadMessages();
  await loadChatMems();
  scheduleProactive();

  // Listen for background Heart Voices
  window.addEventListener('new-heart-voice', onHeartVoice);
});

onUnmounted(() => {
  clearTimeout(proactiveTimer);
  proactiveController?.abort();
  window.removeEventListener('new-heart-voice', onHeartVoice);
});

async function loadMessages() {
  const msgs = await dbIdx('messages', 'charId', charId);
  msgs.sort((a, b) => a.createdAt - b.createdAt);
  messages.value = msgs;
  scrollToBottom();
}

async function loadChatMems() {
  const mems = await dbIdx('chat_memories', 'charId', charId);
  mems.sort((a, b) => b.createdAt - a.createdAt);
  chatMems.value = mems;
}

async function openMemDrawer() {
  await loadChatMems();
  showMemDrawer.value = true;
}

async function toggleMem(mem) {
  mem.enabled = !mem.enabled;
  await dbPut('chat_memories', { ...mem });
}

async function deleteMem(id) {
  await dbDel('chat_memories', id);
  chatMems.value = chatMems.value.filter(m => m.id !== id);
  if (editingMemId.value === id) editingMemId.value = null;
}

function startAddMem() {
  showNewMemForm.value = true;
  newMemTitle.value = '';
  newMemContent.value = '';
  editingMemId.value = null;
}

function cancelAddMem() {
  showNewMemForm.value = false;
}

async function saveNewMem() {
  const content = newMemContent.value.trim();
  if (!content) return;
  const title = newMemTitle.value.trim() || content.slice(0, 20) + (content.length > 20 ? '…' : '');
  const entry = { id: 'cmem_' + Date.now(), charId, title, content, enabled: true, createdAt: Date.now() };
  await dbPut('chat_memories', entry);
  chatMems.value.unshift(entry);
  showNewMemForm.value = false;
}

function startEditMem(mem) {
  editingMemId.value = mem.id;
  editTitle.value = mem.title;
  editContent.value = mem.content;
  expandedMemId.value = null;
}

function cancelEditMem() {
  editingMemId.value = null;
}

async function saveEditMem(mem) {
  const t = editTitle.value.trim();
  const c = editContent.value.trim();
  if (!t && !c) return;
  mem.title = t || mem.title;
  mem.content = c || mem.content;
  await dbPut('chat_memories', { ...mem });
  editingMemId.value = null;
}

// ── Proactive Timer Functions ──
function scheduleProactive() {
  clearTimeout(proactiveTimer);
  const mode = character.value?.replyMode;
  if (!mode || mode === 'manual') return;

  const care = character.value?.care || 'sometimes';
  const [min, max] = CARE_INTERVALS[care] || CARE_INTERVALS.sometimes;
  const intervalMs = (min + Math.random() * (max - min)) * 60 * 1000;

  const lastMsg = messages.value.length ? messages.value[messages.value.length - 1] : null;
  const elapsed = lastMsg ? Date.now() - lastMsg.createdAt : intervalMs + 1;
  const delay = Math.max(3000, intervalMs - elapsed);

  proactiveTimer = setTimeout(triggerProactive, delay);
}

async function triggerProactive() {
  if (isTyping.value || isProactiveGenerating.value) { scheduleProactive(); return; }

  const rawMsgs = messages.value.filter(m => m.type !== 'hv');
  proactiveController = new AbortController();
  isProactiveGenerating.value = true;

  let streamIdx = -1;
  try {
    isTyping.value = true;
    const { msg } = await generateProactiveMessageStream(charId, rawMsgs, {
      onChunk(text) {
        if (streamIdx === -1) {
          messages.value.push({ id: 'streaming_' + Date.now(), charId, role: 'assistant', content: '', createdAt: Date.now(), isStreaming: true });
          streamIdx = messages.value.length - 1;
          isTyping.value = false;
        }
        messages.value[streamIdx].content += text;
        if (isNearBottom()) scrollToBottom();
      },
      signal: proactiveController.signal
    });
    if (streamIdx !== -1) {
      messages.value.splice(streamIdx, 1, msg || null);
      if (!msg) messages.value.splice(streamIdx, 1);
    } else if (msg) {
      messages.value.push(msg);
      scrollToBottom();
    }
    if (msg) {
      await dbPut('notifications', { id: 'notif_chat_' + Date.now(), charId, type: 'chat', targetId: charId, text: '主動傳了訊息給你', read: false, createdAt: Date.now() });
    }
  } catch (err) {
    if (streamIdx !== -1) messages.value.splice(streamIdx, 1);
    if (err.name !== 'AbortError') console.error('Proactive error:', err);
  } finally {
    isTyping.value = false;
    isProactiveGenerating.value = false;
    proactiveController = null;
    scheduleProactive();
    maybeAutoSummarize();
  }
}

function handleInput() {
  autoResize();
  if (character.value?.replyMode === 'auto-interrupt' && isProactiveGenerating.value) {
    proactiveController?.abort();
  }
}

async function doSummarize() {
  if (isSummarizing.value) return;
  const rawMsgs = messages.value.filter(m => m.type !== 'hv');
  if (rawMsgs.length < 2) {
    window.toast_('對話記錄太少，無法總結');
    return;
  }
  isSummarizing.value = true;
  try {
    const mem = await summarizeToMemory(charId, rawMsgs, sumCount);
    chatMems.value.unshift(mem);
    window.toast_('已儲存 AI 總結記憶');
  } catch (err) {
    window.toast_('總結失敗：' + err.message);
  } finally {
    isSummarizing.value = false;
  }
}

// 自動總結記憶：累積到設定則數時，背景觸發一次濃縮
async function maybeAutoSummarize() {
  const c = character.value;
  if (!c?.autoSummarize || isAutoSumming || isSummarizing.value) return;

  const every = c.autoSumEvery || 30;
  const lastAt = c.lastAutoSumAt || 0;
  const rawMsgs = messages.value.filter(m => m.type !== 'hv');
  const freshCount = rawMsgs.filter(m => m.createdAt > lastAt).length;
  if (freshCount < every) return;

  isAutoSumming = true;
  try {
    const mem = await summarizeToMemory(charId, rawMsgs, every);
    chatMems.value.unshift(mem);
    c.lastAutoSumAt = Date.now();
    await dbPut('characters', { ...c });
    window.toast_('已自動總結記憶');
  } catch (err) {
    console.error('Auto summarize failed:', err);
    // 自動流程失敗不打擾使用者，下次達標再試
  } finally {
    isAutoSumming = false;
  }
}

function onHeartVoice(e) {
  const mem = e.detail;
  if (mem.charId === charId) {
    // Inject heart voice into the chat UI seamlessly
    messages.value.push({
      ...mem,
      type: 'hv' // special type so template renders it as heart voice
    });
    scrollToBottom();
  }
}

function isCont(i) {
  if (i === 0) return false;
  const m = messages.value[i];
  const prev = messages.value[i - 1];
  if (!prev) return false;
  if (m.type === 'hv' || prev.type === 'hv') return false;
  return prev.role === m.role && (m.createdAt - prev.createdAt) < 120000;
}

function fmtT(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function autoResize() {
  if (!chatInp.value) return;
  const el = chatInp.value;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollArea.value) {
      scrollArea.value.scrollTop = scrollArea.value.scrollHeight;
    }
  });
}

function isNearBottom() {
  const el = scrollArea.value;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

async function sendMsg() {
  const content = inputContent.value.trim();
  if (!content || isTyping.value) return;

  if (editingMsgRef.value) {
    const toDelete = messages.value.filter(x => x.createdAt >= editingMsgRef.value.createdAt);
    for (const x of toDelete) await dbDel('messages', x.id);
    messages.value = messages.value.filter(x => x.createdAt < editingMsgRef.value.createdAt);
    editingMsgRef.value = null;
  }

  const userMsg = await sendUserMessage(charId, content);
  messages.value.push(userMsg);
  inputContent.value = '';
  autoResize();
  scrollToBottom();

  isTyping.value = true;
  const rawMsgs = messages.value.filter(m => m.type !== 'hv');

  let streamIdx = -1;
  try {
    const { msg, truncated } = await generateAIResponseStream(charId, rawMsgs, {
      onChunk(text) {
        if (streamIdx === -1) {
          messages.value.push({ id: 'streaming_' + Date.now(), charId, role: 'assistant', content: '', createdAt: Date.now(), isStreaming: true });
          streamIdx = messages.value.length - 1;
          isTyping.value = false;
        }
        messages.value[streamIdx].content += text;
        if (isNearBottom()) scrollToBottom();
      }
    });
    if (streamIdx !== -1) {
      messages.value.splice(streamIdx, 1, msg || null);
      if (!msg) {
        messages.value.splice(streamIdx, 1);
        window.toast_('代理回傳空回應，請確認代理是否支援串流、或換用其他代理');
      }
    } else if (msg) {
      messages.value.push(msg);
      scrollToBottom();
    } else {
      window.toast_('沒有收到任何回應，請確認 API 設定與代理是否正常');
    }
    if (truncated) window.toast_('⚠ 回覆可能被截斷，可長按訊息「重新生成回覆」');
  } catch (err) {
    console.error('Chat error:', err);
    if (streamIdx !== -1) messages.value.splice(streamIdx, 1);
    window.toast_('錯誤：' + err.message);
  } finally {
    isTyping.value = false;
    scheduleProactive();
    maybeAutoSummarize();
  }
}

// ── Menu Actions ──
function goCharInfo() {
  showMenu.value = false;
  router.push('/char-edit/' + charId);
}

function clearChat() {
  showMenu.value = false;
  showClearConfirm.value = true;
}

async function confirmClearChat() {
  const msgs = await dbIdx('messages', 'charId', charId);
  for (const m of msgs) {
    await dbDel('messages', m.id);
  }
  messages.value = [];
  showClearConfirm.value = false;
}

function exportChat() {
  showMenu.value = false;
  if (!messages.value.length) {
    // TODO(security): Use custom modal instead of alert in production
    window.toast_('目前沒有聊天記錄可以匯出');
    return;
  }
  
  const lines = messages.value
    .filter(m => m.type !== 'hv')
    .map(m => {
      const time = new Date(m.createdAt).toLocaleString('zh-TW');
      const name = m.role === 'user' ? '我' : cName.value;
      return `[${time}] ${name}：${m.content}`;
    });
  
  const text = `聊天記錄 — ${cName.value}\n${'─'.repeat(30)}\n${lines.join('\n')}`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat_${cName.value}_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Long Press Handlers ──
function startPress(e, m) {
  if (m.isEditing) return;
  const t = e.touches ? e.touches[0] : e;
  pressStartXY = { x: t.clientX, y: t.clientY };
  pressingMsgId.value = m.id;
  
  pressTimer = setTimeout(() => {
    pressingMsgId.value = null;
    if (navigator.vibrate) navigator.vibrate(20);
    activeMsg.value = m;
  }, 380);
}

function cancelPress(e) {
  if (e && (e.type === 'touchmove' || e.type === 'mousemove') && pressStartXY) {
    const t = e.touches ? e.touches[0] : e;
    if (Math.abs(t.clientX - pressStartXY.x) < 8 && Math.abs(t.clientY - pressStartXY.y) < 8) return;
  }
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
  pressingMsgId.value = null;
  pressStartXY = null;
}

// ── Action Sheet Checks ──
function isLatestUserMsg(m) {
  if (m.role !== 'user') return false;
  const userMsgs = messages.value.filter(x => x.role === 'user');
  if (!userMsgs.length) return false;
  return userMsgs[userMsgs.length - 1].id === m.id;
}

function isLatestAiMsg(m) {
  if (m.role !== 'assistant') return false;
  const aiMsgs = messages.value.filter(x => x.role === 'assistant');
  if (!aiMsgs.length) return false;
  return aiMsgs[aiMsgs.length - 1].id === m.id;
}

// ── Action Implementations ──
function copyTextSync(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;-webkit-user-select:text !important;user-select:text !important';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.focus();
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    sel.removeAllRanges();
    ta.remove();
    if (ok) return true;
  } catch (e) {}
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  return false;
}

function doCopy(m) {
  const ok = copyTextSync(m.content);
  activeMsg.value = null;
  window.toast_(ok ? '已複製' : '複製失敗，請手動選取');
}

async function setReaction(m, emoji) {
  // 點同一個表情＝取消
  m.reaction = m.reaction === emoji ? '' : emoji;
  activeMsg.value = null;
  try {
    const stored = await dbGet('messages', m.id);
    if (stored) { stored.reaction = m.reaction; await dbPut('messages', stored); }
  } catch (e) { console.error('save reaction failed:', e); }
}

async function removeReaction(m) {
  m.reaction = '';
  try {
    const stored = await dbGet('messages', m.id);
    if (stored) { stored.reaction = ''; await dbPut('messages', stored); }
  } catch (e) { console.error('remove reaction failed:', e); }
}

function doEditAndResend(m) {
  activeMsg.value = null;
  if (isTyping.value) {
    window.toast_('請等對方回覆完成');
    return;
  }
  editingMsgRef.value = m;
  inputContent.value = m.content;
  autoResize();
  chatInp.value?.focus();
}

function cancelEdit() {
  editingMsgRef.value = null;
  inputContent.value = '';
  autoResize();
}

async function doRegenerate(m) {
  activeMsg.value = null;
  if (isTyping.value) {
    window.toast_('請等對方回覆完成');
    return;
  }

  const toDelete = messages.value.filter(x => x.createdAt >= m.createdAt);
  for (const x of toDelete) await dbDel('messages', x.id);
  messages.value = messages.value.filter(x => x.createdAt < m.createdAt);

  isTyping.value = true;
  const rawMsgs = messages.value.filter(x => x.type !== 'hv');

  let streamIdx = -1;
  try {
    const { msg, truncated } = await generateAIResponseStream(charId, rawMsgs, {
      onChunk(text) {
        if (streamIdx === -1) {
          messages.value.push({ id: 'streaming_' + Date.now(), charId, role: 'assistant', content: '', createdAt: Date.now(), isStreaming: true });
          streamIdx = messages.value.length - 1;
          isTyping.value = false;
        }
        messages.value[streamIdx].content += text;
        if (isNearBottom()) scrollToBottom();
      }
    });
    if (streamIdx !== -1) {
      messages.value.splice(streamIdx, 1, msg || null);
      if (!msg) {
        messages.value.splice(streamIdx, 1);
        window.toast_('代理回傳空回應，請確認代理是否支援串流、或換用其他代理');
      }
    } else if (msg) {
      messages.value.push(msg);
      scrollToBottom();
    } else {
      window.toast_('沒有收到任何回應，請確認 API 設定與代理是否正常');
    }
    if (truncated) window.toast_('⚠ 回覆可能被截斷');
  } catch (err) {
    console.error('Chat error:', err);
    if (streamIdx !== -1) messages.value.splice(streamIdx, 1);
    window.toast_('錯誤：' + err.message);
  } finally {
    isTyping.value = false;
  }
}
</script>

<style scoped>
.page { height: 100%; }

.msg-bubble.streaming::after {
  content: '▍';
  display: inline-block;
  margin-left: 1px;
  animation: blink-cursor .8s step-end infinite;
  color: var(--text-3);
  font-size: .85em;
  vertical-align: baseline;
}
@keyframes blink-cursor { 50% { opacity: 0; } }

/* Memory icon button in header */
.chat-hd-mem {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  margin-right: 2px;
  color: var(--text-3);
}
.chat-hd-mem svg { width: 20px; height: 20px; }
.mem-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--rose);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  border-radius: 6px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Memory Drawer */
.mem-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 72vh;
  background: var(--bg);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 32px rgba(0,0,0,.12);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform .3s cubic-bezier(.32,.72,0,1);
}
.mem-drawer.open { transform: translateY(0); }

.mem-drawer-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  font-weight: 500;
  font-size: 15px;
  border-bottom: .5px solid var(--border);
  flex-shrink: 0;
}
.mem-drawer-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-3);
}
.mem-drawer-close svg { width: 16px; height: 16px; }

.mem-sum-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border-radius: 12px;
  background: var(--surface);
  border: .5px solid var(--border);
  color: var(--text);
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  transition: opacity .15s;
}
.mem-sum-btn:disabled { opacity: .5; cursor: not-allowed; }

.mem-list {
  overflow-y: auto;
  flex: 1;
  padding: 4px 0 8px;
}

.mem-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: .5px solid var(--border);
}

.mem-toggle { flex-shrink: 0; margin-top: 2px; }
.mem-toggle input { display: none; }
.mem-toggle-track {
  display: block;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--border);
  position: relative;
  cursor: pointer;
  transition: background .2s;
}
.mem-toggle-track::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform .2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.mem-toggle input:checked + .mem-toggle-track { background: var(--rose); }
.mem-toggle input:checked + .mem-toggle-track::after { transform: translateX(16px); }

.mem-body { flex: 1; min-width: 0; cursor: pointer; }
.mem-title { font-size: 12px; font-weight: 500; color: var(--text); margin-bottom: 3px; }
.mem-content {
  font-size: 11px;
  font-weight: 300;
  color: var(--text-3);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mem-content.expanded {
  display: block;
  -webkit-line-clamp: unset;
  overflow: visible;
}

.mem-add-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-3);
  border-radius: 6px;
  transition: color .15s;
}
.mem-add-btn:active { color: var(--rose); }
.mem-add-btn svg { width: 18px; height: 18px; }

.mem-new-form {
  padding: 8px 16px 12px;
  border-bottom: .5px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mem-edit-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-3);
  margin-top: -2px;
}
.mem-edit-btn svg { width: 15px; height: 15px; }

.mem-del {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-3);
  margin-top: -2px;
}
.mem-del svg { width: 16px; height: 16px; }

.mem-edit-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 0;
}
.mem-edit-title {
  font-family: var(--font);
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  background: var(--surface);
  border: .5px solid var(--border-2);
  border-radius: 8px;
  padding: 7px 10px;
  outline: none;
  -webkit-user-select: text;
  user-select: text;
}
.mem-edit-content {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 300;
  color: var(--text);
  background: var(--surface);
  border: .5px solid var(--border-2);
  border-radius: 8px;
  padding: 7px 10px;
  outline: none;
  resize: none;
  line-height: 1.5;
  -webkit-user-select: text;
  user-select: text;
}
.mem-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.mem-edit-cancel, .mem-edit-save {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 400;
  padding: 5px 14px;
  border-radius: 8px;
  border: .5px solid var(--border);
  cursor: pointer;
  transition: opacity .15s;
}
.mem-edit-cancel { background: transparent; color: var(--text-3); }
.mem-edit-save { background: var(--rose); color: #fff; border-color: var(--rose); }

.mem-footer {
  padding: 10px 16px 20px;
  font-size: 11px;
  font-weight: 300;
  color: var(--text-3);
  text-align: center;
  border-top: .5px solid var(--border);
  flex-shrink: 0;
}
</style>
