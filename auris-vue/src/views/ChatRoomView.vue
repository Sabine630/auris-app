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
          <div v-else-if="m.role === 'user'" class="msg me" :class="{'msg-cont': isCont(i)}">
            <div class="msg-bubble" :class="{ 'long-pressing': pressingMsgId === m.id }" :data-msg-id="m.id" data-role="user" v-html="formatContent(m.content)" @touchstart="startPress($event, m)" @touchmove="cancelPress" @touchend="cancelPress" @touchcancel="cancelPress" @mousedown="startPress($event, m)" @mousemove="cancelPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent></div>
            <div v-if="!isCont(i)" class="msg-time">{{ fmtT(m.createdAt) }}</div>
          </div>

          <!-- AI Message -->
          <template v-else>
            <div v-if="!isCont(i)" class="msg-with-av">
              <div class="msg-av">
                <img v-if="cAvatar && cAvatar.startsWith('data:')" :src="cAvatar" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
                <span v-else>{{ cAvatar || '🌸' }}</span>
              </div>
              <div class="msg them">
                <div class="msg-bubble" :class="{ 'long-pressing': pressingMsgId === m.id }" :data-msg-id="m.id" data-role="assistant" v-html="formatContent(m.content)" @touchstart="startPress($event, m)" @touchmove="cancelPress" @touchend="cancelPress" @touchcancel="cancelPress" @mousedown="startPress($event, m)" @mousemove="cancelPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent></div>
                <div class="msg-time">{{ fmtT(m.createdAt) }}</div>
              </div>
            </div>
            <div v-else class="msg-cont them">
              <div class="msg-bubble" :class="{ 'long-pressing': pressingMsgId === m.id }" :data-msg-id="m.id" data-role="assistant" v-html="formatContent(m.content)" @touchstart="startPress($event, m)" @touchmove="cancelPress" @touchend="cancelPress" @touchcancel="cancelPress" @mousedown="startPress($event, m)" @mousemove="cancelPress" @mouseup="cancelPress" @mouseleave="cancelPress" @contextmenu.prevent></div>
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
        @keydown.enter.exact.prevent="sendMsg" @input="autoResize"></textarea>
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

    <!-- Message Action Sheet -->
    <div class="msg-sheet-mask show" v-if="activeMsg" @click="activeMsg = null"></div>
    <div class="msg-sheet show" v-if="activeMsg">
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
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet, dbIdx, dbDel, dbPut } from '../services/db.js';
import { sendUserMessage, generateAIResponse } from '../services/chatEngine.js';

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

// ── Long Press & Actions State ──
const activeMsg = ref(null);
const pressingMsgId = ref(null);
let pressTimer = null;
let pressStartXY = null;
const editingMsgRef = ref(null);

onMounted(async () => {
  const c = await dbGet('characters', charId);
  if (!c) {
    router.push('/');
    return;
  }
  character.value = c;
  cName.value = c.name;
  cAvatar.value = c.avatar;

  await loadMessages();
  
  // Listen for background Heart Voices
  window.addEventListener('new-heart-voice', onHeartVoice);
});

onUnmounted(() => {
  window.removeEventListener('new-heart-voice', onHeartVoice);
});

async function loadMessages() {
  const msgs = await dbIdx('messages', 'charId', charId);
  msgs.sort((a, b) => a.createdAt - b.createdAt);
  messages.value = msgs;
  scrollToBottom();
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

function formatContent(str) {
  return (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
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

async function sendMsg() {
  const content = inputContent.value.trim();
  if (!content || isTyping.value) return;

  // Handle Edit & Resend deletion if in Edit Mode
  if (editingMsgRef.value) {
    const toDelete = messages.value.filter(x => x.createdAt >= editingMsgRef.value.createdAt);
    for (const x of toDelete) await dbDel('messages', x.id);
    messages.value = messages.value.filter(x => x.createdAt < editingMsgRef.value.createdAt);
    editingMsgRef.value = null;
  }

  // Insert user message locally
  const userMsg = await sendUserMessage(charId, content);
  messages.value.push(userMsg);
  
  inputContent.value = '';
  autoResize();
  scrollToBottom();

  isTyping.value = true;
  
  try {
    const rawMsgs = messages.value.filter(m => m.type !== 'hv');
    const { msg, truncated } = await generateAIResponse(charId, rawMsgs);
    if (msg) {
      messages.value.push(msg);
      scrollToBottom();
    }
    if (truncated) {
      window.toast_('⚠ 回覆可能被截斷，可長按訊息「重新生成回覆」');
    }
  } catch (err) {
    console.error('Chat error:', err);
    // TODO(security): Use custom modal instead of alert in production
    window.toast_('錯誤：' + err.message);
  } finally {
    isTyping.value = false;
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
  try {
    const rawMsgs = messages.value.filter(x => x.type !== 'hv');
    const { msg, truncated } = await generateAIResponse(charId, rawMsgs);
    if (msg) {
      messages.value.push(msg);
      scrollToBottom();
    }
    if (truncated) window.toast_('⚠ 回覆可能被截斷');
  } catch (err) {
    console.error('Chat error:', err);
    window.toast_('錯誤：' + err.message);
  } finally {
    isTyping.value = false;
  }
}
</script>

<style scoped>
.page { height: 100%; }
</style>
