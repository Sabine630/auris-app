<template>
  <div class="page active" id="pg-chat-list" @click="closeMenus">
    <div class="ph">
      <div class="ph-back" v-if="!manageMode" @click="$router.push('/')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-back" v-else @click="manageMode = false"><span style="color:var(--rose)">✕ 取消</span></div>
      
      <div class="ph-title">{{ manageMode ? `已選 ${selectedChats.length} 個` : '聊天' }}</div>
      
      <div class="ph-act" v-if="!manageMode" @click.stop="showChatMenu = !showChatMenu">⋯</div>
      <div class="ph-act" v-else @click.stop="selectAll">全選</div>
    </div>
    
    <!-- 搜尋框 -->
    <div style="padding:8px 16px;background:var(--bg)">
      <input type="text" v-model="searchQuery" placeholder="搜尋角色或內容..." 
        style="width:100%;padding:10px 16px;background:var(--surface);border:.5px solid var(--border-2);border-radius:12px;font-family:var(--font);font-size:13px;font-weight:300;color:var(--text);outline:none;box-sizing:border-box">
    </div>
    
    <!-- 篩選和排序 -->
    <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--bg);border-bottom:.5px solid var(--border)">
      <div class="chat-tab" :class="{ active: tab === 'all' }" @click="tab = 'all'">全部</div>
      <div class="chat-tab" :class="{ active: tab === 'unread' }" @click="tab = 'unread'">未讀</div>
      <div style="flex:1"></div>
      <div class="chat-sort-btn" @click.stop="showSortMenu = !showSortMenu">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:var(--text-3);fill:none;stroke-width:1.5"><path d="M3 6h18M7 12h10M11 18h2"/></svg>
        <span>{{ sortLabel }}</span>
      </div>
    </div>
    
    <!-- 聊天列表 -->
    <div id="chat-list-body">
      <div v-if="filteredChats.length === 0" style="text-align:center;padding:60px 20px;color:var(--text-3);font-size:13px;font-weight:300">
        {{ tab === 'unread' ? '沒有未讀訊息' : (searchQuery ? '找不到相關對話' : '還沒有對話記錄') }}
        <div v-if="globalStore.characters.length === 0" style="margin-top:16px">
          <button class="empty-cta" @click="$router.push('/char-manage')">＋ 新增角色</button>
        </div>
      </div>
      
      <div v-else style="padding:8px 0; overflow-x: hidden">
        <div v-for="item in filteredChats" :key="item.c.id">
          <div class="chat-item" :class="{ pinned: item.c.isPinned, swiped: swipedId === item.c.id }"
               @touchstart="onTouchStart($event, item.c.id)"
               @touchmove="onTouchMove($event, item.c.id)"
               @touchend="onTouchEnd">
               
            <div v-if="manageMode" class="chat-item-checkbox show" :class="{ checked: selectedChats.includes(item.c.id) }" @click.stop="toggleSelect(item.c.id)"></div>
            
            <div class="chat-av" @click="onItemClick(item.c.id)">
              <img v-if="item.c.avatar && item.c.avatar.startsWith('data:')" :src="item.c.avatar">
              <span v-else>{{ item.c.avatar || '🌸' }}</span>
            </div>
            
            <div class="chat-info" @click="onItemClick(item.c.id)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                <div class="chat-name">
                  <span v-if="item.c.isPinned" class="chat-pin-icon">📌</span>
                  {{ item.c.name }}
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="chat-time">{{ item.last ? timeAgo(item.last.createdAt) : '' }}</span>
                  <div v-if="item.unreadCount > 0" class="chat-badge">{{ item.unreadCount }}</div>
                </div>
              </div>
              <div class="chat-preview">{{ item.last ? item.last.content.substring(0,50) : '開始你們的第一次對話' }}</div>
              <div class="chat-meta">{{ item.msgCount }}則對話</div>
            </div>
            
            <div v-if="!manageMode" class="chat-swipe-actions">
              <div class="chat-swipe-btn pin" @click.stop="togglePin(item.c.id)">
                <svg viewBox="0 0 24 24"><path d="M21 10c0-7-9-7-9-7s-9 0-9 7c0 2.75 2 5 2 5v6h5v4l3-4 3 4v-4h5s2-2.25 2-5z"/></svg>
                {{ item.c.isPinned ? '取消' : '置頂' }}
              </div>
              <div class="chat-swipe-btn clear" @click.stop="clearChat(item.c.id)">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                清空
              </div>
            </div>
          </div>
          <div style="height:.5px;background:var(--border);" :style="{ marginLeft: manageMode ? '100px' : '80px' }"></div>
        </div>
      </div>
    </div>
    
    <!-- 管理對話底端列 -->
    <div v-if="manageMode" class="chat-manage-bar show">
      <button class="clear-btn" @click="batchClear">清空記錄</button>
      <button class="delete-btn" @click="batchDelete">刪除角色</button>
    </div>
    
    <!-- 選單彈窗 -->
    <div class="menu-overlay" v-if="showChatMenu" @click="showChatMenu=false"></div>
    <div class="bottom-menu" :style="{ display: showChatMenu ? 'block' : 'none' }">
      <div class="menu-item" @click="startManageMode">
        <svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        管理對話
      </div>
      <div class="menu-item" @click="showChatMenu=false; showAddChat=true">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        新增對話
      </div>
      <div class="menu-item" @click="markAllRead">
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        標記全部已讀
      </div>
    </div>
    
    <!-- 排序選單 -->
    <div class="bottom-menu" :style="{ display: showSortMenu ? 'block' : 'none' }">
      <div class="menu-item" @click="setSort('recent')">
        <span>{{ sortMode === 'recent' ? '◉' : '○' }}</span> 最近對話
      </div>
      <div class="menu-item" @click="setSort('name')">
        <span>{{ sortMode === 'name' ? '◉' : '○' }}</span> 角色名稱
      </div>
      <div class="menu-item" @click="setSort('count')">
        <span>{{ sortMode === 'count' ? '◉' : '○' }}</span> 訊息數量
      </div>
    </div>
    
    <!-- 新增對話選擇器 -->
    <div class="menu-overlay" v-if="showAddChat" @click="showAddChat=false"></div>
    <div class="bottom-menu" :style="{ display: showAddChat ? 'block' : 'none', maxHeight:'60vh', overflowY:'auto' }">
      <div style="padding:16px;font-size:14px;font-weight:400;color:var(--text);border-bottom:.5px solid var(--border)">選擇要聊天的角色</div>
      <div>
        <div v-for="c in globalStore.characters" :key="c.id" class="menu-item" @click="startChat(c.id)">
          <div style="width:36px;height:36px;border-radius:10px;background:var(--rose-pale);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden">
            <img v-if="c.avatar && c.avatar.startsWith('data:')" :src="c.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
            <span v-else>{{ c.avatar || '🌸' }}</span>
          </div>
          <span>{{ c.name }}</span>
        </div>
      </div>
    </div>

    <!-- 清空對話確認 -->
    <div class="menu-overlay" v-if="showClearConfirm" @click="showClearConfirm = false"></div>
    <div class="bottom-menu" :style="{ display: showClearConfirm ? 'block' : 'none' }">
      <div style="padding:20px 16px 12px;text-align:center">
        <div style="font-weight:500;font-size:15px;margin-bottom:6px">
          {{ clearTargetName ? `清空與「${clearTargetName}」的對話？` : `清空 ${clearTargetIds.length} 個角色的對話？` }}
        </div>
        <div style="font-size:12px;color:var(--text-3);font-weight:300;line-height:1.6">
          聊天記錄與對話記憶會被清除，<b>角色不會被刪除</b>。
        </div>
      </div>
      <div style="padding:0 16px 4px">
        <label style="display:flex;align-items:flex-start;gap:10px;padding:12px;border-radius:12px;background:var(--surface);border:.5px solid var(--border);cursor:pointer" @click="clearAlsoContent = !clearAlsoContent">
          <div class="chat-item-checkbox show" :class="{ checked: clearAlsoContent }" style="flex-shrink:0;margin-top:1px"></div>
          <div style="text-align:left">
            <div style="font-size:13px;font-weight:400;color:var(--text)">同時清除日記、夢境、貼文</div>
            <div style="font-size:11px;color:var(--text-3);font-weight:300;line-height:1.5;margin-top:2px">這些是角色過去產生的內容。若想徹底重新開始，可一併清除以免之後對不上。</div>
          </div>
        </label>
      </div>
      <div style="display:flex;gap:10px;padding:12px 16px 20px">
        <button @click="showClearConfirm = false"
          style="flex:1;padding:12px;border-radius:12px;background:var(--surface);color:var(--text);border:.5px solid var(--border);font-size:14px;font-weight:400;cursor:pointer">取消</button>
        <button @click="confirmClear" :disabled="clearing"
          style="flex:1;padding:12px;border-radius:12px;background:var(--rose);color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer"
          :style="clearing ? 'opacity:0.5' : ''">{{ clearing ? '清空中…' : '確認清空' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../store/index.js';
import { dbIdx, dbGet, dbPut, dbDel, dbAll } from '../services/db.js';

const router = useRouter();

const tab = ref('all');
const sortMode = ref('recent');
const searchQuery = ref('');
const manageMode = ref(false);
const selectedChats = ref([]);
const showChatMenu = ref(false);
const showSortMenu = ref(false);
const showAddChat = ref(false);

const chatData = ref([]);

const showClearConfirm = ref(false);
const clearTargetIds = ref([]);
const clearTargetName = ref('');
const clearAlsoContent = ref(false);
const clearing = ref(false);

const swipedId = ref(null);
let touchStartX = 0;

const sortLabel = computed(() => {
  if (sortMode.value === 'recent') return '最近對話';
  if (sortMode.value === 'name') return '名稱';
  return '訊息數量';
});

const filteredChats = computed(() => {
  let items = [...chatData.value];
  const q = searchQuery.value.toLowerCase();
  
  if (q) {
    items = items.filter(i => 
      i.c.name.toLowerCase().includes(q) || 
      (i.last && i.last.content.toLowerCase().includes(q))
    );
  }
  
  if (tab.value === 'unread') {
    items = items.filter(i => i.unreadCount > 0);
  }
  
  if (sortMode.value === 'recent') {
    items.sort((a,b) => {
      if (a.c.isPinned && !b.c.isPinned) return -1;
      if (!a.c.isPinned && b.c.isPinned) return 1;
      return (b.last?.createdAt || 0) - (a.last?.createdAt || 0);
    });
  } else if (sortMode.value === 'name') {
    items.sort((a,b) => {
      if (a.c.isPinned && !b.c.isPinned) return -1;
      if (!a.c.isPinned && b.c.isPinned) return 1;
      return a.c.name.localeCompare(b.c.name, 'zh-Hant');
    });
  } else if (sortMode.value === 'count') {
    items.sort((a,b) => {
      if (a.c.isPinned && !b.c.isPinned) return -1;
      if (!a.c.isPinned && b.c.isPinned) return 1;
      return b.msgCount - a.msgCount;
    });
  }
  
  return items;
});

onMounted(async () => {
  await loadChatData();
});

async function loadChatData() {
  await globalStore.loadCharacters();
  const chars = globalStore.characters;
  
  const data = await Promise.all(chars.map(async c => {
    const msgs = await dbIdx('messages', 'charId', c.id);
    msgs.sort((a,b) => b.createdAt - a.createdAt);
    return {
      c,
      last: msgs[0],
      unreadCount: c.unreadCount || 0,
      msgCount: msgs.length
    };
  }));
  chatData.value = data;
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

function closeMenus() {
  showSortMenu.value = false;
  showChatMenu.value = false;
}

function setSort(mode) {
  sortMode.value = mode;
  showSortMenu.value = false;
}

function onItemClick(id) {
  if (manageMode.value) {
    toggleSelect(id);
  } else {
    startChat(id);
  }
}

function startChat(id) {
  showAddChat.value = false;
  router.push('/chat/' + id);
}

function startManageMode() {
  showChatMenu.value = false;
  manageMode.value = true;
  selectedChats.value = [];
  swipedId.value = null;
}

function toggleSelect(id) {
  const idx = selectedChats.value.indexOf(id);
  if (idx > -1) selectedChats.value.splice(idx, 1);
  else selectedChats.value.push(id);
}

function selectAll() {
  if (selectedChats.value.length === chatData.value.length) {
    selectedChats.value = [];
  } else {
    selectedChats.value = chatData.value.map(i => i.c.id);
  }
}

async function markAllRead() {
  showChatMenu.value = false;
  for (const item of chatData.value) {
    if (item.unreadCount > 0) {
      item.c.unreadCount = 0;
      item.c.hasUnread = false;
      await dbPut('characters', JSON.parse(JSON.stringify(item.c)));
    }
  }
  await loadChatData();
}

function batchClear() {
  if (!selectedChats.value.length) {
    window.toast_('請先選擇角色');
    return;
  }
  openClearModal([...selectedChats.value], '');
}

async function batchDelete() {
  if (!selectedChats.value.length) {
    window.toast_('請先選擇角色');
    return;
  }
  if (!confirm(`確定要刪除 ${selectedChats.value.length} 個角色嗎？所有對話記錄也會一併刪除。`)) return;
  
  const stores = ['messages', 'memories', 'diary', 'dreams', 'moments'];
  for (const charId of selectedChats.value) {
    await dbDel('characters', charId);
    for (const store of stores) {
      const items = await dbIdx(store, 'charId', charId);
      for (const item of items) await dbDel(store, item.id);
    }
  }
  manageMode.value = false;
  await loadChatData();
}

async function togglePin(id) {
  const c = await dbGet('characters', id);
  c.isPinned = !c.isPinned;
  await dbPut('characters', c);
  swipedId.value = null;
  await loadChatData();
}

async function clearChat(id) {
  const c = await dbGet('characters', id);
  openClearModal([id], c?.name || '');
}

function openClearModal(ids, name) {
  clearTargetIds.value = ids;
  clearTargetName.value = name;
  clearAlsoContent.value = false;
  swipedId.value = null;
  showClearConfirm.value = true;
}

async function confirmClear() {
  if (clearing.value || !clearTargetIds.value.length) return;
  clearing.value = true;
  try {
    // 「清空」一律清掉聊天訊息與對話記憶；
    // 日記/夢境/貼文是綁角色而非綁單次對話，只有使用者主動勾選才連帶清除，
    // 避免「我只想清訊息，結果日記也沒了」的二次誤刪。
    const baseStores = ['messages', 'memories'];
    const contentStores = ['diary', 'dreams', 'moments'];
    const stores = clearAlsoContent.value ? [...baseStores, ...contentStores] : baseStores;
    // 連帶清除日記/夢境/貼文時，這些內容當初產生的通知也要一併清掉，
    // 否則通知點進去會連到已不存在的內容（空白）。type 對照：post=貼文、diary=日記、dream=夢境。
    // 'hv'（心聲）綁的是 chat_memories，不在連帶清除範圍，故不動。
    const contentNotifTypes = ['post', 'diary', 'dream'];
    for (const id of clearTargetIds.value) {
      for (const store of stores) {
        const items = await dbIdx(store, 'charId', id);
        for (const item of items) await dbDel(store, item.id);
      }
      if (clearAlsoContent.value) {
        const notifs = await dbIdx('notifications', 'charId', id);
        for (const n of notifs) {
          if (contentNotifTypes.includes(n.type)) await dbDel('notifications', n.id);
        }
      }
      const c = await dbGet('characters', id);
      if (c) {
        c.unreadCount = 0;
        await dbPut('characters', JSON.parse(JSON.stringify(c)));
      }
    }
    showClearConfirm.value = false;
    manageMode.value = false;
    await loadChatData();
  } finally {
    clearing.value = false;
  }
}

// Swipe gestures
function onTouchStart(e, id) {
  if (manageMode.value) return;
  touchStartX = e.touches[0].clientX;
  if (swipedId.value && swipedId.value !== id) {
    swipedId.value = null;
  }
}
function onTouchMove(e, id) {
  if (manageMode.value) return;
  const diff = touchStartX - e.touches[0].clientX;
  if (diff > 50) {
    swipedId.value = id;
  } else if (diff < -20) {
    swipedId.value = null;
  }
}
function onTouchEnd() {}
</script>
