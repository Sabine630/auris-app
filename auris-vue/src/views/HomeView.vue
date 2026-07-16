<template>
  <div class="page active" id="pg-home">
    <div class="h-top anim">
      <div class="h-greeting" id="greet">{{ greeting }}</div>
      <div class="h-name">你的 <em>世界</em></div>
      <div class="h-ann-btn" @click="openAnnouncement">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        P114 更新公告
      </div>
    </div>

    <!-- Character bar：常聊的在前，「新增角色」在列尾 -->
    <div class="h-chars anim" style="animation-delay:.05s">
      <div v-for="char in sortedChars" :key="char.id" class="h-char-item" @click="$router.push('/chat/' + char.id)">
        <div class="h-char-av" :class="{ online: char.hasUnread }">
          <img v-if="char.avatar && char.avatar.startsWith('data:')" :src="char.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:13px">
          <span v-else>{{ char.avatar || '🌸' }}</span>
          <div class="h-char-av-dot" v-if="char.hasUnread"></div>
        </div>
        <div class="h-char-name">{{ char.name }}</div>
      </div>
      <div class="h-char-all" @click="$router.push('/char-edit')">
        <div class="h-char-all-ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg></div>
        <div class="h-char-all-name">新增角色</div>
      </div>
    </div>

    <div class="h-world anim" style="animation-delay:.08s" @click="$toast('多世界模式即將開放')">
      <div class="h-world-name">▸ &nbsp;主世界 · World One</div>
      <svg width="10" height="7" viewBox="0 0 10 7" style="flex-shrink:0"><path d="M1 1.5L5 5.5L9 1.5" stroke="var(--rose)" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>

    <div class="h-divider"></div>

    <!-- 備份提醒卡（P105 M1）：從未備份且訊息 ≥ 50，或距上次備份超過 14 天才出現 -->
    <div v-if="backupRemind" class="wg backup-card anim" style="animation-delay:.05s">
      <div class="backup-title">💾 備份提醒</div>
      <div class="backup-text">{{ backupRemind.kind === 'first'
        ? '你們的對話已累積不少。所有資料只存在這台裝置上，換機或清除瀏覽器資料將無法找回，建議現在備份一份。'
        : `距離上次備份已 ${backupRemind.days} 天。所有資料只存在這台裝置上，建議定期匯出備份。` }}</div>
      <div class="backup-actions">
        <button class="backup-btn primary" @click="doBackupNow">立即備份</button>
        <button class="backup-btn" @click="snoozeBackup">稍後</button>
      </div>
    </div>

    <!-- 今日心情打卡（P96）：未打卡顯示完整卡片；已打卡縮成 chip，點擊可重選 -->
    <div v-if="!todayMood || moodPickerOpen" class="wg mood-card anim" style="animation-delay:.06s">
      <div class="mood-title">
        <span>今天的心情</span>
        <span v-if="moodPickerOpen" class="mood-close" @click="moodPickerOpen = false">收起</span>
      </div>
      <div class="mood-opts">
        <div v-for="mo in MOODS" :key="mo.key" class="mood-opt" :class="{ sel: pickedMood === mo.key }" @click="pickedMood = mo.key">
          <div class="mood-opt-emoji">{{ mo.emoji }}</div>
          <div class="mood-opt-label">{{ mo.label }}</div>
        </div>
      </div>
      <div v-if="pickedMood" class="mood-note-row">
        <input class="mood-note-in" v-model="moodNote" maxlength="60" placeholder="想補充一句嗎？（選填）" @keyup.enter="saveMood" />
        <button class="mood-save" @click="saveMood">記下</button>
      </div>
    </div>
    <div v-else class="mood-chip anim" style="animation-delay:.06s" @click="openMoodPicker">
      今日心情 {{ moodEmoji(todayMood.mood) }}<span v-if="todayMood.note" class="mood-chip-note">・{{ snippet(todayMood.note, 14) }}</span>
    </div>

    <!-- 最近對話 widget -->
    <div class="h-sec-row">
      <div class="h-sec">對話</div>
      <div class="h-sec-more" @click="$router.push('/chat-list')">全部 ›</div>
    </div>
    <div class="wg wg-chat anim" style="animation-delay:.07s">
      <template v-if="recentChats.length">
        <div v-for="item in recentChats" :key="item.c.id" class="wc-row" @click="$router.push('/chat/' + item.c.id)">
          <div class="wc-av">
            <img v-if="item.c.avatar && item.c.avatar.startsWith('data:')" :src="item.c.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:11px">
            <span v-else>{{ item.c.avatar || '🌸' }}</span>
            <div class="wc-av-dot" v-if="item.c.hasUnread"></div>
          </div>
          <div class="wc-body">
            <div class="wc-name">{{ item.c.name }}</div>
            <div class="wc-snippet" :class="{ unread: item.c.hasUnread }">{{ msgSnippet(item.last) }}</div>
          </div>
          <div class="wc-time">{{ timeAgo(item.last.createdAt) }}</div>
        </div>
      </template>
      <div v-else-if="!globalStore.characters.length" class="wc-empty" @click="$router.push('/char-edit')">
        先新增一個角色，開始你們的故事 ›
      </div>
      <div v-else class="wc-empty" @click="$router.push('/chat-list')">
        說點什麼，開始你們的故事 ›
      </div>
    </div>

    <!-- 每日一問 widget（今天有未回答的提問才出現） -->
    <div v-if="dailyQ" class="wg wg-q anim" style="animation-delay:.10s" @click="$router.push('/chat/' + dailyQ.char.id)">
      <div class="wq-bar"></div>
      <div class="wq-label">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        每日一問
      </div>
      <div class="wq-text">{{ snippet(dailyQ.msg.content, 80) }}</div>
      <div class="wq-status"><em>{{ dailyQ.char.name }}</em> 在等你的回答 ›</div>
    </div>

    <!-- 角色生活：內容活的磁磚 -->
    <div class="h-sec">角色生活</div>
    <div class="tg" style="margin-bottom:10px">
      <div class="tile anim" :class="{ 't-empty': !latestHv }" style="animation-delay:.07s" @click="$router.push('/blackbox')">
        <div class="t-hd">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <div class="t-name">心聲</div>
        </div>
        <div class="t-live" v-if="latestHv">「{{ snippet(latestHv.content, 30) }}」</div>
        <div class="t-live" v-else>那些說不出口的</div>
        <div class="t-meta" v-if="latestHv">{{ charName(latestHv.charId) }} · {{ timeAgo(latestHv.createdAt) }}</div>
        <div class="t-meta" v-else>還沒有心聲</div>
      </div>

      <div class="tile anim" :class="{ 't-empty': !latestDiary }" style="animation-delay:.10s" @click="$router.push('/diary')">
        <div class="t-hd">
          <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8M8 11h5"/></svg>
          <div class="t-name">日記</div>
        </div>
        <div class="t-live" v-if="latestDiary"><em>{{ charName(latestDiary.charId) }}</em> 寫了「{{ diaryTitle(latestDiary.content) }}」</div>
        <div class="t-live" v-else>還沒有日記</div>
        <div class="t-meta" v-if="latestDiary">{{ timeAgo(latestDiary.createdAt) }} · 共 {{ diaryCount }} 篇</div>
        <div class="t-meta" v-else>讓他寫下今天</div>
      </div>

      <div class="tile anim" :class="{ 't-empty': !latestDream }" style="animation-delay:.13s" @click="$router.push('/dream')">
        <div class="t-hd">
          <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          <div class="t-name">夢境</div>
        </div>
        <div class="t-live" v-if="latestDream"><em>{{ charName(latestDream.charId) }}</em> 夢見「{{ snippet(latestDream.content, 20) }}」</div>
        <div class="t-live" v-else>還沒有夢境紀錄</div>
        <div class="t-meta" v-if="latestDream">{{ timeAgo(latestDream.createdAt) }} · 共 {{ dreamCount }} 個夢</div>
        <div class="t-meta" v-else>他今晚會夢見什麼？</div>
      </div>

      <div class="tile anim" :class="{ 't-empty': !latestNotif }" style="animation-delay:.16s" @click="$router.push('/notifications')">
        <div class="t-hd">
          <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          <div class="t-name">通知</div>
        </div>
        <div v-if="unreadNotifCount > 0" class="t-badge">{{ unreadNotifCount > 99 ? '99+' : unreadNotifCount }}</div>
        <div class="t-live" v-if="latestNotif"><em>{{ charName(latestNotif.charId) }}</em> {{ latestNotif.text }}</div>
        <div class="t-live" v-else>無新通知</div>
        <div class="t-meta">{{ unreadNotifCount > 0 ? `${unreadNotifCount} 則未讀` : '一切安好' }}</div>
      </div>
    </div>

    <!-- 低頻入口降為小捷徑列 -->
    <div class="h-sec">更多</div>
    <div class="sc-row anim" style="animation-delay:.10s">
      <div class="sc" @click="$router.push('/moments')">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
        <span>貼文</span>
      </div>
      <div class="sc" @click="$router.push('/group-list')">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
        <span>群組</span>
      </div>
      <div class="sc" @click="$router.push('/worlds')">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
        <span>世界書</span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { globalStore } from '../store/index.js';
import { dbAll, dbIdx } from '../services/db.js';
import { MOODS, getTodayMood, setTodayMood } from '../services/mood.js';
import { doBackup, shouldRemindBackup, snoozeBackupReminder } from '../services/backup.js';

const lastMsgByChar = ref({});

// ── 備份提醒（P105 M1）──
const backupRemind = ref(null);

async function doBackupNow() {
  try {
    await doBackup();
    backupRemind.value = null;
    window.toast_?.('備份完成（基於安全，備份不含 API 金鑰）');
  } catch (err) {
    window.toast_?.('備份失敗：' + (err?.message || err));
  }
}

async function snoozeBackup() {
  await snoozeBackupReminder();
  backupRemind.value = null;
}

// ── 今日心情打卡（P96）──
const todayMood = ref(null);
const moodPickerOpen = ref(false);
const pickedMood = ref('');
const moodNote = ref('');

async function saveMood() {
  if (!pickedMood.value) return;
  await setTodayMood(pickedMood.value, moodNote.value);
  todayMood.value = { mood: pickedMood.value, note: moodNote.value.trim() };
  moodPickerOpen.value = false;
  window.toast_?.('已記下今天的心情');
}

function openMoodPicker() {
  pickedMood.value = todayMood.value?.mood || '';
  moodNote.value = todayMood.value?.note || '';
  moodPickerOpen.value = true;
}

function moodEmoji(key) {
  return MOODS.find(m => m.key === key)?.emoji || '🙂';
}
const dailyQ = ref(null);
const latestHv = ref(null);
const latestDiary = ref(null);
const diaryCount = ref(0);
const latestDream = ref(null);
const dreamCount = ref(0);
const unreadNotifCount = ref(0);
const latestNotif = ref(null);

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 11) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
});

const sortedChars = computed(() =>
  [...globalStore.characters].sort((a, b) =>
    (lastMsgByChar.value[b.id]?.createdAt || 0) - (lastMsgByChar.value[a.id]?.createdAt || 0))
);

const recentChats = computed(() =>
  sortedChars.value
    .filter(c => lastMsgByChar.value[c.id])
    .slice(0, 3)
    .map(c => ({ c, last: lastMsgByChar.value[c.id] }))
);

onMounted(async () => {
  await globalStore.loadCharacters();
  try { todayMood.value = await getTodayMood(); } catch (_) {}
  try { backupRemind.value = await shouldRemindBackup(); } catch (_) {}

  // 每角色掃一次訊息：取最後一句（聊天 widget 用）＋今日未回答的每日一問
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const byChar = {};
  let dqBest = null;
  await Promise.all(globalStore.characters.map(async c => {
    const msgs = await dbIdx('messages', 'charId', c.id);
    msgs.sort((a, b) => b.createdAt - a.createdAt);
    const lastReal = msgs.find(m => m.type !== 'hv');
    if (lastReal) byChar[c.id] = lastReal;
    const dq = msgs.find(m => m.id.endsWith('_dq') && m.createdAt >= todayStart.getTime());
    if (dq) {
      const answered = msgs.some(m => m.role === 'user' && m.createdAt > dq.createdAt);
      if (!answered && (!dqBest || dq.createdAt > dqBest.msg.createdAt)) dqBest = { msg: dq, char: c };
    }
  }));
  lastMsgByChar.value = byChar;
  dailyQ.value = dqBest;

  const [memories, diary, dreams, notifications] = await Promise.all([
    dbAll('memories'), dbAll('diary'), dbAll('dreams'), dbAll('notifications')
  ]);
  latestHv.value = [...memories].sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  diaryCount.value = diary.length;
  latestDiary.value = [...diary].sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  dreamCount.value = dreams.length;
  latestDream.value = [...dreams].sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  const unread = notifications.filter(n => !n.read);
  unreadNotifCount.value = unread.length;
  latestNotif.value = [...unread].sort((a, b) => b.createdAt - a.createdAt)[0] || null;
});

function charName(charId) {
  const c = globalStore.characters.find(x => x.id === charId);
  return c ? c.name : 'Unknown';
}

// 去掉 markdown 符號與換行，給單行/兩行預覽用
function plain(text) {
  return (text || '').replace(/\*+/g, '').replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim();
}

function snippet(text, n) {
  const t = plain(text);
  return t.length > n ? t.slice(0, n) + '…' : t;
}

function msgSnippet(m) {
  if (!m.content) return m.image ? '〔圖片〕' : '';
  const prefix = m.role === 'user' ? '你：' : '';
  return prefix + plain(m.content);
}

function diaryTitle(content) {
  const lines = (content || '').split('\n').filter(l => l.trim());
  return snippet(lines[0] || '無題', 16);
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

function openAnnouncement() {
  window.openAnnouncement_?.();
}
</script>

<style scoped>
.h-ann-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  padding: 5px 12px;
  background: transparent;
  border: .5px solid var(--border-2);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 300;
  color: var(--text-3);
  cursor: pointer;
  transition: opacity .2s;
  letter-spacing: .03em;
}
.h-ann-btn:active { opacity: .6; }

/* ── 備份提醒卡（P105 M1）── */
.backup-card { padding: 14px 16px 12px; }
.backup-title {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-3);
  letter-spacing: .04em;
  margin-bottom: 8px;
}
.backup-text {
  font-size: 13px;
  font-weight: 300;
  color: var(--text-2);
  line-height: 1.65;
  margin-bottom: 12px;
}
.backup-actions { display: flex; gap: 8px; }
.backup-btn {
  flex: 1;
  padding: 8px 12px;
  border: .5px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 400;
  font-family: var(--font);
  cursor: pointer;
  transition: opacity .15s;
}
.backup-btn:active { opacity: .7; }
.backup-btn.primary {
  border: none;
  background: var(--rose);
  color: #fff;
}

/* ── 今日心情打卡（P96）── */
.mood-card { padding: 14px 16px 12px; }
.mood-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-3);
  letter-spacing: .04em;
  margin-bottom: 10px;
}
.mood-close { font-size: 11px; color: var(--text-3); cursor: pointer; padding: 2px 6px; }
.mood-opts { display: flex; justify-content: space-between; gap: 4px; }
.mood-opt {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 2px 6px;
  border-radius: 12px;
  cursor: pointer;
  transition: transform .12s ease, background .15s ease;
}
.mood-opt:active { transform: scale(1.1); }
.mood-opt.sel { background: var(--rose-pale); }
.mood-opt-emoji { font-size: 24px; line-height: 1; }
.mood-opt-label { font-size: 11px; font-weight: 300; color: var(--text-3); }
.mood-note-row { display: flex; gap: 8px; margin-top: 10px; }
.mood-note-in {
  flex: 1;
  padding: 8px 12px;
  border: .5px solid var(--border);
  border-radius: 10px;
  background: var(--bg, transparent);
  color: var(--text);
  font-size: 13px;
  font-weight: 300;
  outline: none;
}
.mood-save {
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: var(--rose);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
}
.mood-chip {
  display: inline-flex;
  align-items: center;
  margin: 0 16px 10px;
  padding: 6px 14px;
  background: var(--surface);
  border: .5px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--sh);
  font-size: 12px;
  font-weight: 300;
  color: var(--text-3);
  cursor: pointer;
  letter-spacing: .03em;
}
.mood-chip:active { opacity: .6; }
.mood-chip-note { color: var(--text-3); }
</style>
