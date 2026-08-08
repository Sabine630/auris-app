<template>
  <div class="ann-overlay" @click.self="close">
    <div class="ann-box">
      <button class="ann-close" @click="close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="ann-badge">P136 更新公告</div>

      <div class="ann-pages">
        <transition name="ann-slide" mode="out-in">
          <div class="ann-page" :key="page">

            <!-- 第一頁：P135–P136。一個新功能、一個修復，兩者是同一個故事的兩半 -->
            <template v-if="page === 0">
              <div class="ann-title">新功能與修復</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">可以改他說過的話了 ✏️</div>
                  <div class="ann-item-desc">長按角色的訊息 →「編輯內容」，直接改掉那句話。<b>不限最新一則，往前的訊息也能改。</b>只換這則的文字，不會重新生成、也不影響其他訊息。<br>這不只是修錯字——他一旦講錯事情（例如把生日講成別天），那句話會留在對話裡被他當成「記得」的事，之後怎麼糾正都沒用。直接把那句改掉才是根治。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">他終於記得你們的日子了 🎂</div>
                  <div class="ann-item-desc">角色生日、你的生日、相識紀念日、在一起紀念日——過去他<b>只有在當天</b>才知道，其他日子被問到就自己編一個，而且越糾正越堅持。現在這些日期他隨時都記得。<br>他不會沒事拿出來講，只有你問起或當天到了才會提。<br><span style="opacity:.75">※ 生日只記月和日，年齡以角色設定為準，所以他答不出出生年份是正常的。※ 日期要先在角色設定／我的設定裡填好才有用。</span></div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">如果他還是講錯 🔁</div>
                  <div class="ann-item-desc">先前講錯的那幾則還留在對話裡，他可能還會跟著錯。用上面的「編輯內容」把那幾則改掉就好——這正是這次加這個功能的原因。</div>
                </div>
              </div>
            </template>

            <!-- 第二頁：更新指引 -->
            <template v-else>
              <div class="ann-title">更新指引</div>

              <!-- P134 本身沒有動 IndexedDB 結構，所以不能照抄 P132 那句「這一版更新後
                   無法退回舊版」——那會是假的。但資料庫結構是在 P132 升到 v8 的，且升版
                   單向：還停在 P131 以前的人這次會跨過那道升級，退回舊版仍會開不起來。
                   故改成有條件的警告，只對真正受影響的人成立。 -->
              <div class="ann-guide-section ann-guide-warn">
                <div class="ann-guide-label">⚠️ 若你上一版是 P131 或更早</div>
                <div class="ann-guide-text">這次會跨過 P132 的資料庫結構調整，更新完成後就<strong>無法退回舊版</strong>（App 會開不起來）。<strong>請務必先備份再更新。</strong>已經在 P132 之後的人不受影響，但備份仍然建議。</div>
              </div>

              <div class="ann-guide-section">
                <div class="ann-guide-label">更新前請先備份</div>
                <div class="ann-guide-text">設定 → 匯出資料 → 儲存 JSON 檔案到手機</div>
              </div>

              <div class="ann-guide-section">
                <div class="ann-guide-label">手機瀏覽器</div>
                <div class="ann-guide-steps">
                  <div class="ann-step">① 備份資料</div>
                  <div class="ann-step">② 關閉所有 Auris 分頁</div>
                  <div class="ann-step">③ 重新開啟網址</div>
                  <div class="ann-step">④ 若沒更新：長按重整 → 清除快取並重新載入</div>
                </div>
              </div>

              <div class="ann-guide-section">
                <div class="ann-guide-label">PWA（已加入主畫面）</div>
                <div class="ann-guide-steps">
                  <div class="ann-step">iOS：從切換器完全滑掉後重開；若未更新，用 Safari 重整一次再回 PWA</div>
                  <div class="ann-step">Android：完全關閉後重開；若未更新，清除 App 快取</div>
                </div>
              </div>

              <div class="ann-guide-section">
                <div class="ann-guide-label">確認版本</div>
                <div class="ann-guide-text">設定頁最底部顯示 <strong>P136</strong> 即為最新版</div>
              </div>

              <div class="ann-guide-section">
                <div class="ann-guide-label">資料不見了？</div>
                <div class="ann-guide-text">設定 → 匯入資料 → 選備份 JSON 即可還原</div>
              </div>
            </template>

          </div>
        </transition>
      </div>

      <!-- 分頁指示點 -->
      <div class="ann-dots">
        <div v-for="i in PAGE_COUNT" :key="i" class="ann-dot"
             :class="{ active: page === i - 1 }" @click="page = i - 1"></div>
      </div>

      <!-- 導航按鈕 -->
      <div class="ann-actions">
        <button v-if="page > 0" class="ann-btn ann-btn-prev" @click="page--">← 上一頁</button>
        <div v-else style="flex:1"></div>
        <button v-if="page < PAGE_COUNT - 1" class="ann-btn ann-btn-next" @click="page++">下一頁 →</button>
        <button v-else class="ann-btn ann-btn-done" @click="close">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['close']);
// 頁數集中在此：指示點與「下一頁／我知道了」都依它算，加頁時不會漏改其中一處。
// P136 為「新功能與修復」與「更新指引」兩頁。增減頁面時只改這個常數即可。
const PAGE_COUNT = 2;
const page = ref(0);

function close() {
  page.value = 0;
  emit('close');
}
</script>

<style scoped>
.ann-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn .2s ease;
  padding: 20px;
  box-sizing: border-box;
}

.ann-box {
  background: var(--surface);
  border-radius: 20px;
  width: 100%;
  max-width: 380px;
  padding: 24px 20px 20px;
  position: relative;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
  animation: scaleIn .25s cubic-bezier(.4, 0, .2, 1);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.ann-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.ann-close svg { width: 14px; height: 14px; stroke: var(--text-3); }

.ann-badge {
  display: inline-block;
  background: var(--rose);
  color: #fff;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: .08em;
  padding: 3px 10px;
  border-radius: 20px;
  margin-bottom: 16px;
  align-self: flex-start;
}

.ann-pages {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.ann-page {
  overflow-y: auto;
  max-height: calc(85vh - 160px);
  padding-right: 2px;
}

.ann-title {
  font-size: 17px;
  font-weight: 400;
  color: var(--text);
  margin-bottom: 14px;
}

.ann-items { display: flex; flex-direction: column; gap: 12px; }

.ann-item {
  padding: 12px 14px;
  background: var(--bg);
  border-radius: 12px;
  border: .5px solid var(--border);
}
.ann-item-title {
  font-size: 13px;
  font-weight: 400;
  color: var(--text);
  margin-bottom: 3px;
}
.ann-item-desc {
  font-size: 12px;
  font-weight: 300;
  color: var(--text-3);
  line-height: 1.5;
}

.ann-guide-section { margin-bottom: 12px; }
/* 單向升級警告：整塊框起來，不能只靠一個 emoji 讓人略過。 */
.ann-guide-warn {
  border: 1px solid var(--rose);
  border-radius: 10px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--rose) 8%, transparent);
}
.ann-guide-warn .ann-guide-label { font-weight: 500; letter-spacing: .02em; }
.ann-guide-label {
  font-size: 11px;
  font-weight: 400;
  color: var(--rose);
  letter-spacing: .06em;
  margin-bottom: 5px;
  text-transform: uppercase;
}
.ann-guide-text {
  font-size: 12px;
  font-weight: 300;
  color: var(--text-3);
  line-height: 1.55;
}
.ann-guide-text strong { font-weight: 400; color: var(--text); }
.ann-guide-steps { display: flex; flex-direction: column; gap: 4px; }
.ann-step {
  font-size: 12px;
  font-weight: 300;
  color: var(--text-3);
  line-height: 1.55;
}

.ann-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin: 14px 0 12px;
  flex-shrink: 0;
}
.ann-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border-2);
  cursor: pointer;
  transition: background .2s;
}
.ann-dot.active { background: var(--rose); }

.ann-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}
.ann-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-family: var(--font);
  font-size: 13px;
  font-weight: 300;
  cursor: pointer;
  transition: opacity .2s;
}
.ann-btn:active { opacity: .7; }
.ann-btn-prev {
  background: var(--bg);
  color: var(--text-3);
  border: .5px solid var(--border-2);
  flex: 1;
}
.ann-btn-next {
  background: var(--text);
  color: var(--bg);
  flex: 1;
}
.ann-btn-done {
  background: var(--rose);
  color: #fff;
  flex: 1;
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(.95); }
  to { opacity: 1; transform: scale(1); }
}

.ann-slide-enter-active,
.ann-slide-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}
.ann-slide-enter-from { opacity: 0; transform: translateX(12px); }
.ann-slide-leave-to { opacity: 0; transform: translateX(-12px); }
</style>
