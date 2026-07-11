<template>
  <div class="page active" id="pg-memories">
    <div class="ph">
      <div class="ph-back" @click="$router.back()">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回
      </div>
      <div class="ph-title">我們的回憶</div>
    </div>

    <div class="mem-page-body">
      <div v-if="!loaded" class="mem-empty">載入中…</div>

      <template v-else-if="keepsakes.length">
        <div class="mem-count">收藏了 {{ keepsakes.length }} 則回憶</div>
        <div v-for="k in keepsakes" :key="k.id" class="ks-card">
          <div class="ks-card-hd">
            <span class="ks-card-who" :class="{ me: k.role === 'user' }">{{ k.role === 'user' ? '我' : k.charName }}</span>
            <span class="ks-card-date">{{ fmtDate(k.msgAt) }}</span>
            <div class="ks-card-del" :class="{ confirming: confirmingId === k.id }" @click.stop="onDelete(k)">
              <template v-if="confirmingId === k.id">確認刪除</template>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </div>
          </div>
          <div class="ks-card-content">{{ k.content }}</div>
          <div v-if="k.note" class="ks-card-note">✎ {{ k.note }}</div>
        </div>
      </template>

      <div v-else class="mem-empty">
        <div class="mem-empty-ic">⭐</div>
        <div>還沒有收藏</div>
        <div class="mem-empty-sub">在聊天室長按捨不得忘的訊息，<br>選「收藏成回憶」就會出現在這裡</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { listKeepsakes, removeKeepsake } from '../services/keepsakes.js';
import { localDateKey } from '../services/date.js';

const route = useRoute();
const charId = route.params.id;

const keepsakes = ref([]);
const loaded = ref(false);
const confirmingId = ref(null); // 刪除兩段式：第一下變「確認刪除」，再點才刪

onMounted(async () => {
  keepsakes.value = await listKeepsakes(charId);
  loaded.value = true;
  document.addEventListener('click', resetConfirm);
});

function resetConfirm() { confirmingId.value = null; }

function fmtDate(ts) {
  return ts ? localDateKey(new Date(ts)) : '';
}

async function onDelete(k) {
  if (confirmingId.value !== k.id) {
    confirmingId.value = k.id;
    return;
  }
  await removeKeepsake(k.id);
  keepsakes.value = keepsakes.value.filter(x => x.id !== k.id);
  confirmingId.value = null;
  window.toast_('已刪除收藏');
}
</script>

<style scoped>
.mem-page-body { flex: 1; overflow-y: auto; padding: 12px 20px 40px; }

.mem-count {
  font-size: 11px;
  font-weight: 300;
  color: var(--text-3);
  letter-spacing: .05em;
  margin-bottom: 12px;
  text-align: center;
}

.ks-card {
  background: var(--card);
  border: .5px solid var(--border);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 12px;
}
.ks-card-hd { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ks-card-who { font-size: 12px; font-weight: 500; color: var(--rose); }
.ks-card-who.me { color: var(--text-2); }
.ks-card-date { font-size: 11px; font-weight: 300; color: var(--text-3); flex: 1; }
.ks-card-del {
  color: var(--text-3);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
}
.ks-card-del svg { width: 15px; height: 15px; opacity: .6; }
.ks-card-del.confirming { color: var(--red, #c05050); font-weight: 500; }
.ks-card-content {
  font-size: 14px;
  font-weight: 300;
  color: var(--text);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
.ks-card-note {
  margin-top: 10px;
  padding-top: 8px;
  border-top: .5px dashed var(--border-2);
  font-size: 12px;
  font-weight: 300;
  color: var(--text-3);
  font-style: italic;
}

.mem-empty {
  padding: 80px 30px;
  text-align: center;
  color: var(--text-3);
  font-size: 14px;
  font-weight: 300;
}
.mem-empty-ic { font-size: 36px; margin-bottom: 14px; }
.mem-empty-sub { font-size: 12px; margin-top: 8px; line-height: 1.8; opacity: .8; }
</style>
