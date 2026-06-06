<template>
  <div class="page active" id="pg-char-manage">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">角色管理</div>
      <div class="ph-act" @click="$router.push('/char-edit')">＋ 新增</div>
    </div>
    
    <div id="char-list" style="padding:12px 0">
      <div v-if="globalStore.characters.length === 0" class="empty">
        <div class="empty-ic"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="empty-ttl">還沒有角色</div>
        <div class="empty-sub">點右上角「＋ 新增」建立第一個角色</div>
      </div>
      
      <div v-for="c in globalStore.characters" :key="c.id" class="char-card">
        <div class="char-card-bar"></div>
        <div class="char-av">
          <img v-if="c.avatar && c.avatar.startsWith('data:')" :src="c.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:13px">
          <span v-else>{{ c.avatar || '🌸' }}</span>
        </div>
        <div class="char-info">
          <div class="char-name">{{ c.name }}</div>
          <div class="char-tagline">{{ c.tagline || '尚未設定介紹' }}</div>
          <div v-if="c.tags && c.tags.length" class="char-tags">
            <span v-for="t in c.tags" :key="t" class="char-tag">{{ t }}</span>
          </div>
        </div>
        <div class="char-btns">
          <button class="char-chat-btn" @click="$router.push('/chat/' + c.id)">聊天</button>
          <button class="char-rel-btn" @click="$router.push('/relation/' + c.id)">關係</button>
          <button class="char-edit-btn" @click="$router.push('/char-edit/' + c.id)">編輯</button>
          <button class="char-del-btn" @click="deleteCharacter(c)">刪除</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="menu-overlay" v-if="showDeleteConfirm" @click="showDeleteConfirm = false"></div>
    <div class="bottom-menu" :style="{ display: showDeleteConfirm ? 'block' : 'none' }">
      <div style="padding:20px 16px;text-align:center">
        <div style="font-size:40px;margin-bottom:12px">{{ deleteTarget?.avatar || '🌸' }}</div>
        <div style="font-weight:500;font-size:15px;margin-bottom:6px">確定要刪除「{{ deleteTarget?.name }}」嗎？</div>
        <div style="font-size:12px;color:var(--text-3);font-weight:300;line-height:1.6">
          刪除後，與此角色的所有聊天記錄、日記、夢境、<br>貼文和心聲記憶都會一併刪除，且無法復原。
        </div>
      </div>
      <div style="display:flex;gap:10px;padding:0 16px 20px">
        <button @click="showDeleteConfirm = false"
          style="flex:1;padding:12px;border-radius:12px;background:var(--surface);color:var(--text);border:.5px solid var(--border);font-size:14px;font-weight:400;cursor:pointer">取消</button>
        <button @click="confirmDelete" :disabled="isDeleting"
          style="flex:1;padding:12px;border-radius:12px;background:#e74c3c;color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer;transition:opacity .15s"
          :style="isDeleting ? 'opacity:0.5' : ''">{{ isDeleting ? '刪除中…' : '確認刪除' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { globalStore } from '../store/index.js';
import { dbDel, dbIdx } from '../services/db.js';

const showDeleteConfirm = ref(false);
const deleteTarget = ref(null);
const isDeleting = ref(false);

function deleteCharacter(c) {
  deleteTarget.value = c;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value || isDeleting.value) return;
  isDeleting.value = true;
  
  const charId = deleteTarget.value.id;
  
  try {
    // Delete all related data for this character
    const stores = [
      { name: 'messages', index: 'charId' },
      { name: 'memories', index: 'charId' },
      { name: 'moments', index: 'charId' },
      { name: 'diary', index: 'charId' },
      { name: 'dreams', index: 'charId' },
      { name: 'notifications', index: 'charId' },
    ];
    
    for (const store of stores) {
      const items = await dbIdx(store.name, store.index, charId);
      for (const item of items) {
        await dbDel(store.name, item.id);
      }
    }
    
    // Delete the character itself
    await dbDel('characters', charId);
    
    // Reload characters in the global store
    await globalStore.loadCharacters();
    
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
  } catch (err) {
    console.error('Failed to delete character:', err);
    // TODO(security): Use custom modal instead of alert in production
    window.toast_('刪除失敗，請稍後再試');
  } finally {
    isDeleting.value = false;
  }
}
</script>

<style scoped>
.char-rel-btn {
  padding: 6px 12px;
  border-radius: 8px;
  background: transparent;
  color: var(--rose);
  border: .5px solid var(--rose);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: all .15s;
}
.char-rel-btn:active {
  background: var(--rose);
  color: #fff;
}
.char-del-btn {
  padding: 6px 12px;
  border-radius: 8px;
  background: transparent;
  color: #e74c3c;
  border: .5px solid #e74c3c;
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: all .15s;
}
.char-del-btn:active {
  background: #e74c3c;
  color: #fff;
}
</style>
