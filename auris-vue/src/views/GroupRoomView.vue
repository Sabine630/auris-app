<template>
  <div class="page active" id="pg-group-room" style="display:flex;flex-direction:column; height: 100%">
    <div class="chat-hd">
      <div class="chat-hd-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg></div>
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
            <div class="msg-bubble" v-html="formatContent(m.content, globalStore.chatFormatStyle)"></div>
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
                <div class="msg-bubble" :class="{ streaming: m.isStreaming }" v-html="formatContent(m.content, globalStore.chatFormatStyle)"></div>
                <div class="msg-time">{{ fmtT(m.createdAt) }}</div>
              </div>
            </div>
            <div v-else class="msg-cont them">
              <div class="msg-bubble" :class="{ streaming: m.isStreaming }" v-html="formatContent(m.content, globalStore.chatFormatStyle)"></div>
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

    <!-- Group Info / Edit Modal -->
    <div class="menu-overlay" v-if="showGroupInfo" @click="showGroupInfo = false"></div>
    <div class="bottom-menu" :style="{ display: showGroupInfo ? 'block' : 'none' }">
      <div style="padding:16px;border-bottom:.5px solid var(--border);text-align:center;font-weight:500">群組設定</div>
      <div style="max-height:60vh;overflow-y:auto;padding:8px 0">
        
        <!-- Group Name Edit -->
        <div style="padding:12px 16px">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:6px;font-weight:400;letter-spacing:.04em">群組名稱</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input v-if="isEditingName" class="form-input" v-model="editNameValue" type="text" maxlength="20"
              style="flex:1;font-size:14px;padding:8px 12px" @keydown.enter="saveGroupName">
            <div v-else style="flex:1;font-size:14px;font-weight:500">{{ groupName }}</div>
            <button v-if="isEditingName" @click="saveGroupName"
              style="padding:6px 14px;border-radius:8px;background:var(--rose);color:#fff;border:none;font-size:12px;font-weight:500;cursor:pointer">儲存</button>
            <button v-else @click="startEditName"
              style="padding:6px 14px;border-radius:8px;background:var(--surface);color:var(--text);border:.5px solid var(--border);font-size:12px;font-weight:400;cursor:pointer">修改</button>
          </div>
        </div>
        
        <div style="height:.5px;background:var(--border);margin:4px 16px"></div>
        
        <!-- Members Management -->
        <div style="padding:12px 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:11px;color:var(--text-3);font-weight:400;letter-spacing:.04em">成員管理</div>
            <button v-if="!isEditingMembers" @click="startEditMembers"
              style="padding:4px 12px;border-radius:8px;background:var(--surface);color:var(--text);border:.5px solid var(--border);font-size:11px;font-weight:400;cursor:pointer">變更成員</button>
            <button v-else @click="saveMembers"
              style="padding:4px 12px;border-radius:8px;background:var(--rose);color:#fff;border:none;font-size:11px;font-weight:500;cursor:pointer">確認</button>
          </div>
          
          <!-- Normal member list -->
          <div v-if="!isEditingMembers">
            <div v-for="m in members" :key="m.id" class="menu-item" @click="startChat(m.id)">
              <div style="width:36px;height:36px;border-radius:10px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden">
                <img v-if="m.avatar && m.avatar.startsWith('data:')" :src="m.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
                <span v-else>{{ m.avatar || '🌸' }}</span>
              </div>
              <span>{{ m.name }}</span>
            </div>
          </div>
          
          <!-- Edit member list (select/deselect) -->
          <div v-else>
            <div style="font-size:11px;color:var(--text-3);margin-bottom:8px">勾選要加入群組的角色（至少 2 位）</div>
            <div v-for="c in allCharacters" :key="c.id" 
                 style="display:flex;align-items:center;gap:10px;padding:8px 4px;cursor:pointer;border-radius:8px;transition:background .15s"
                 :style="editMemberIds.includes(c.id) ? 'background:var(--rose-pale)' : ''"
                 @click="toggleMember(c.id)">
              <div style="width:20px;height:20px;border-radius:6px;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0"
                   :style="editMemberIds.includes(c.id) ? 'background:var(--rose);border-color:var(--rose)' : ''">
                <svg v-if="editMemberIds.includes(c.id)" viewBox="0 0 16 16" style="width:12px;height:12px;stroke:#fff;stroke-width:2;fill:none">
                  <polyline points="3 8 7 12 13 4"/>
                </svg>
              </div>
              <div style="width:32px;height:32px;border-radius:8px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden;flex-shrink:0">
                <img v-if="c.avatar && c.avatar.startsWith('data:')" :src="c.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
                <span v-else>{{ c.avatar || '🌸' }}</span>
              </div>
              <span style="font-size:13px;font-weight:400">{{ c.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet, dbIdx, dbPut, dbAll } from '../services/db.js';
import { sendGroupMessage, generateGroupAIResponseStream } from '../services/chatEngine.js';
import { formatContent } from '../services/format.js';
import { globalStore } from '../store/index.js';

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

// Edit state
const isEditingName = ref(false);
const editNameValue = ref('');
const isEditingMembers = ref(false);
const editMemberIds = ref([]);
const allCharacters = ref([]);

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

function startChat(id) {
  router.push('/chat/' + id);
}

// ── Group Name Edit ──
function startEditName() {
  editNameValue.value = groupName.value;
  isEditingName.value = true;
}

async function saveGroupName() {
  const newName = editNameValue.value.trim();
  if (!newName) return;
  groupName.value = newName;
  group.value.name = newName;
  await dbPut('groups', JSON.parse(JSON.stringify(group.value)));
  isEditingName.value = false;
}

// ── Members Edit ──
async function startEditMembers() {
  // Load all characters for selection
  allCharacters.value = await dbAll('characters');
  editMemberIds.value = [...group.value.members];
  isEditingMembers.value = true;
}

function toggleMember(id) {
  const idx = editMemberIds.value.indexOf(id);
  if (idx > -1) editMemberIds.value.splice(idx, 1);
  else editMemberIds.value.push(id);
}

async function saveMembers() {
  if (editMemberIds.value.length < 2) {
    // Use a visible inline warning instead of alert for better UX
    // TODO(security): Consider using a custom modal component instead of alert
    window.toast_('群組至少需要 2 位成員');
    return;
  }
  group.value.members = [...editMemberIds.value];
  await dbPut('groups', JSON.parse(JSON.stringify(group.value)));
  
  // Reload members data
  members.value = [];
  for (const charId of group.value.members) {
    const c = await dbGet('characters', charId);
    if (c) members.value.push(c);
  }
  
  isEditingMembers.value = false;
}

// ── Send Message ──
async function sendMsg() {
  const content = inputContent.value.trim();
  if (!content || typingCharId.value) return;

  const userMsg = await sendGroupMessage(groupId, 'user', content);
  messages.value.push(userMsg);

  inputContent.value = '';
  autoResize();
  scrollToBottom();

  // Determine who should reply based on @mention
  let targetChars = [];
  for (const m of members.value) {
    if (content.includes(`@${m.name}`) || content.includes(m.name)) {
      targetChars.push(m);
    }
  }

  // If no mention, all members reply in shuffled order
  if (targetChars.length === 0) {
    targetChars = [...members.value].sort(() => Math.random() - 0.5);
  }

  for (let i = 0; i < targetChars.length; i++) {
    const targetChar = targetChars[i];

    if (i > 0) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
    }

    typingCharId.value = targetChar.id;
    scrollToBottom();

    let streamIdx = -1;
    try {
      const msg = await generateGroupAIResponseStream(groupId, targetChar.id, messages.value, members.value, {
        onStart() {
          messages.value.push({ id: 'streaming_' + Date.now(), groupId, charId: targetChar.id, content: '', createdAt: Date.now(), isStreaming: true });
          streamIdx = messages.value.length - 1;
          typingCharId.value = null;
          scrollToBottom();
        },
        onChunk(text) {
          if (streamIdx !== -1) {
            messages.value[streamIdx].content += text;
            if (isNearBottom()) scrollToBottom();
          }
        }
      });
      if (streamIdx !== -1) {
        if (msg) messages.value.splice(streamIdx, 1, msg);
        else messages.value.splice(streamIdx, 1);
      } else if (msg) {
        messages.value.push(msg);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Group chat error:', err);
      if (streamIdx !== -1) messages.value.splice(streamIdx, 1);
      window.toast_('回覆失敗：' + err.message);
    }
    typingCharId.value = null;
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
</style>
