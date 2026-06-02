<template>
  <div class="page active" id="pg-worlds">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/settings')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">世界書</div>
      <div class="ph-act" @click="$router.push('/worlds/edit')">＋ 新增</div>
    </div>

    <!-- Category filter -->
    <div class="wld-tabs">
      <button v-for="cat in categories" :key="cat.value"
        class="wld-tab" :class="{ active: filterCat === cat.value }"
        @click="filterCat = cat.value">{{ cat.label }}</button>
    </div>

    <div class="wld-list">
      <!-- Empty state -->
      <div v-if="filtered.length === 0" class="empty" style="margin-top:60px">
        <div class="empty-ic">📖</div>
        <div class="empty-ttl">還沒有詞條</div>
        <div class="empty-sub">點右上角「＋ 新增」建立第一筆世界觀設定<br>AI 會在對話中自動參考相關內容</div>
        <button class="empty-cta" @click="$router.push('/worlds/edit')">新增第一筆詞條</button>
      </div>

      <!-- Entry cards -->
      <div v-for="entry in filtered" :key="entry.id" class="wld-card" @click="$router.push('/worlds/edit/' + entry.id)">
        <div class="wld-card-top">
          <div class="wld-card-name">{{ entry.name }}</div>
          <div class="wld-card-meta">
            <span class="wld-cat-badge" :data-cat="entry.category">{{ catLabel(entry.category) }}</span>
            <span v-if="entry.charScope?.length" class="wld-scope-badge">指定角色</span>
          </div>
        </div>
        <div class="wld-card-content">{{ entry.content }}</div>
        <div class="wld-card-foot">
          <div class="wld-aliases" v-if="entry.aliases?.length">
            <span v-for="a in entry.aliases" :key="a" class="wld-alias-chip">{{ a }}</span>
          </div>
          <label class="wld-toggle" @click.stop>
            <input type="checkbox" :checked="entry.enabled" @change="toggleEntry(entry)">
            <span class="wld-toggle-track"></span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { dbAll, dbPut } from '../services/db.js';

const entries = ref([]);
const filterCat = ref('all');

const categories = [
  { value: 'all',     label: '全部' },
  { value: 'location', label: '地點' },
  { value: 'person',  label: '人物' },
  { value: 'rule',    label: '規則' },
  { value: 'item',    label: '物件' },
  { value: 'history', label: '歷史' },
];

const catLabelMap = { location: '地點', person: '人物', rule: '規則', item: '物件', history: '歷史' };
const catLabel = (v) => catLabelMap[v] || '其他';

const filtered = computed(() =>
  filterCat.value === 'all' ? entries.value : entries.value.filter(e => e.category === filterCat.value)
);

onMounted(async () => {
  entries.value = (await dbAll('worlds')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
});

async function toggleEntry(entry) {
  entry.enabled = !entry.enabled;
  await dbPut('worlds', { ...entry });
}
</script>

<style scoped>
.wld-tabs {
  display: flex;
  gap: 6px;
  padding: 10px 16px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.wld-tabs::-webkit-scrollbar { display: none; }
.wld-tab {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 20px;
  border: .5px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all .15s;
}
.wld-tab.active {
  background: var(--rose);
  color: #fff;
  border-color: var(--rose);
  font-weight: 500;
}
.wld-list {
  padding: 8px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wld-card {
  background: var(--surface);
  border: .5px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  box-shadow: var(--sh);
  cursor: pointer;
  transition: opacity .1s;
}
.wld-card:active { opacity: .7; }
.wld-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.wld-card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wld-card-meta { display: flex; gap: 5px; flex-shrink: 0; }
.wld-cat-badge, .wld-scope-badge {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 8px;
  font-weight: 500;
}
.wld-cat-badge { background: var(--rose-10, rgba(229,115,115,.12)); color: var(--rose); }
.wld-scope-badge { background: var(--surface-2, rgba(0,0,0,.05)); color: var(--text-2); }
.wld-card-content {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 10px;
}
.wld-card-foot {
  display: flex;
  align-items: center;
  gap: 6px;
}
.wld-aliases { display: flex; gap: 4px; flex: 1; flex-wrap: wrap; }
.wld-alias-chip {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 8px;
  background: var(--surface-2, rgba(0,0,0,.05));
  color: var(--text-3);
}
.wld-toggle { position: relative; cursor: pointer; }
.wld-toggle input { display: none; }
.wld-toggle-track {
  display: block;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--border);
  position: relative;
  transition: background .2s;
}
.wld-toggle-track::after {
  content: '';
  position: absolute;
  left: 3px; top: 3px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
  transition: transform .2s;
}
.wld-toggle input:checked + .wld-toggle-track { background: var(--rose); }
.wld-toggle input:checked + .wld-toggle-track::after { transform: translateX(16px); }
.empty-ic { font-size: 48px; margin-bottom: 12px; text-align: center; }
</style>
