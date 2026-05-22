<template>
  <div class="page active" id="pg-dream">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">夢境</div>
      <div></div>
    </div>

    <!-- 夢境 Hero -->
    <div class="dream-hero">
      <div class="dream-hero-ic"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
    </div>

    <!-- 角色選擇 -->
    <div class="dream-gen-area">
      <div class="dream-char-sel">
        <div v-if="globalStore.characters.length === 0" style="font-size:12px;font-weight:300;color:var(--text-3)">
          先新增角色才能生成夢境
        </div>
        <div v-else style="display:flex;gap:12px;overflow-x:auto;padding:4px 0">
          <div v-for="c in globalStore.characters" :key="c.id"
               class="dream-char-btn" :class="{ sel: selectedCharId === c.id }"
               @click="selectedCharId = c.id">
            <div class="dream-char-btn-av">
              <img v-if="c.avatar && c.avatar.startsWith('data:')" :src="c.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
              <span v-else>{{ c.avatar || '🌸' }}</span>
            </div>
            <div class="dream-char-btn-name">{{ c.name }}</div>
          </div>
        </div>
      </div>
      <button class="dream-trigger" @click="doGenerate" :disabled="isGenerating || !selectedCharId">
        {{ isGenerating ? '生成中…' : '生成今晚的夢境' }}
      </button>
    </div>

    <!-- 夢境列表 -->
    <div class="dream-list">
      <div v-if="dreams.length === 0 && globalStore.characters.length > 0" class="bb-empty" style="padding-top:24px">
        <div class="bb-empty-ttl">還沒有夢境紀錄</div>
        <div class="bb-empty-sub">選擇角色，讓他告訴你<br>他今晚夢見了什麼</div>
      </div>
      <div v-else>
        <div v-for="d in sortedDreams" :key="d.id" class="dream-entry" @click="$router.push('/dream/' + d.id)">
          <div class="dream-entry-top">
            <div class="dream-entry-av">
              <img v-if="getAvatar(d.charId) && getAvatar(d.charId).startsWith('data:')" :src="getAvatar(d.charId)" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
              <span v-else>{{ getAvatar(d.charId) || '🌸' }}</span>
            </div>
            <span class="dream-entry-name">{{ getName(d.charId) }}</span>
            <span class="dream-entry-time">{{ timeAgo(d.createdAt) }}</span>
          </div>
          <div class="dream-entry-text">{{ d.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { globalStore } from '../store/index.js';
import { dbAll } from '../services/db.js';
import { generateDream } from '../services/contentEngine.js';

const dreams = ref([]);
const selectedCharId = ref(null);
const isGenerating = ref(false);

const sortedDreams = computed(() => [...dreams.value].sort((a, b) => b.createdAt - a.createdAt));

onMounted(async () => {
  await globalStore.loadCharacters();
  dreams.value = await dbAll('dreams');
  if (globalStore.characters.length > 0 && !selectedCharId.value) {
    selectedCharId.value = globalStore.characters[0].id;
  }
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
  if (mins < 60) return `${mins}分`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時`;
  return `${Math.floor(hrs / 24)}天`;
}

async function doGenerate() {
  if (!selectedCharId.value || isGenerating.value) return;
  isGenerating.value = true;
  try {
    const res = await generateDream(selectedCharId.value);
    if (res && res.entry) {
      dreams.value.push(res.entry);
      if (res.truncated) window.toast_('⚠ 夢境可能被截斷');
    }
  } catch (err) {
    window.toast_('生成失敗：' + err.message);
  } finally {
    isGenerating.value = false;
  }
}
</script>
