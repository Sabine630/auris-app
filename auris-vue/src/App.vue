<template>
  <div id="phone-container" class="phone" :data-theme="globalStore.theme">
    <!-- Status Bar (Desktop Only Preview) -->
    <div class="sb">
      <div class="sb-time" id="clock">{{ time }}</div>
      <div class="di"><div class="di-cam"></div></div>
      <div class="sb-r">
        <svg viewBox="0 0 24 24" width="16" height="16"><rect x="2" y="7" width="20" height="10" rx="2"/><rect x="22" y="10" width="2" height="4"/></svg>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="screen">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
    <!-- Toast -->
    <div id="toast" class="toast"></div>

    <!-- Bottom Navigation -->
    <BottomNav v-if="showNav" />

    <!-- Announcement Modal -->
    <AnnouncementModal v-if="showAnnouncement" @close="closeAnnouncement" />

    <!-- Confirm Modal -->
    <Teleport to="body">
      <div v-if="confirmVisible" class="cm-overlay" @click.self="onConfirmCancel">
        <div class="cm-box">
          <div class="cm-msg">{{ confirmMsg }}</div>
          <div class="cm-btns">
            <button class="cm-btn cm-cancel" @click="onConfirmCancel">取消</button>
            <button class="cm-btn cm-ok" @click="onConfirmOk">確定</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { globalStore } from './store/index.js';
import { getSetting, setSetting, dbAll, dbIdx, dbIdxCount, dbGet, dbDel } from './services/db.js';
import { generateDiary, generatePost } from './services/contentEngine.js';
import { generateCycleCareMessage, generateScheduleMessage, generateMissYouMessage, generateDailyQuestion, hasUnrepliedProactive, processDueBusyReply } from './services/chatEngine.js';
import { getCyclePhase } from './services/cycle.js';
import { localDateKey } from './services/date.js';
import BottomNav from './components/BottomNav.vue';
import AnnouncementModal from './components/AnnouncementModal.vue';

const ANNOUNCEMENT_VERSION = 'P100';
const showAnnouncement = ref(false);

// ── 全域 confirm modal ─────────────────────────────────────────────────────
const confirmVisible = ref(false);
const confirmMsg = ref('');
let confirmResolve = null;

window.confirm_ = (msg) => new Promise(resolve => {
  confirmMsg.value = msg;
  confirmVisible.value = true;
  confirmResolve = resolve;
});

function onConfirmOk() { confirmVisible.value = false; confirmResolve?.(true); }
function onConfirmCancel() { confirmVisible.value = false; confirmResolve?.(false); }

async function closeAnnouncement() {
  showAnnouncement.value = false;
  await setSetting('last_seen_announcement', ANNOUNCEMENT_VERSION);
}

window.openAnnouncement_ = () => { showAnnouncement.value = true; };

const route = useRoute();
const router = useRouter();
const time = ref('');

const showNav = computed(() => {
  const hiddenRoutes = ['chat', 'onboarding', 'api', 'lock', 'char-edit', 'char-manage', 'group-room', 'group-create', 'post-detail', 'diary-detail', 'dream-detail', 'relation'];
  return !hiddenRoutes.includes(route.name);
});

function updateClock() {
  const n = new Date();
  const h = n.getHours();
  const m = n.getMinutes().toString().padStart(2, '0');
  time.value = `${h}:${m}`;
}

let toastTimer;
window.toast_ = (msg, ms = 4500) => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
};

const THEME_BG = {
  cream: '#f7f5f2', warm: '#ede8e0', dark: '#0f0e0d',
  gray: '#f0eef2', ocean: '#eef2f5', matcha: '#eff3ee'
};

function generatePWAIcon() {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    const ctx = c.getContext('2d');
    // 圓角矩形背景
    const r = 42;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(192 - r, 0); ctx.quadraticCurveTo(192, 0, 192, r);
    ctx.lineTo(192, 192 - r); ctx.quadraticCurveTo(192, 192, 192 - r, 192);
    ctx.lineTo(r, 192); ctx.quadraticCurveTo(0, 192, 0, 192 - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fillStyle = '#f7f5f2'; ctx.fill();
    // 文字 A
    ctx.fillStyle = '#c9887a';
    ctx.font = 'italic 300 96px Georgia,serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('A', 96, 134);
    const png = c.toDataURL('image/png');
    // 設定 Apple Touch Icon
    const atiEl = document.getElementById('ati');
    if (atiEl) atiEl.href = png;
    // 設定 Favicon
    const favEl = document.getElementById('fav');
    if (favEl) favEl.href = png;
    // 動態生成 manifest（跟當前主題同步）
    const themeBg = THEME_BG[globalStore.theme] || THEME_BG.cream;
    const manifest = {
      name: 'Auris',
      short_name: 'Auris',
      description: '你說，他在聽',
      start_url: './',
      display: 'standalone',
      background_color: themeBg,
      theme_color: themeBg,
      icons: [
        { src: png, sizes: '192x192', type: 'image/png' },
        { src: png, sizes: '512x512', type: 'image/png' }
      ]
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(manifestBlob);
    const manifestLink = document.getElementById('manifest-link');
    if (manifestLink) manifestLink.href = manifestURL;
    // 同步 theme-color meta
    const themeMeta = document.getElementById('theme-color-meta');
    if (themeMeta) themeMeta.content = themeBg;
  } catch (e) {
    console.error('PWA Icon generation failed:', e);
  }
}

// Sync html element background with current theme so iOS keyboard flash matches app color
function syncRootBg(theme) {
  document.documentElement.style.background = THEME_BG[theme] || THEME_BG.cream;
}
watch(() => globalStore.theme, syncRootBg);

async function runDailyAutoGen() {
  try {
    const today = localDateKey();
    const lastDate = await getSetting('last_auto_gen_date');
    if (lastDate === today) return;
    // 去重 key 改為「跑完之後」才寫（#4）：原本先寫 key 再生成，整批 API 失敗（斷網／額度）
    // 時當天內容靜默丟失、不再重試。

    const chars = await dbAll('characters');
    let count = 0;
    let hadError = false;
    for (const c of chars) {
      if (c.autoDiary) {
        const diaries = await dbIdx('diary', 'charId', c.id);
        if (!diaries.some(d => d.date === today)) {
          try { const r = await generateDiary(c.id); if (r) count++; } catch (_) { hadError = true; }
        }
      }
      if (c.autoPost) {
        try { const r = await generatePost(c.id); if (r) count++; } catch (_) { hadError = true; }
      }
    }
    // 整批全失敗（有嘗試但一則都沒成功）就不寫 key，下次開 app 重試；沒有任何自動項目要跑
    // （count 0 且無錯）仍寫 key，避免每次開 app 空轉。
    // 貼文無獨立當日去重，但因 key 只在 count>0（至少一則成功）時寫，重試只發生在「一則都沒成功」時，
    // 屆時沒有既存貼文可重複——日記另有 diaries.some 天然去重，故無重複風險。
    if (!(count === 0 && hadError)) {
      await setSetting('last_auto_gen_date', today);
    }
    if (count > 0) window.toast_?.(`已自動生成今日內容（${count} 則）`);
  } catch (_) {}
}

// 主動訊息之間至少間隔的時間，避免一次冒出好幾則互不相關的開場白（可調）。
const PROACTIVE_MIN_GAP_MS = 3 * 60 * 60 * 1000; // 3 小時

async function lastProactiveAt(charId) {
  const v = await getSetting('last_proactive_' + charId);
  return typeof v === 'number' ? v : 0;
}

// 環境主動訊息的勿擾時段：23:00–08:00 不發想你／每日一問／生理期關心（定時提醒不受此限）。
function inQuietHours() {
  const h = new Date().getHours();
  return h >= 23 || h < 8;
}

// 生成成功才寫當天去重 key（#4）；失敗則靠當日重試計數（最多 3 次）——達上限即視同已發，
// 避免壞掉的設定（斷網／額度用完）每個 min-gap 週期都重打一次 API。
// last_proactive_ 一律在嘗試前寫，維持「剛嘗試過主動就先別再疊」的 min-gap 語意
// （連帶讓失敗重試自然被 3 小時間隔錯開，不會每 5 分鐘硬打）。
async function dispatchProactive({ charId, dedupKey, tryKey, today, now, gen }) {
  await setSetting('last_proactive_' + charId, now);
  const rec = await getSetting(tryKey);
  const count = (rec && rec.date === today ? rec.count : 0) + 1;
  await setSetting(tryKey, { date: today, count });
  let ok = false;
  try { ok = !!(await gen()); } catch (_) {}
  if (ok || count >= 3) await setSetting(dedupKey, today);
}

// 統一派發「想你／每日一問／生理期關心」三種環境主動訊息：開 app＋每 5 分鐘各跑一次。
// 全域每輪最多送「一則」（避免多角色開 app 同時爆量），並過數道閘門——
// 角色暫停主動訊息、勿擾時段、上一則主動訊息還沒回、距上一則未滿間隔——才會送，
// 讓主動訊息像真人一樣分時段到、不再一次砸一堆。各型仍保有「當天一次」的去重 key。
// 優先序：生理期關心（健康）→ 每日一問 → 我想你（環境問候）。
async function runProactiveDispatch() {
  try {
    // 勿擾時段直接整輪略過（環境問候不該半夜冒出來）
    if (inQuietHours()) return;

    const today = localDateKey();
    const now = Date.now();

    // 生理期觸發判斷（全域，依玩家經期設定）：預測經期開始日 / 經期前 2 天
    let cycleTrigger = null;
    try {
      const me = await getSetting('me_settings');
      if (me && me.cycleEnabled && me.lastPeriodStart) {
        const ph = getCyclePhase(me);
        if (ph) {
          if (ph.dayInCycle === 0) cycleTrigger = 'period';
          else if (ph.daysUntilNext === 2) cycleTrigger = 'pms';
        }
      }
    } catch (_) {}

    const chars = await dbAll('characters');
    for (const c of chars) {
      // 閘門 0：角色已暫停所有主動訊息（總開關）
      if (c.proactiveMute) continue;
      // 閘門 1：上一則主動訊息還沒回，先不疊
      if (await hasUnrepliedProactive(c.id)) continue;
      // 閘門 2：距上一則主動訊息未滿間隔，先不發
      if (now - (await lastProactiveAt(c.id)) < PROACTIVE_MIN_GAP_MS) continue;

      // 只需要「訊息數是否達門檻」，用 index 計數即可，不整包載入（#8）。
      const msgCount = await dbIdxCount('messages', 'charId', c.id);

      // 生理期關心（需有基本對話量，避免對剛建的陌生角色就發）
      if (cycleTrigger && c.cycleCare && msgCount >= 3 && (await getSetting('cycle_care_' + c.id)) !== today) {
        await dispatchProactive({ charId: c.id, dedupKey: 'cycle_care_' + c.id, tryKey: 'cycle_care_try_' + c.id, today, now, gen: () => generateCycleCareMessage(c.id, cycleTrigger) });
        return; // 全域每輪最多一則
      }
      // 每日一問
      if (c.dailyQuestionEnabled && msgCount >= 3 && (await getSetting('daily_q_' + c.id)) !== today) {
        await dispatchProactive({ charId: c.id, dedupKey: 'daily_q_' + c.id, tryKey: 'daily_q_try_' + c.id, today, now, gen: () => generateDailyQuestion(c.id) });
        return; // 全域每輪最多一則
      }
      // 我想你（每天只擲一次 40% 機率：擲過就寫 key，當天不再重擲，避免「偶爾」變成「幾乎必發」）
      // #4 註記：此處刻意「不」改成成功後才寫 key。miss_you_ 記錄的是「今天擲過骰」而非「發成功」——
      // 生成失敗就當作今天沒想起，符合功能個性；若改成失敗重試會讓「偶爾想你」失去隨機感。勿誤修。
      if (c.missYouEnabled && msgCount >= 5 && (await getSetting('miss_you_' + c.id)) !== today) {
        await setSetting('miss_you_' + c.id, today);
        if (Math.random() <= 0.4) {
          await setSetting('last_proactive_' + c.id, now);
          try { await generateMissYouMessage(c.id); } catch (_) {}
          return; // 全域每輪最多一則
        }
      }
    }
  } catch (_) {}
}

// 作息時段主動訊息：每 5 分鐘掃一次，時間命中且當天未發過才觸發
async function runScheduleTriggers() {
  try {
    const chars = await dbAll('characters');
    const now = new Date();
    const nowHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const today = localDateKey(now);

    // 每日一次：清 7 天前的 sched_sent_/sched_try_ key（#4）。這些 key 是「每角色每時段每天」
    // 一顆，settings 無前綴查詢、不清會隨天數無限成長。撈全表過濾（一天只跑一次，成本可忽略）。
    if ((await getSetting('sched_cleanup_date')) !== today) {
      await setSetting('sched_cleanup_date', today);
      try {
        const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7);
        const cutoffKey = localDateKey(cutoff);
        for (const row of await dbAll('settings')) {
          const k = row.key;
          if (!k || (!k.startsWith('sched_sent_') && !k.startsWith('sched_try_'))) continue;
          const m = k.match(/(\d{4}-\d{2}-\d{2})$/);
          if (m && m[1] < cutoffKey) await dbDel('settings', k);
        }
      } catch (_) {}
    }

    for (const c of chars) {
      if (!c.scheduleTriggers || !c.scheduleTriggers.length) continue;
      // 角色已暫停所有主動訊息（總開關）
      if (c.proactiveMute) continue;
      // 上一則主動訊息還沒回就先不疊（定時提醒不受 min-gap 限制，到點仍會發）
      if (await hasUnrepliedProactive(c.id)) continue;
      for (const t of c.scheduleTriggers) {
        if (!t.enabled || !t.time || !t.desc) continue;
        // 容差視窗：到點前 4 分鐘 ~ 到點後 60 分鐘內都算「該發」。
        // 往後放寬到 60 分鐘是為了補發——若到點當下 app 沒開／在勿擾沒掃到，
        // 之後開 app 仍會在一小時內補上，但不會遲到太久變成怪提醒（當天去重 key 確保只發一次）。
        const [th, tm] = t.time.split(':').map(Number);
        const triggerMins = th * 60 + tm;
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const lateBy = nowMins - triggerMins;
        if (lateBy < -4 || lateBy > 60) continue;
        const key = `sched_sent_${c.id}_${t.time}_${today}`;
        if (await getSetting(key)) continue;
        // 去重 key 改成功後才寫（#4）＋當日重試計數（最多 3 次）。定時提醒不受 min-gap 限制，
        // 失敗時後續 5 分鐘掃描會重試——仍受 -4~+60 分容差視窗約束，超窗自然放棄（明天 key 不同）。
        // tryKey 已含日期（每日新 key），計數用單純數字即可。
        const tryKey = `sched_try_${c.id}_${t.time}_${today}`;
        const tryCount = ((await getSetting(tryKey)) || 0) + 1;
        await setSetting(tryKey, tryCount);
        await setSetting('last_proactive_' + c.id, Date.now());
        let ok = false;
        try { ok = !!(await generateScheduleMessage(c.id, t.desc)); } catch (_) {}
        if (ok || tryCount >= 3) await setSetting(key, true);
        return; // 本輪只發一則：相近時間的多個定時提醒會在後續 5 分鐘掃描中自然錯開（F）
      }
    }
  } catch (_) {}
}

// 派發鎖＋序列化：定時、環境兩套派發器同一時刻並行檢查閘門時，會在對方訊息還沒寫進 DB
// 前都放行而各生一則（競態，A）。改成同一時間只跑一輪、且定時先跑完（含寫入）再跑環境，
// 環境派發本就尊重 last_proactive_ 的 3 小時間隔，於是整輪實際上最多送出一則主動訊息。
// 已讀不回補發（P96）：正開著該聊天室時交給房內計時器，其餘角色到期就在背景補生成。
// 這是「欠的回覆」不是新的主動訊息，所以不吃勿擾／min-gap 閘門，且排在兩套派發器之前。
async function runBusyReplyCatchup() {
  try {
    const chars = await dbAll('characters');
    for (const c of chars) {
      if (route.name === 'chat' && route.params.id === c.id) continue;
      if (await processDueBusyReply(c.id)) return; // 每輪最多補一則
    }
  } catch (_) {}
}

let proactiveBusy = false;
async function runAllProactive() {
  if (proactiveBusy) return;
  proactiveBusy = true;
  try {
    await runBusyReplyCatchup();
    await runScheduleTriggers();
    await runProactiveDispatch();
  } finally {
    proactiveBusy = false;
  }
}

let timer;
let schedTimer;
onMounted(async () => {
  await globalStore.init();
  syncRootBg(globalStore.theme);
  updateClock();
  timer = setInterval(updateClock, 10000);

  // Generate PWA icon and manifest
  generatePWAIcon();

  // Check onboarding — also skip if user already has characters (e.g. after backup restore)
  const obDone = await getSetting('onboarding_done');
  if (!obDone && route.name !== 'onboarding') {
    const chars = await dbAll('characters');
    if (chars && chars.length > 0) {
      await setSetting('onboarding_done', true);
    } else {
      router.push('/onboarding');
    }
  }

  // Show announcement modal if user hasn't seen this version yet
  const lastSeen = await getSetting('last_seen_announcement');
  if (lastSeen !== ANNOUNCEMENT_VERSION) {
    setTimeout(() => { showAnnouncement.value = true; }, 600);
  }

  // Daily auto-generation (runs silently in background, P50)
  runDailyAutoGen();

  // 主動訊息（背景靜默；P79 起改為分時段、一次一則，不再開 app 同時全冒出來）
  // P81：用 runAllProactive 序列化＋上鎖，定時先跑完再跑環境，整輪最多一則，杜絕競態疊訊息。
  runAllProactive();
  schedTimer = setInterval(runAllProactive, 5 * 60 * 1000);

  // Prevent iOS Safari swipe-back gesture (left/right edge swipe)
  document.addEventListener('touchstart', (e) => {
    const x = e.touches[0].clientX;
    if (x < 20 || x > window.innerWidth - 20) e.preventDefault();
  }, { passive: false });

  // iOS PWA keyboard: scroll focused input into view after keyboard animates in
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA')) return;
    if (t.id === 'lock-in') return;
    setTimeout(() => {
      try { t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
    }, 300);
  });
});

onUnmounted(() => {
  clearInterval(timer);
  clearInterval(schedTimer);
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
.cm-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
}
.cm-box {
  background: var(--surface);
  border-radius: 16px;
  padding: 24px 20px 16px;
  width: min(320px, 85vw);
  box-shadow: 0 8px 32px rgba(0,0,0,.18);
}
.cm-msg {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin-bottom: 20px;
  text-align: center;
}
.cm-btns {
  display: flex;
  gap: 10px;
}
.cm-btn {
  flex: 1;
  padding: 11px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity .15s;
}
.cm-btn:active { opacity: .7; }
.cm-cancel {
  background: var(--surface);
  color: var(--text-3);
  border: .5px solid var(--border);
}
.cm-ok {
  background: var(--rose);
  color: #fff;
}
</style>
