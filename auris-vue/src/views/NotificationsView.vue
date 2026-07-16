<template>
  <div class="page active" id="pg-notifications">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">通知</div>
      <div class="ph-act" @click="markAllRead" style="font-size:11px;color:var(--text-3)">全部已讀</div>
    </div>
    <div id="notif-list">
      <div v-if="notifications.length === 0" class="bb-empty">
        <div class="bb-empty-ic"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>
        <div class="bb-empty-ttl">沒有通知</div>
        <div class="bb-empty-sub">當角色有新動態時<br>會在這裡通知你</div>
      </div>
      <div v-else>
        <div v-for="n in notifications" :key="n.id" class="notif-item" :class="{ unread: !n.read }" @click="openNotif(n)">
          <div class="notif-av">
            <img v-if="getAvatar(n.charId) && getAvatar(n.charId).startsWith('data:')" :src="getAvatar(n.charId)" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
            <span v-else>{{ getAvatar(n.charId) || '🔔' }}</span>
          </div>
          <div class="notif-body">
            <div class="notif-text">
              <strong>{{ getName(n.charId) }}</strong> {{ n.text }}
            </div>
            <div class="notif-time">{{ timeAgo(n.createdAt) }}</div>
          </div>
          <div v-if="!n.read" class="notif-dot"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../store/index.js';
import { dbAll, dbPut } from '../services/db.js';

const router = useRouter();
const notifications = ref([]);

onMounted(async () => {
  await globalStore.loadCharacters();
  const all = await dbAll('notifications');
  notifications.value = all.sort((a, b) => b.createdAt - a.createdAt);
});

function getAvatar(charId) {
  const c = globalStore.characters.find(x => x.id === charId);
  return c ? c.avatar : '🔔';
}
function getName(charId) {
  const c = globalStore.characters.find(x => x.id === charId);
  return c ? c.name : '系統';
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

async function markAllRead() {
  for (const n of notifications.value) {
    if (!n.read) {
      n.read = true;
      await dbPut('notifications', JSON.parse(JSON.stringify(n)));
    }
  }
}

function openNotif(n) {
  if (!n.read) {
    n.read = true;
    dbPut('notifications', JSON.parse(JSON.stringify(n)));
  }
  if (n.type === 'diary') router.push('/diary/' + n.targetId);
  else if (n.type === 'dream') router.push('/dream/' + n.targetId);
  else if (n.type === 'post') router.push('/post/' + n.targetId);
  else if (n.type === 'chat') router.push({ path: '/chat/' + n.charId, query: n.messageId ? { msg: n.messageId } : {} });
  else if (n.type === 'hv') router.push('/blackbox');
}
</script>

<style scoped>
.notif-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: .5px solid var(--border);
  cursor: pointer;
}
.notif-item.unread {
  background: var(--rose-pale);
}
.notif-av {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  overflow: hidden;
}
.notif-body {
  flex: 1;
  min-width: 0;
}
.notif-text {
  font-size: 13px;
  font-weight: 300;
  color: var(--text);
  line-height: 1.4;
}
.notif-time {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 2px;
}
.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--rose);
  flex-shrink: 0;
}
</style>
