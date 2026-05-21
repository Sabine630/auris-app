<template>
  <div class="page active" id="pg-diary">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">日記</div>
      <div class="ph-act" @click="showGenPanel = !showGenPanel" style="font-size:12px;color:var(--rose)">＋ 生成</div>
    </div>

    <!-- 角色篩選 -->
    <div class="diary-filter" v-if="globalStore.characters.length > 0">
      <div class="diary-chip" :class="{ sel: filterCharId === 'all' }" @click="filterCharId = 'all'">全部</div>
      <div v-for="c in globalStore.characters" :key="c.id" class="diary-chip" :class="{ sel: filterCharId === c.id }" @click="filterCharId = c.id">
        {{ c.name }}
      </div>
    </div>

    <!-- 生成面板 -->
    <div v-if="showGenPanel && globalStore.characters.length > 0" style="margin:8px 16px 0">
      <div v-if="genTargetChar" class="diary-gen-btn" @click="doGenerate" :style="isGenerating ? 'opacity:0.6;pointer-events:none' : ''">
        <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>{{ isGenerating ? '生成中…' : `為${genTargetChar.name}寫今天的日記` }}</span>
      </div>
      <div v-else style="font-size:12px;color:var(--text-3);padding:8px 0">
        請先在上方選擇要生成日記的角色。
      </div>
    </div>

    <!-- 日記列表 -->
    <div class="diary-list">
      <div v-if="filteredDiary.length === 0" class="bb-empty">
        <div class="bb-empty-ic"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div>
        <div class="bb-empty-ttl">{{ globalStore.characters.length === 0 ? '還沒有角色' : '還沒有日記' }}</div>
        <div class="bb-empty-sub">{{ globalStore.characters.length === 0 ? '先新增一個角色，他才能寫日記' : '點右上角「＋ 生成」讓他寫今天的日記' }}</div>
        <button v-if="globalStore.characters.length === 0" class="empty-cta" @click="$router.push('/char-manage')">＋ 新增角色</button>
      </div>
      <div v-else>
        <div v-for="d in filteredDiary" :key="d.id" class="diary-card" @click="$router.push('/diary/' + d.id)">
          <div class="diary-card-top">
            <div class="diary-card-av">
              <img v-if="getAvatar(d.charId) && getAvatar(d.charId).startsWith('data:')" :src="getAvatar(d.charId)" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
              <span v-else>{{ getAvatar(d.charId) || '🌸' }}</span>
            </div>
            <div class="diary-card-meta">
              <div class="diary-card-name">{{ getName(d.charId) }}</div>
              <div class="diary-card-date">{{ fmtDate(d.date) }}</div>
            </div>
          </div>
          <div class="diary-card-body">
            <div class="diary-card-title">{{ getTitle(d.content) }}</div>
            <div class="diary-card-preview">{{ getPreview(d.content) }}</div>
          </div>
          <div class="diary-card-footer">
            <span class="diary-card-mood">{{ d.mood || '📔' }}</span>
            <span class="diary-card-read">閱讀全文</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { globalStore } from '../store/index.js';
import { dbAll, dbIdx } from '../services/db.js';
import { generateDiary } from '../services/contentEngine.js';

const diaryList = ref([]);
const filterCharId = ref('all');
const showGenPanel = ref(false);
const isGenerating = ref(false);

const genTargetChar = computed(() => {
  if (filterCharId.value !== 'all') {
    return globalStore.characters.find(c => c.id === filterCharId.value);
  }
  if (globalStore.characters.length === 1) return globalStore.characters[0];
  return null;
});

const filteredDiary = computed(() => {
  let list = diaryList.value;
  if (filterCharId.value !== 'all') {
    list = list.filter(d => d.charId === filterCharId.value);
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
});

onMounted(async () => {
  await globalStore.loadCharacters();
  await loadDiary();
});

async function loadDiary() {
  diaryList.value = await dbAll('diary');
}

function getAvatar(charId) {
  const c = globalStore.characters.find(x => x.id === charId);
  return c ? c.avatar : '🌸';
}
function getName(charId) {
  const c = globalStore.characters.find(x => x.id === charId);
  return c ? c.name : 'Unknown';
}
function getTitle(content) {
  const lines = content.split('\n').filter(l => l.trim());
  return (lines[0] || '無題').replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/, '');
}
function getPreview(content) {
  const lines = content.split('\n').filter(l => l.trim());
  return lines.slice(1).join(' ') || content;
}
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const dt = new Date(+y, +m - 1, +d);
  return `${y} 年 ${+m} 月 ${+d} 日　星期${weekdays[dt.getDay()]}`;
}

async function doGenerate() {
  if (!genTargetChar.value || isGenerating.value) return;
  const charId = genTargetChar.value.id;

  // Check if already generated today
  const today = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();
  const existing = await dbIdx('diary', 'charId', charId);
  if (existing.find(d => d.date === today)) {
    window.toast_('今天已經生成過日記了');
    return;
  }

  isGenerating.value = true;
  try {
    const res = await generateDiary(charId);
    if (res && res.entry) {
      diaryList.value.push(res.entry);
      if (res.truncated) window.toast_('⚠ 日記可能被截斷');
    }
  } catch (err) {
    window.toast_('生成失敗：' + err.message);
  } finally {
    isGenerating.value = false;
    showGenPanel.value = false;
  }
}
</script>
