<template>
  <div class="page active" id="pg-char-manage">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">角色管理</div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="ph-act" style="font-size:12px;padding:4px 8px" @click="triggerImportChar">匯入</div>
        <div class="ph-act" @click="$router.push('/char-edit')">＋ 新增</div>
      </div>
    </div>

    <!-- 隱藏的角色匯入 input -->
    <input type="file" id="char-import-input" accept=".json" style="display:none" @change="importChar" />

    <div id="char-list" style="padding:12px 0">
      <div v-if="globalStore.characters.length === 0" class="empty">
        <div class="empty-ic"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="empty-ttl">還沒有角色</div>
        <div class="empty-sub">點右上角「＋ 新增」建立第一個角色</div>
      </div>

      <div v-for="c in globalStore.characters" :key="c.id" class="char-card">
        <div class="char-card-bar"></div>
        <div class="char-card-top">
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
          <button class="char-chat-btn" @click="$router.push('/chat/' + c.id)">聊天</button>
        </div>
        <div class="char-card-divider"></div>
        <div class="char-card-actions">
          <button class="char-act-btn" @click="$router.push('/relation/' + c.id)">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            關係
          </button>
          <div class="char-act-sep"></div>
          <button class="char-act-btn" @click="$router.push('/char-edit/' + c.id)">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            編輯
          </button>
          <div class="char-act-sep"></div>
          <button class="char-act-btn" @click="exportChar(c)">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            匯出
          </button>
          <div class="char-act-sep"></div>
          <button class="char-act-btn danger" @click="deleteCharacter(c)">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            刪除
          </button>
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
import { dbDel, dbIdx, exportCharacterData, importCharacterData } from '../services/db.js';

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

    await dbDel('characters', charId);
    await globalStore.loadCharacters();

    showDeleteConfirm.value = false;
    deleteTarget.value = null;
  } catch (err) {
    console.error('Failed to delete character:', err);
    window.toast_('刪除失敗，請稍後再試');
  } finally {
    isDeleting.value = false;
  }
}

async function exportChar(c) {
  try {
    window.toast_('正在準備匯出…');
    const data = await exportCharacterData(c.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `char_${c.name}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    window.toast_(`「${c.name}」已匯出`);
  } catch (err) {
    window.toast_('匯出失敗：' + err.message);
  }
}

function triggerImportChar() {
  document.getElementById('char-import-input').click();
}

async function importChar(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    window.toast_('正在匯入角色…');
    const text = await file.text();
    const json = JSON.parse(text);
    await importCharacterData(json);
    await globalStore.loadCharacters();
    window.toast_('角色匯入成功！名稱後已加「（匯入）」以便區分');
  } catch (err) {
    window.toast_('匯入失敗：' + err.message);
  }
}
</script>
