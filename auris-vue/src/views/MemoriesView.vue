<template>
  <div class="page active" id="pg-memories">
    <div class="ph">
      <div class="ph-back" @click="$router.back()">
        <svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回
      </div>
      <div class="ph-title">我們的回憶</div>
    </div>

    <!-- 三分頁：歷月回顧（D1）｜收藏（D2）｜寫給未來（D3） -->
    <div class="tab-bar">
      <div class="tab-item" :class="{ active: tab === 'review' }" @click="tab = 'review'">歷月回顧</div>
      <div class="tab-item" :class="{ active: tab === 'keepsake' }" @click="tab = 'keepsake'">收藏</div>
      <div class="tab-item" :class="{ active: tab === 'capsule' }" @click="tab = 'capsule'">⏳ 寫給未來</div>
    </div>

    <div class="mem-page-body">
      <div v-if="!loaded" class="mem-empty">載入中…</div>

      <!-- ── 歷月回顧 ── -->
      <template v-else-if="tab === 'review'">
        <div v-if="!hasCurrentReview" class="mem-gen-btn" :class="{ busy: generating }" @click="genReview(currentYm)">
          {{ generating === currentYm ? '他正在回顧這個月…' : '✨ 生成本月回顧（搶先版）' }}
        </div>
        <div v-if="!hasPrevReview && reviews.length" class="mem-gen-btn sub" :class="{ busy: generating }" @click="genReview(prevYm)">
          {{ generating === prevYm ? '他正在回顧上個月…' : '補生成上月回顧' }}
        </div>

        <template v-if="reviews.length">
          <div v-for="r in reviews" :key="r.id" class="rev-card">
            <div class="rev-hd">
              <div class="rev-title">{{ monthTitle(r.ym) }}</div>
              <div class="rev-share" @click="shareReview(r)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                存成圖片
              </div>
            </div>
            <div class="rev-stats">
              <div class="rev-stat"><div class="rev-stat-v">{{ r.stats.msgCount }}</div><div class="rev-stat-l">則訊息</div></div>
              <div class="rev-stat"><div class="rev-stat-v">{{ r.stats.chatDays }}</div><div class="rev-stat-l">天有聊天</div></div>
              <div class="rev-stat" v-if="r.stats.topPeriod"><div class="rev-stat-v">{{ r.stats.topPeriod }}</div><div class="rev-stat-l">最常聊</div></div>
              <div class="rev-stat" v-if="r.stats.moodDist && r.stats.moodDist[0]"><div class="rev-stat-v">{{ r.stats.moodDist[0].emoji }}</div><div class="rev-stat-l">最常{{ r.stats.moodDist[0].label }}</div></div>
            </div>
            <div v-if="r.stats.milestones && r.stats.milestones.length" class="rev-milestones">
              <div v-for="(ms, i) in r.stats.milestones" :key="i">{{ ms }}</div>
            </div>
            <div v-if="r.letter" class="rev-letter">
              <div class="rev-letter-from">{{ r.charName }} 的回顧</div>
              {{ r.letter }}
            </div>
            <div v-if="r.quotes && r.quotes.length" class="rev-quotes">
              <div class="rev-quotes-hd">⭐ 這個月你收藏的話</div>
              <div v-for="(q, i) in r.quotes" :key="i" class="rev-quote">「{{ q.content }}」</div>
            </div>
          </div>
        </template>

        <div v-else class="mem-empty">
          <div class="mem-empty-ic">📖</div>
          <div>還沒有月報</div>
          <div class="mem-empty-sub">每個月聊滿 100 則訊息，<br>月初打開 Auris 就會收到他寫的「我們的這個月」</div>
        </div>
      </template>

      <!-- ── 收藏 ── -->
      <template v-else-if="tab === 'keepsake'">
        <template v-if="keepsakes.length">
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
      </template>

      <!-- ── 寫給未來（時間膠囊）── -->
      <template v-else>
        <div v-if="!capForm" class="mem-gen-btn" @click="openCapForm">＋ 寫一封給未來的信</div>

        <!-- 埋膠囊表單 -->
        <div v-if="capForm" class="cap-form">
          <div class="cap-form-title">⏳ 寫給未來的信</div>
          <textarea class="cap-textarea" v-model="capText" rows="5" maxlength="2000"
            placeholder="對未來那天的自己（和他）說點什麼吧——現在的心情、想實現的事、一個約定…"></textarea>
          <div class="cap-form-label">什麼時候拆開？</div>
          <div class="cap-presets">
            <div v-for="p in OPEN_PRESETS" :key="p.key" class="cap-preset" :class="{ active: capPreset === p.key }" @click="capPreset = p.key">{{ p.label }}</div>
            <div class="cap-preset" :class="{ active: capPreset === 'custom' }" @click="capPreset = 'custom'">自訂</div>
          </div>
          <input v-if="capPreset === 'custom'" type="date" class="cap-date-input" v-model="capCustomDate" :min="minOpenDate">
          <label class="cap-ai-row">
            <input type="checkbox" v-model="capWithAI">
            <span>他也寫一封（現在就寫好封存，到期一起拆）</span>
          </label>
          <div class="cap-form-actions">
            <div class="cap-btn ghost" @click="capForm = false">取消</div>
            <div class="cap-btn" :class="{ busy: burying }" @click="doBury">{{ burying ? (capWithAI ? '他正在寫他的信…' : '封存中…') : '封存' }}</div>
          </div>
        </div>

        <template v-if="capsules.length">
          <div v-for="cap in capsules" :key="cap.id" class="cap-card" :class="{ due: isDue(cap) && !cap.opened, opened: cap.opened }">
            <div class="cap-card-hd">
              <span class="cap-card-state">
                <template v-if="cap.opened">💌 已拆開</template>
                <template v-else-if="isDue(cap)">🎁 可以拆開了</template>
                <template v-else>🔒 封存中</template>
              </span>
              <span class="cap-card-date">{{ fmtDate(cap.buriedAt) }} 埋下 → {{ fmtDate(cap.openAt) }} 開啟</span>
              <div class="ks-card-del" :class="{ confirming: confirmingId === cap.id }" @click.stop="onDeleteCap(cap)">
                <template v-if="confirmingId === cap.id">確認刪除</template>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              </div>
            </div>

            <!-- 未到期：不顯示內容，只給等待感 -->
            <div v-if="!cap.opened && !isDue(cap)" class="cap-sealed">
              還有 {{ daysLeft(cap) }} 天拆開{{ cap.aiLetter ? '，裡面有兩封信' : '' }}
            </div>

            <!-- 到期未拆：拆封按鈕 -->
            <div v-else-if="!cap.opened" class="cap-open-btn" @click="doOpen(cap)">拆開膠囊</div>

            <!-- 已拆：兩封信並排展示 -->
            <template v-else>
              <div class="cap-letter mine">
                <div class="cap-letter-from">我（{{ fmtDate(cap.buriedAt) }}）</div>
                {{ cap.mine }}
              </div>
              <div v-if="cap.aiLetter" class="cap-letter">
                <div class="cap-letter-from">{{ cap.charName || charName }}（同一天偷偷寫的）</div>
                {{ cap.aiLetter }}
              </div>
            </template>
          </div>
        </template>

        <div v-else-if="!capForm" class="mem-empty">
          <div class="mem-empty-ic">⏳</div>
          <div>還沒有時間膠囊</div>
          <div class="mem-empty-sub">寫一段話封存給未來的你們，<br>到期那天他會記得提醒你來拆</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { dbGet, getSetting } from '../services/db.js';
import { listKeepsakes, removeKeepsake } from '../services/keepsakes.js';
import { listReviews, generateMonthlyReview, monthKey, prevMonthKey, monthTitle, REVIEW_MSG_THRESHOLD } from '../services/reviewEngine.js';
import { listCapsules, buryCapsule, openCapsule, removeCapsule, OPEN_PRESETS, MIN_OPEN_DELAY_MS } from '../services/capsules.js';
import { generateCapsuleLetter } from '../services/chatEngine.js';
import { renderMonthCard, shareCardImage } from '../services/shareCard.js';
import { localDateKey } from '../services/date.js';

const route = useRoute();
const charId = route.params.id;

const tab = ref(['review', 'keepsake', 'capsule'].includes(route.query.tab) ? route.query.tab : 'review');
const loaded = ref(false);
const charName = ref('');

// 收藏（D2）
const keepsakes = ref([]);
const confirmingId = ref(null); // 刪除兩段式（收藏與膠囊共用）：第一下變「確認刪除」，再點才刪

// 歷月回顧（D1）
const reviews = ref([]);
const generating = ref('');
const currentYm = monthKey();
const prevYm = prevMonthKey();
const hasCurrentReview = computed(() => reviews.value.some(r => r.ym === currentYm));
const hasPrevReview = computed(() => reviews.value.some(r => r.ym === prevYm));

// 時間膠囊（D3）
const capsules = ref([]);
const capForm = ref(false);
const capText = ref('');
const capPreset = ref('3m');
const capCustomDate = ref('');
const capWithAI = ref(true); // 「他也寫一封」預設勾選
const burying = ref(false);
const minOpenDate = localDateKey(new Date(Date.now() + MIN_OPEN_DELAY_MS));

onMounted(async () => {
  const c = await dbGet('characters', charId);
  charName.value = c?.name || '';
  [keepsakes.value, reviews.value, capsules.value] = await Promise.all([
    listKeepsakes(charId), listReviews(charId), listCapsules(charId),
  ]);
  loaded.value = true;
  document.addEventListener('click', resetConfirm);
});

function resetConfirm() { confirmingId.value = null; }

function fmtDate(ts) {
  return ts ? localDateKey(new Date(ts)) : '';
}

// ── 收藏 ──
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

// ── 歷月回顧 ──
async function genReview(ym) {
  if (generating.value) return;
  const key = await getSetting('api_key');
  if (!key) { window.toast_('請先在設定中填入 API 金鑰'); return; }
  generating.value = ym;
  try {
    const r = await generateMonthlyReview(charId, ym);
    if (r.status === 'skipped') {
      window.toast_(`${monthTitle(ym)}的訊息還不到 ${REVIEW_MSG_THRESHOLD} 則（目前 ${r.msgCount} 則），先多聊聊吧`);
    } else {
      reviews.value = await listReviews(charId);
      window.toast_('回顧寫好了 📖');
    }
  } catch (e) {
    window.toast_('生成失敗：' + e.message);
  } finally {
    generating.value = '';
  }
}

async function shareReview(r) {
  try {
    const [, m] = r.ym.split('-').map(Number);
    const canvas = renderMonthCard({
      title: `我們的 ${m} 月`,
      charName: `${r.charName}・${monthTitle(r.ym)}`,
      stats: r.stats,
      letter: r.letter,
      quote: r.quotes && r.quotes[0] ? r.quotes[0].content : '',
    });
    const result = await shareCardImage(canvas, `auris-${r.ym}.png`);
    if (result === 'downloaded') window.toast_('已下載月報卡');
  } catch (e) {
    window.toast_('存圖失敗：' + e.message);
  }
}

// ── 時間膠囊 ──
function openCapForm() {
  capForm.value = true;
  capText.value = '';
  capPreset.value = '3m';
  capCustomDate.value = '';
  capWithAI.value = true;
}

function capOpenAt() {
  if (capPreset.value === 'custom') {
    if (!capCustomDate.value) return 0;
    return new Date(capCustomDate.value + 'T00:00:00').getTime();
  }
  const p = OPEN_PRESETS.find(x => x.key === capPreset.value);
  const d = new Date();
  d.setMonth(d.getMonth() + (p?.months || 3));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isDue(cap) { return cap.openAt && cap.openAt <= Date.now(); }
function daysLeft(cap) { return Math.max(1, Math.ceil((cap.openAt - Date.now()) / 86400000)); }

async function doBury() {
  if (burying.value) return;
  const text = capText.value.trim();
  if (!text) { window.toast_('先寫點什麼吧'); return; }
  const openAt = capOpenAt();
  if (!openAt) { window.toast_('請選擇開啟日'); return; }
  if (openAt - Date.now() < MIN_OPEN_DELAY_MS) { window.toast_('開啟日至少要 30 天後'); return; }

  burying.value = true;
  try {
    let aiLetter = '';
    if (capWithAI.value) {
      const key = await getSetting('api_key');
      if (!key) { window.toast_('請先在設定中填入 API 金鑰（或取消勾選「他也寫一封」）'); return; }
      aiLetter = (await generateCapsuleLetter(charId, openAt)) || '';
      if (!aiLetter) { window.toast_('他的信沒寫成，請稍後再試（或取消勾選只埋你的信）'); return; }
    }
    const item = await buryCapsule({ charId, charName: charName.value, text, openAt, aiLetter });
    if (!item) { window.toast_('封存失敗，請再試一次'); return; }
    capsules.value = await listCapsules(charId);
    capForm.value = false;
    window.toast_(aiLetter ? '兩封信都封存好了，到期那天一起拆 ⏳' : '封存好了，到期那天他會提醒你 ⏳');
  } finally {
    burying.value = false;
  }
}

async function doOpen(cap) {
  const opened = await openCapsule(cap.id);
  if (!opened) { window.toast_('還沒到開啟日'); return; }
  capsules.value = await listCapsules(charId);
  window.toast_('拆開了！今天跟他聊天時，他會記得這件事 💌');
}

async function onDeleteCap(cap) {
  if (confirmingId.value !== cap.id) {
    confirmingId.value = cap.id;
    return;
  }
  await removeCapsule(cap.id);
  capsules.value = capsules.value.filter(x => x.id !== cap.id);
  confirmingId.value = null;
  window.toast_('已刪除膠囊');
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

/* 生成／新增入口按鈕 */
.mem-gen-btn {
  border: 1px dashed var(--border-2);
  border-radius: 14px;
  padding: 13px;
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  color: var(--rose);
  cursor: pointer;
  margin-bottom: 12px;
}
.mem-gen-btn:active { opacity: .6; }
.mem-gen-btn.busy { opacity: .55; pointer-events: none; }
.mem-gen-btn.sub { border-style: solid; border-color: var(--border); color: var(--text-3); font-size: 12px; padding: 10px; }

/* ── 月報卡 ── */
.rev-card {
  background: var(--card);
  border: .5px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 14px;
}
.rev-hd { display: flex; align-items: center; margin-bottom: 12px; }
.rev-title { flex: 1; font-size: 16px; font-weight: 500; color: var(--text); }
.rev-share {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 300; color: var(--text-3); cursor: pointer;
}
.rev-share svg { width: 14px; height: 14px; }
.rev-share:active { opacity: .6; }
.rev-stats { display: flex; gap: 8px; margin-bottom: 12px; }
.rev-stat {
  flex: 1;
  background: var(--surface);
  border: .5px solid var(--border);
  border-radius: 12px;
  padding: 10px 4px;
  text-align: center;
}
.rev-stat-v { font-size: 17px; font-weight: 600; color: var(--rose); line-height: 1.3; }
.rev-stat-l { font-size: 10px; font-weight: 300; color: var(--text-3); margin-top: 2px; }
.rev-milestones {
  font-size: 12px; font-weight: 300; color: var(--text-2);
  line-height: 1.8; margin-bottom: 10px; padding: 0 2px;
}
.rev-letter {
  background: var(--surface);
  border: .5px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  font-size: 14px;
  font-weight: 300;
  color: var(--text);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}
.rev-letter-from { font-size: 11px; font-weight: 500; color: var(--rose); margin-bottom: 8px; }
.rev-quotes { margin-top: 12px; }
.rev-quotes-hd { font-size: 11px; font-weight: 400; color: var(--text-3); margin-bottom: 6px; }
.rev-quote {
  font-size: 13px; font-weight: 300; color: var(--text-2);
  line-height: 1.7; margin-bottom: 4px; word-break: break-word;
}

/* ── 收藏卡（沿用 P106）── */
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

/* ── 時間膠囊 ── */
.cap-form {
  background: var(--card);
  border: .5px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 14px;
}
.cap-form-title { font-size: 14px; font-weight: 500; color: var(--text); margin-bottom: 12px; text-align: center; }
.cap-textarea {
  width: 100%;
  background: var(--surface);
  border: .5px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  font-weight: 300;
  color: var(--text);
  line-height: 1.7;
  resize: none;
  outline: none;
}
.cap-form-label { font-size: 12px; font-weight: 400; color: var(--text-2); margin: 12px 0 8px; }
.cap-presets { display: flex; gap: 8px; flex-wrap: wrap; }
.cap-preset {
  padding: 7px 14px;
  border-radius: 999px;
  border: .5px solid var(--border-2);
  font-size: 12px;
  font-weight: 300;
  color: var(--text-2);
  cursor: pointer;
}
.cap-preset.active { border-color: var(--rose); color: var(--rose); font-weight: 400; }
.cap-date-input {
  margin-top: 10px;
  width: 100%;
  background: var(--surface);
  border: .5px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text);
  outline: none;
}
.cap-ai-row {
  display: flex; align-items: center; gap: 8px;
  margin-top: 14px;
  font-size: 12px; font-weight: 300; color: var(--text-2);
  cursor: pointer;
}
.cap-ai-row input { accent-color: var(--rose); }
.cap-form-actions { display: flex; gap: 10px; margin-top: 16px; }
.cap-btn {
  flex: 1;
  background: var(--rose);
  color: #fff;
  border-radius: 12px;
  padding: 11px;
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
}
.cap-btn:active { opacity: .7; }
.cap-btn.busy { opacity: .55; pointer-events: none; }
.cap-btn.ghost { background: transparent; border: .5px solid var(--border-2); color: var(--text-2); }

.cap-card {
  background: var(--card);
  border: .5px solid var(--border);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 12px;
}
.cap-card.due { border-color: var(--rose); }
.cap-card-hd { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.cap-card-state { font-size: 12px; font-weight: 500; color: var(--text-2); }
.cap-card.due .cap-card-state { color: var(--rose); }
.cap-card-date { font-size: 10px; font-weight: 300; color: var(--text-3); flex: 1; }
.cap-sealed { font-size: 13px; font-weight: 300; color: var(--text-3); text-align: center; padding: 8px 0 4px; }
.cap-open-btn {
  background: var(--rose);
  color: #fff;
  border-radius: 12px;
  padding: 11px;
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  margin-top: 2px;
}
.cap-open-btn:active { opacity: .7; }
.cap-letter {
  background: var(--surface);
  border: .5px solid var(--border);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 300;
  color: var(--text);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  margin-top: 10px;
}
.cap-letter-from { font-size: 11px; font-weight: 500; color: var(--rose); margin-bottom: 6px; }
.cap-letter.mine .cap-letter-from { color: var(--text-2); }

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
