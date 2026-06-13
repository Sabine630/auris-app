<template>
  <div class="page active" id="pg-relation">
    <div class="ph">
      <div class="ph-back" @click="$router.back()">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回
      </div>
      <div class="ph-title">關係主頁</div>
    </div>

    <div v-if="!char" class="rel-loading">載入中…</div>

    <div v-else class="rel-body">
      <!-- 角色卡片 -->
      <div class="rel-hero">
        <div class="rel-av">
          <img v-if="char.avatar && char.avatar.startsWith('data:')" :src="char.avatar">
          <span v-else>{{ char.avatar || '🌸' }}</span>
        </div>
        <div class="rel-name">{{ char.name }}</div>
        <div class="rel-type">{{ relationLabel }}</div>
      </div>

      <!-- 在一起天數（最醒目） -->
      <div v-if="char.togetherDate" class="rel-together">
        <div class="rel-together-num">{{ togetherDays }}</div>
        <div class="rel-together-label">天</div>
        <div class="rel-together-sub">在一起・從 {{ char.togetherDate }} 起</div>
      </div>

      <!-- 統計磚塊 -->
      <div class="rel-grid">
        <div class="rel-card" v-if="char.meetDate">
          <div class="rel-card-ic">🌸</div>
          <div class="rel-card-num">{{ meetDays }}</div>
          <div class="rel-card-label">相識天數</div>
          <div class="rel-card-sub">{{ char.meetDate }}</div>
        </div>
        <div class="rel-card">
          <div class="rel-card-ic">💬</div>
          <div class="rel-card-num">{{ msgCount }}</div>
          <div class="rel-card-label">對話則數</div>
          <div class="rel-card-sub" v-if="firstMsgDate">首次：{{ firstMsgDate }}</div>
        </div>
      </div>

      <!-- 我們的（願望清單・備忘錄入口） -->
      <div class="rel-section rel-entry-section">
        <div class="rel-entry-card" @click="goTogether">
          <div class="rel-entry-ic">💝</div>
          <div class="rel-entry-info">
            <div class="rel-entry-label">我們的願望清單・備忘錄</div>
            <div class="rel-entry-sub">記下想一起做的事、約定與計畫</div>
          </div>
          <div class="rel-entry-arrow">›</div>
        </div>
      </div>

      <!-- 即將到來的重要日子 -->
      <div v-if="upcoming.length" class="rel-section">
        <div class="rel-section-title">即將到來</div>
        <div class="rel-upcoming-list">
          <div v-for="item in upcoming" :key="item.label" class="rel-upcoming-item">
            <div class="rel-upcoming-icon">{{ item.icon }}</div>
            <div class="rel-upcoming-info">
              <div class="rel-upcoming-label">{{ item.label }}</div>
              <div class="rel-upcoming-date">{{ item.date }}</div>
            </div>
            <div class="rel-upcoming-days" :class="{ today: item.daysLeft === 0 }">
              {{ item.daysLeft === 0 ? '今天！' : `${item.daysLeft} 天後` }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet, dbIdx, getSetting } from '../services/db.js';

const route = useRoute();
const router = useRouter();
const charId = route.params.id;

function goTogether() {
  router.push('/together/' + charId);
}

const char = ref(null);
const msgCount = ref(0);
const firstMsgDate = ref('');

onMounted(async () => {
  char.value = await dbGet('characters', charId);
  const msgs = await dbIdx('messages', 'charId', charId);
  msgCount.value = msgs.length;
  if (msgs.length) {
    msgs.sort((a, b) => a.createdAt - b.createdAt);
    firstMsgDate.value = new Date(msgs[0].createdAt).toISOString().slice(0, 10);
  }
  me.value = await getSetting('me_settings') || {};
});

const me = ref({});

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

const togetherDays = computed(() => daysSince(char.value?.togetherDate));
const meetDays = computed(() => daysSince(char.value?.meetDate));

const relationLabel = computed(() => {
  const map = { lover: '戀人', childhood: '青梅竹馬', friend: '好友', online: '網友', colleague: '同事', stranger: '陌生人' };
  return map[char.value?.relation] || char.value?.relation || '';
});

// 計算某個「年度重複日」距今幾天（取最近的未來日期，包含今天）
function daysUntilAnnual(mmdd) {
  if (!mmdd) return null;
  const now = new Date();
  const y = now.getFullYear();
  const [mm, dd] = mmdd.split('-').map(Number);
  let target = new Date(y, mm - 1, dd);
  if (target < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    target = new Date(y + 1, mm - 1, dd);
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((target - today) / 86400000);
}

const upcoming = computed(() => {
  if (!char.value) return [];
  const items = [];
  const c = char.value;

  if (c.birthday) {
    const d = daysUntilAnnual(c.birthday.slice(5));
    if (d !== null && d <= 90) items.push({ icon: '🎂', label: `${c.name} 的生日`, date: c.birthday.slice(5), daysLeft: d });
  }
  if (me.value?.birthday) {
    const d = daysUntilAnnual(me.value.birthday.slice(5));
    if (d !== null && d <= 90) items.push({ icon: '🎁', label: '我的生日', date: me.value.birthday.slice(5), daysLeft: d });
  }
  if (c.togetherDate) {
    const d = daysUntilAnnual(c.togetherDate.slice(5));
    if (d !== null && d <= 90) items.push({ icon: '❤️', label: '在一起紀念日', date: c.togetherDate.slice(5), daysLeft: d });
  }
  if (c.meetDate) {
    const d = daysUntilAnnual(c.meetDate.slice(5));
    if (d !== null && d <= 90) items.push({ icon: '🌸', label: '相識紀念日', date: c.meetDate.slice(5), daysLeft: d });
  }
  if (c.anniversaries && c.anniversaries.length) {
    for (const ann of c.anniversaries) {
      if (!ann.date || !ann.label) continue;
      const d = daysUntilAnnual(ann.date.slice(5));
      if (d !== null && d <= 90) items.push({ icon: '🗓️', label: ann.label, date: ann.date.slice(5), daysLeft: d });
    }
  }

  return items.sort((a, b) => a.daysLeft - b.daysLeft);
});
</script>

<style scoped>
.rel-loading { padding: 60px 20px; text-align: center; color: var(--text-3); font-size: 14px; }

.rel-body { padding: 0 0 40px; overflow-y: auto; flex: 1; }

.rel-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 20px 20px;
  gap: 8px;
}
.rel-av {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  overflow: hidden;
  border: .5px solid var(--border);
}
.rel-av img { width: 100%; height: 100%; object-fit: cover; }
.rel-name { font-size: 20px; font-weight: 600; color: var(--text); letter-spacing: .02em; }
.rel-type { font-size: 12px; color: var(--text-3); font-weight: 300; }

.rel-together {
  margin: 0 20px 20px;
  background: var(--rose);
  border-radius: 18px;
  padding: 24px 20px;
  text-align: center;
  color: #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,.1);
}
.rel-together-num { font-size: 56px; font-weight: 700; line-height: 1; letter-spacing: -.02em; }
.rel-together-label { font-size: 18px; font-weight: 400; opacity: .85; margin-top: 4px; }
.rel-together-sub { font-size: 12px; opacity: .7; margin-top: 8px; font-weight: 300; letter-spacing: .03em; }

.rel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 20px 20px;
}
.rel-card {
  background: var(--card);
  border-radius: 16px;
  padding: 18px 16px;
  border: .5px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.rel-card-ic { font-size: 22px; margin-bottom: 4px; }
.rel-card-num { font-size: 28px; font-weight: 700; color: var(--text); line-height: 1; }
.rel-card-label { font-size: 11px; color: var(--text-3); font-weight: 300; margin-top: 2px; }
.rel-card-sub { font-size: 10px; color: var(--text-3); opacity: .7; }

.rel-section { padding: 0 20px; }
.rel-section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
  letter-spacing: .08em;
  text-transform: uppercase;
  margin-bottom: 12px;
}
.rel-upcoming-list { display: flex; flex-direction: column; gap: 10px; }
.rel-upcoming-item {
  background: var(--card);
  border-radius: 14px;
  border: .5px solid var(--border);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.rel-upcoming-icon { font-size: 22px; flex-shrink: 0; }
.rel-upcoming-info { flex: 1; min-width: 0; }
.rel-upcoming-label { font-size: 13px; font-weight: 500; color: var(--text); }
.rel-upcoming-date { font-size: 11px; color: var(--text-3); font-weight: 300; margin-top: 2px; }
.rel-upcoming-days {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
  flex-shrink: 0;
  white-space: nowrap;
}
.rel-upcoming-days.today { color: var(--rose); }

.rel-entry-section { margin-bottom: 20px; }
.rel-entry-card {
  background: var(--card);
  border-radius: 14px;
  border: .5px solid var(--border);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
}
.rel-entry-card:active { background: var(--surface); }
.rel-entry-ic { font-size: 24px; flex-shrink: 0; }
.rel-entry-info { flex: 1; min-width: 0; }
.rel-entry-label { font-size: 14px; font-weight: 500; color: var(--text); }
.rel-entry-sub { font-size: 11px; color: var(--text-3); font-weight: 300; margin-top: 3px; }
.rel-entry-arrow { font-size: 20px; color: var(--text-3); flex-shrink: 0; }
</style>
