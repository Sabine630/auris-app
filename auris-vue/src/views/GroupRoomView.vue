<template>
  <div class="page active" id="pg-group-room" style="display:flex;flex-direction:column; height: 100%">
    <div class="chat-hd">
      <div class="chat-hd-back" @click="$router.push('/group-list')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg></div>
      <div class="chat-hd-av" style="font-size:18px">👥</div>
      <div class="chat-hd-info">
        <div class="chat-hd-name">{{ groupName }}</div>
        <div class="chat-hd-status">{{ members.length }} 位成員</div>
      </div>
      <div class="chat-hd-more" @click="showGroupInfo = true">⋯</div>
    </div>
    
    <div style="flex:1;overflow-y:auto;scrollbar-width:none" id="grp-scroll" ref="scrollArea">
      <div class="chat-msgs">
        
        <div v-if="!messages.length" style="text-align:center;padding:32px 0;font-size:12px;font-weight:300;color:var(--text-3);letter-spacing:.04em">
          開始群組聊天
        </div>

        <template v-for="(m, i) in messages" :key="m.id">
          <!-- User Message -->
          <div v-if="m.charId === 'user'" class="msg me" :class="{'msg-cont': isCont(i)}">
            <div class="msg-bubble" v-html="formatContent(m.content)"></div>
            <div v-if="!isCont(i)" class="msg-time">{{ fmtT(m.createdAt) }}</div>
          </div>

          <!-- Character Message -->
          <template v-else>
            <div v-if="!isCont(i)" class="msg-with-av">
              <div class="msg-av" @click="startChat(m.charId)">
                <img v-if="getAvatar(m.charId) && getAvatar(m.charId).startsWith('data:')" :src="getAvatar(m.charId)" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
                <span v-else>{{ getAvatar(m.charId) || '🌸' }}</span>
              </div>
              <div class="msg them">
                <div style="font-size:11px;color:var(--text-3);margin-bottom:2px;margin-left:4px">{{ getName(m.charId) }}</div>
                <div class="msg-bubble" v-html="formatContent(m.content)"></div>
                <div class="msg-time">{{ fmtT(m.createdAt) }}</div>
              </div>
            </div>
            <div v-else class="msg-cont them">
              <div class="msg-bubble" v-html="formatContent(m.content)"></div>
            </div>
          </template>
        </template>

        <!-- Typing Indicator -->
        <div v-if="typingCharId" class="msg-with-av">
          <div class="msg-av">
            <img v-if="getAvatar(typingCharId) && getAvatar(typingCharId).startsWith('data:')" :src="getAvatar(typingCharId)" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
            <span v-else>{{ getAvatar(typingCharId) || '🌸' }}</span>
          </div>
          <div class="msg them">
            <div style="font-size:11px;color:var(--text-3);margin-bottom:2px;margin-left:4px">{{ getName(typingCharId) }}</div>
            <div class="msg-bubble" style="padding:12px 16px;background:var(--surface);border-radius:18px 18px 18px 4px">
              <div style="display:flex;gap:4px;align-items:center">
                <div class="tdot"></div><div class="tdot"></div><div class="tdot"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
    
    <div class="chat-ia">
      <textarea class="chat-in" ref="chatInp" v-model="inputContent" placeholder="說點什麼或 @點名…" rows="1"
        @keydown.enter.exact.prevent="sendMsg" @input="autoResize"></textarea>
      <button class="chat-send" @click="sendMsg" :disabled="!!typingCharId">
        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>

    <!-- Modals -->
    <div class="menu-overlay" v-if="showGroupInfo" @click="showGroupInfo = false"></div>
    <div class="bottom-menu" :style="{ display: showGroupInfo ? 'block' : 'none' }">
      <div style="padding:16px;border-bottom:.5px solid var(--border);text-align:center;font-weight:500">群組成員</div>
      <div style="max-height:50vh;overflow-y:auto;padding:8px 0">
        <div v-for="m in members" :key="m.id" class="menu-item" @click="startChat(m.id)">
          <div style="width:36px;height:36px;border-radius:10px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden">
            <img v-if="m.avatar && m.avatar.startsWith('data:')" :src="m.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
            <span v-else>{{ m.avatar || '🌸' }}</span>
          </div>
          <span>{{ m.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet, dbIdx } from '../services/db.js';
import { sendGroupMessage, generateGroupAIResponse } from '../services/chatEngine.js';

const route = useRoute();
const router = useRouter();
const groupId = route.params.id;

const group = ref(null);
const groupName = ref('群組');
const members = ref([]);
const messages = ref([]);
const inputContent = ref('');
const typingCharId = ref(null);
const showGroupInfo = ref(false);

const scrollArea = ref(null);
const chatInp = ref(null);

onMounted(async () => {
  const g = await dbGet('groups', groupId);
  if (!g) {
    router.push('/group-list');
    return;
  }
  group.value = g;
  groupName.value = g.name || '群組';

  for (const charId of g.members) {
    const c = await dbGet('characters', charId);
    if (c) members.value.push(c);
  }

  await loadMessages();
});

async function loadMessages() {
  const msgs = await dbIdx('group_messages', 'groupId', groupId);
  msgs.sort((a, b) => a.createdAt - b.createdAt);
  messages.value = msgs;
  scrollToBottom();
}

function getAvatar(id) {
  const c = members.value.find(x => x.id === id);
  return c ? c.avatar : '🌸';
}

function getName(id) {
  const c = members.value.find(x => x.id === id);
  return c ? c.name : 'Unknown';
}

function isCont(i) {
  if (i === 0) return false;
  const m = messages.value[i];
  const prev = messages.value[i - 1];
  if (!prev) return false;
  return prev.charId === m.charId && (m.createdAt - prev.createdAt) < 120000;
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

function startChat(id) {
  router.push('/chat/' + id);
}

async function sendMsg() {
  const content = inputContent.value.trim();
  if (!content || typingCharId.value) return;

  const userMsg = await sendGroupMessage(groupId, 'user', content);
  messages.value.push(userMsg);
  
  inputContent.value = '';
  autoResize();
  scrollToBottom();

  // Determine who should reply based on @mention
  let targetChar = null;
  for (const m of members.value) {
    if (content.includes(`@${m.name}`) || content.includes(m.name)) {
      targetChar = m;
      break;
    }
  }
  
  // If no mention, pick a random character
  if (!targetChar) {
    targetChar = members.value[Math.floor(Math.random() * members.value.length)];
  }

  if (targetChar) {
    typingCharId.value = targetChar.id;
    scrollToBottom();
    try {
      const msg = await generateGroupAIResponse(groupId, targetChar.id, messages.value, members.value);
      if (msg) {
        messages.value.push(msg);
        scrollToBottom();
      }
    } catch (err) {
      console.error(err);
      alert('錯誤：' + err.message);
    } finally {
      typingCharId.value = null;
    }
  }
}
</script>

<style scoped>
.page { height: 100%; }
</style>
