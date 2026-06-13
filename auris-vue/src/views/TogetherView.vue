<template>
  <div class="page active" id="pg-together">
    <div class="ph">
      <div class="ph-back" @click="$router.back()">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回
      </div>
      <div class="ph-title">我們的{{ char ? '・' + char.name : '' }}</div>
      <div></div>
    </div>

    <!-- 分頁切換：願望清單／備忘錄 -->
    <div class="tg-tabs">
      <div class="tg-tab" :class="{ sel: tab === 'wishes' }" @click="tab = 'wishes'">願望清單</div>
      <div class="tg-tab" :class="{ sel: tab === 'notes' }" @click="tab = 'notes'">備忘錄</div>
    </div>

    <div class="tg-body">
      <!-- 新增輸入列 -->
      <div class="tg-add">
        <input
          class="tg-input"
          v-model="draft"
          :placeholder="tab === 'wishes' ? '想一起做的事…' : '記一筆約定、計畫、清單…'"
          @keyup.enter="addItem"
        />
        <button class="tg-add-btn" :disabled="!draft.trim()" @click="addItem">新增</button>
      </div>

      <!-- 清單 -->
      <div class="tg-list" v-if="items.length">
        <div class="tg-item" v-for="it in items" :key="it.id" :class="{ done: it.done }">
          <label class="tg-check">
            <input type="checkbox" :checked="it.done" @change="toggleItem(it)">
            <span class="tg-check-box">
              <svg v-if="it.done" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
          </label>
          <div class="tg-text">{{ it.text }}</div>
          <div class="tg-del" @click="deleteItem(it)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </div>
        </div>
      </div>

      <div v-else class="tg-empty">
        {{ tab === 'wishes' ? '還沒有共同願望，新增一個你們想一起做的事吧' : '還沒有備忘，記下你們的約定或計畫吧' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { dbGet, dbIdx, dbPut, dbDel } from '../services/db.js';

const route = useRoute();
const charId = route.params.id;

const char = ref(null);
const tab = ref('wishes');           // 'wishes' | 'notes'
const draft = ref('');
const wishes = ref([]);
const notes = ref([]);

// 目前分頁對應的 store 名稱與清單（兩個分頁共用同一套邏輯）
const storeName = computed(() => (tab.value === 'wishes' ? 'wishes' : 'notes'));
const listRef = computed(() => (tab.value === 'wishes' ? wishes : notes));
const items = computed(() =>
  [...listRef.value.value].sort((a, b) => {
    // 未完成在上、已完成在下；同組依建立時間新到舊
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  })
);

onMounted(async () => {
  char.value = await dbGet('characters', charId);
  wishes.value = await dbIdx('wishes', 'charId', charId);
  notes.value = await dbIdx('notes', 'charId', charId);
});

async function addItem() {
  const text = draft.value.trim();
  if (!text) return;
  const rec = {
    id: `${tab.value === 'wishes' ? 'wish' : 'note'}_${Date.now()}`,
    charId,
    text,
    done: false,
    createdAt: Date.now(),
  };
  await dbPut(storeName.value, rec);
  listRef.value.value.push(rec);
  draft.value = '';
}

async function toggleItem(it) {
  it.done = !it.done;
  await dbPut(storeName.value, { ...it });
}

async function deleteItem(it) {
  await dbDel(storeName.value, it.id);
  const arr = listRef.value.value;
  const i = arr.findIndex(x => x.id === it.id);
  if (i !== -1) arr.splice(i, 1);
}
</script>

<style scoped>
.tg-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 20px 4px;
}
.tg-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 13px;
  font-weight: 400;
  color: var(--text-3);
  background: var(--surface);
  border: .5px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all .15s;
}
.tg-tab.sel {
  background: var(--rose);
  color: #fff;
  border-color: var(--rose);
  font-weight: 500;
}

.tg-body { flex: 1; overflow-y: auto; padding: 12px 20px 40px; }

.tg-add { display: flex; gap: 8px; margin-bottom: 16px; }
.tg-input {
  flex: 1;
  padding: 11px 14px;
  font-size: 14px;
  color: var(--text);
  background: var(--card);
  border: .5px solid var(--border);
  border-radius: 12px;
  outline: none;
}
.tg-input:focus { border-color: var(--rose); }
.tg-add-btn {
  padding: 0 18px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: var(--rose);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  flex-shrink: 0;
}
.tg-add-btn:disabled { background: var(--surface); color: var(--text-3); cursor: default; }

.tg-list { display: flex; flex-direction: column; gap: 10px; }
.tg-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border: .5px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
}

.tg-check { flex-shrink: 0; cursor: pointer; display: flex; }
.tg-check input { display: none; }
.tg-check-box {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
}
.tg-item.done .tg-check-box { background: var(--rose); border-color: var(--rose); }
.tg-check-box svg { width: 13px; height: 13px; fill: none; stroke: #fff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }

.tg-text { flex: 1; min-width: 0; font-size: 14px; color: var(--text); line-height: 1.5; word-break: break-word; }
.tg-item.done .tg-text { color: var(--text-3); text-decoration: line-through; }

.tg-del { flex-shrink: 0; cursor: pointer; color: var(--text-3); opacity: .55; display: flex; }
.tg-del svg { width: 17px; height: 17px; }
.tg-del:active { opacity: 1; color: var(--red); }

.tg-empty { padding: 48px 24px; text-align: center; font-size: 13px; font-weight: 300; color: var(--text-3); line-height: 1.7; }
</style>
