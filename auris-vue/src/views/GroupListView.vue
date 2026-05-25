<template>
  <div class="page active" id="pg-group-list">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">群組聊天</div>
      <div class="ph-act" @click="$router.push('/group-create')" style="color:var(--rose)">＋ 新增</div>
    </div>
    <div id="group-list-body">
      <div v-if="groups.length === 0" style="text-align:center;padding:60px 20px;color:var(--text-3);font-size:13px;font-weight:300">
        還沒有群組<br><br>
        <button class="empty-cta" @click="$router.push('/group-create')">＋ 建立群組</button>
      </div>
      <div v-else style="padding:8px 0">
        <div v-for="g in groups" :key="g.id">
          <div class="chat-item" @click="$router.push('/group-room/' + g.id)">
            <div class="chat-av" style="font-size:24px;display:flex;align-items:center;justify-content:center;background:var(--surface)">👥</div>
            <div class="chat-info">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                <div class="chat-name">{{ g.name || '群組' }}</div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="chat-time" v-if="g.last">{{ timeAgo(g.last.createdAt) }}</span>
                </div>
              </div>
              <div class="chat-preview">{{ g.last ? g.last.content.substring(0,50) : '開始第一次群組聊天' }}</div>
              <div class="chat-meta">{{ g.memberNames.join('、') }}</div>
            </div>
            <div class="chat-swipe-actions">
              <div class="chat-swipe-btn delete" @click.stop="deleteGroup(g.id)">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                刪除
              </div>
            </div>
          </div>
          <div style="height:.5px;background:var(--border);margin-left:80px"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { dbAll, dbIdx, dbGet, dbDel } from '../services/db.js';

const groups = ref([]);

onMounted(async () => {
  await loadGroups();
});

async function loadGroups() {
  const allGroups = await dbAll('groups');
  const result = [];
  for (const g of allGroups) {
    const msgs = await dbIdx('group_messages', 'groupId', g.id);
    msgs.sort((a,b) => b.createdAt - a.createdAt);
    
    // Get member names
    const names = [];
    for (const charId of g.members) {
      const c = await dbGet('characters', charId);
      if (c) names.push(c.name);
    }
    
    result.push({
      ...g,
      last: msgs[0],
      memberNames: names
    });
  }
  result.sort((a,b) => (b.last?.createdAt || 0) - (a.last?.createdAt || 0));
  groups.value = result;
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

async function deleteGroup(id) {
  if (!confirm('確定要刪除這個群組嗎？對話記錄也會一併刪除。')) return;
  await dbDel('groups', id);
  const msgs = await dbIdx('group_messages', 'groupId', id);
  for (const m of msgs) await dbDel('group_messages', m.id);
  await loadGroups();
}
</script>
