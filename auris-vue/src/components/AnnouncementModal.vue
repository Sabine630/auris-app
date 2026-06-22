<template>
  <div class="ann-overlay" @click.self="close">
    <div class="ann-box">
      <button class="ann-close" @click="close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="ann-badge">P86–P87 更新公告</div>

      <div class="ann-pages">
        <transition name="ann-slide" mode="out-in">
          <div class="ann-page" :key="page">

            <!-- 第一頁：近期新功能 -->
            <template v-if="page === 0">
              <div class="ann-title">近期新功能</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">輸入框 Enter 改為換行 ⏎</div>
                  <div class="ann-item-desc">聊天、群組、貼文留言的輸入框，按 Enter 不再直接送出、改成換行；要送出請點輸入框右側的送出鍵。電腦版可用 Ctrl／Cmd + Enter 快速送出。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">角色會主動傳訊息給你 💌</div>
                  <div class="ann-item-desc">開啟後，角色會在一天的不同時段自己捎來訊息，內容自然融入對話、不再像系統提醒。深夜勿擾時段不打擾，也可隨時暫停。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">聊天回覆更像真人 💬</div>
                  <div class="ann-item-desc">AI 回覆會拆成多則短泡泡逐段冒出，長短隨角色個性變化，讀起來像真的在跟你連發訊息，時間也改在整組對話結束後才顯示。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">聊天全文搜尋 🔍</div>
                  <div class="ann-item-desc">在聊天室內搜尋關鍵字，直接跳到並高亮那則訊息，再也不用慢慢往上捲找那句話。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">共同願望清單・備忘錄 📝</div>
                  <div class="ann-item-desc">和角色一起記下「想一起做的事」與約定、計畫、待辦。每段關係各自一份，可勾選完成。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">通知一點直達訊息 🔔</div>
                  <div class="ann-item-desc">點擊主動訊息的通知，會直接跳到聊天室那一則並高亮顯示，不再只是開啟對話而已。</div>
                </div>
              </div>
            </template>

            <!-- 第二頁：使用方式 -->
            <template v-else-if="page === 1">
              <div class="ann-title">怎麼用</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">開啟主動訊息</div>
                  <div class="ann-item-desc">角色設定 → 進階設定，開啟「我想你」「每日一問」等開關；角色就會在不同時段主動傳訊息。需有一定對話記錄才會觸發。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">暫停某角色主動 / 勿擾時段</div>
                  <div class="ann-item-desc">角色設定的「暫停主動訊息（總開關）」可讓該角色完全不主動，但你傳訊時仍正常回覆。深夜 23:00–08:00 一律不打擾。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">搜尋聊天記錄</div>
                  <div class="ann-item-desc">進入聊天室，點右上角搜尋，輸入關鍵字即可跳到那則訊息。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">願望清單・備忘錄</div>
                  <div class="ann-item-desc">關係主頁的「我們的願望清單・備忘錄」卡片，或聊天室 ⋯ →「我們的願望・備忘」進入。輸入後按 Enter 新增，點一下可勾選完成。</div>
                </div>
              </div>
            </template>

            <!-- 第三頁：更新指引 -->
            <template v-else>
              <div class="ann-title">更新指引</div>

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
                <div class="ann-guide-text">設定頁最底部顯示 <strong>P87</strong> 即為最新版</div>
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
        <div class="ann-dot" :class="{ active: page === 0 }" @click="page = 0"></div>
        <div class="ann-dot" :class="{ active: page === 1 }" @click="page = 1"></div>
        <div class="ann-dot" :class="{ active: page === 2 }" @click="page = 2"></div>
      </div>

      <!-- 導航按鈕 -->
      <div class="ann-actions">
        <button v-if="page > 0" class="ann-btn ann-btn-prev" @click="page--">← 上一頁</button>
        <div v-else style="flex:1"></div>
        <button v-if="page < 2" class="ann-btn ann-btn-next" @click="page++">下一頁 →</button>
        <button v-else class="ann-btn ann-btn-done" @click="close">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['close']);
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
