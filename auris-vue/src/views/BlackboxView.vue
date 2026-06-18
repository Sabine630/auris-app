<template>
  <div class="page active" id="pg-blackbox">
    <div class="ph">
      <div class="ph-back" v-if="!manageMode" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-back" v-else @click="exitManage"><span style="color:var(--rose)">✕ 取消</span></div>
      <div class="ph-title">{{ manageMode ? `已選 ${selectedIds.length} 則` : '心聲' }}</div>
      <div class="ph-act" v-if="!manageMode && filteredMemories.length > 0" @click="manageMode = true" style="font-size:13px;color:var(--text-2)">管理</div>
      <div class="ph-act" v-else-if="!manageMode" style="font-size:11px;color:var(--text-3)">{{ filteredMemories.length ? `${filteredMemories.length} 則` : '' }}</div>
      <div class="ph-act" v-else @click="toggleSelectAll" style="font-size:13px;color:var(--rose)">{{ isAllSelected ? '取消全選' : '全選' }}</div>
    </div>

    <!-- 角色篩選 -->
    <div class="bb-filter" v-if="!manageMode">
      <div class="bb-chip" :class="{ sel: filterCharId === 'all' }" @click="filterCharId = 'all'">全部</div>
      <div v-for="c in charsWithMemories" :key="c.id" class="bb-chip" :class="{ sel: filterCharId === c.id }" @click="filterCharId = c.id">
        {{ c.name }}
      </div>
    </div>

    <!-- 條目列表 -->
    <div class="bb-list">
      <div v-if="filteredMemories.length === 0" class="bb-empty">
        <div class="bb-empty-ic"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
        <div class="bb-empty-ttl">{{ allMemories.length === 0 ? '還沒有心聲' : '這個角色還沒有心聲' }}</div>
        <div class="bb-empty-sub" v-html="allMemories.length === 0 ? '開啟角色設定中的「Heart Voice」<br>與他對話後，他的內心話會出現在這裡' : '繼續和他聊天，他的心聲<br>會悄悄記錄在這裡'"></div>
      </div>
      <div v-else>
        <div v-for="m in filteredMemories" :key="m.id" class="bb-entry" :class="{ 'bb-entry-sel': manageMode && selectedIds.includes(m.id) }" @click="manageMode && toggleSelect(m.id)">
          <div v-if="manageMode" class="bb-checkbox" :class="{ checked: selectedIds.includes(m.id) }">
            <svg v-if="selectedIds.includes(m.id)" viewBox="0 0 12 10"><polyline points="1,5 4.5,9 11,1"/></svg>
          </div>
          <div class="bb-av">
            <img v-if="getAvatar(m.charId) && getAvatar(m.charId).startsWith('data:')" :src="getAvatar(m.charId)" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
            <span v-else>{{ getAvatar(m.charId) || '🌸' }}</span>
          </div>
          <div class="bb-body">
            <div class="bb-meta">
              <span class="bb-name">{{ getName(m.charId) }}</span>
              <span class="bb-time">{{ timeAgo(m.createdAt) }}</span>
            </div>
            <div class="bb-tag">heart voice</div>
            <div class="bb-text" v-html="formatContent(m.content)"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理底端列 -->
    <div v-if="manageMode" class="bb-manage-bar">
      <button class="bb-del-btn" :disabled="selectedIds.length === 0" @click="deleteSelected">
        刪除{{ selectedIds.length > 0 ? ` ${selectedIds.length} 則` : '' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { globalStore } from '../store/index.js';
import { dbAll, dbDel } from '../services/db.js';
import { formatContent } from '../services/format.js';

const allMemories = ref([]);
const filterCharId = ref('all');
const manageMode = ref(false);
const selectedIds = ref([]);

const charsWithMemories = computed(() => {
  const ids = [...new Set(allMemories.value.map(m => m.charId))];
  return ids.map(id => globalStore.characters.find(c => c.id === id)).filter(Boolean);
});

const filteredMemories = computed(() => {
  let list = [...allMemories.value];
  if (!manageMode.value && filterCharId.value !== 'all') {
    list = list.filter(m => m.charId === filterCharId.value);
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
});

const isAllSelected = computed(() =>
  filteredMemories.value.length > 0 && filteredMemories.value.every(m => selectedIds.value.includes(m.id))
);

onMounted(async () => {
  await globalStore.loadCharacters();
  allMemories.value = await dbAll('memories');
});

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

function exitManage() {
  manageMode.value = false;
  selectedIds.value = [];
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx === -1) selectedIds.value.push(id);
  else selectedIds.value.splice(idx, 1);
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = filteredMemories.value.map(m => m.id);
  }
}

async function deleteSelected() {
  if (selectedIds.value.length === 0) return;
  const count = selectedIds.value.length;
  if (!await window.confirm_(`確定要刪除這 ${count} 則心聲嗎？此操作無法復原。`)) return;
  const deletedIds = new Set(selectedIds.value);
  for (const id of selectedIds.value) {
    await dbDel('memories', id);
  }
  // 一併清掉指向這些心聲的通知（hv 通知的 targetId = 心聲 memory id），避免點通知連到已刪內容。
  const notifs = await dbAll('notifications');
  for (const n of notifs) {
    if (n.type === 'hv' && deletedIds.has(n.targetId)) await dbDel('notifications', n.id);
  }
  allMemories.value = allMemories.value.filter(m => !selectedIds.value.includes(m.id));
  selectedIds.value = [];
  if (allMemories.value.length === 0) manageMode.value = false;
  window.toast_?.(`已刪除 ${count} 則心聲`);
}
</script>
