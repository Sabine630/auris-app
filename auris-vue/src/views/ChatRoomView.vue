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
            <div class="msg-bubble" :data-msg-id="m.id" data-role="user" v-html="formatContent(m.content)"></div>
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
                <div class="msg-bubble" :data-msg-id="m.id" data-role="assistant" v-html="formatContent(m.content)"></div>
                <div class="msg-time">{{ fmtT(m.createdAt) }}</div>
              </div>
            </div>
            <div v-else class="msg-cont them">
              <div class="msg-bubble" :data-msg-id="m.id" data-role="assistant" v-html="formatContent(m.content)"></div>
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
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet, dbIdx, dbDel } from '../services/db.js';
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
      // TODO(security): Use custom modal instead of alert in production
      window.alert('⚠ 回覆可能被截斷，可長按訊息重新生成 (後續實作長按功能)');
    }
  } catch (err) {
    console.error('Chat error:', err);
    // TODO(security): Use custom modal instead of alert in production
    window.alert('錯誤：' + err.message);
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
    window.alert('目前沒有聊天記錄可以匯出');
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
</script>

<style scoped>
.page { height: 100%; }
</style>
