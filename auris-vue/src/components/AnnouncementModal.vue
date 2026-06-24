<template>
  <div class="ann-overlay" @click.self="close">
    <div class="ann-box">
      <button class="ann-close" @click="close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="ann-badge">P88–P93 更新公告</div>

      <div class="ann-pages">
        <transition name="ann-slide" mode="out-in">
          <div class="ann-page" :key="page">

            <!-- 第一頁：近期新功能 -->
            <template v-if="page === 0">
              <div class="ann-title">近期新功能</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">貼文與留言可以管理了 🗂️</div>
                  <div class="ann-item-desc">貼文可以「編輯／重新生成／刪除」（卡片或詳情頁右上「⋯」）；每則留言長按可「複製／編輯／刪除」，角色的回覆還能「重新生成」。AI 講錯或不滿意都能就地修掉。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">角色回覆認得你本人 💬</div>
                  <div class="ann-item-desc">角色回覆你在貼文下的留言時，會認得「留言的人就是貼文裡稱呼的對象本人」，不再把你當成第三方陌生人（例如用「她」來指你）。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">角色更有時間感 🕐</div>
                  <div class="ann-item-desc">開啟「時間感」的角色，聊天與貼文提到的星期、時段、日期會對齊現在，不再把星期三講成星期四。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">範例對話，抓住角色的聲音 🎭</div>
                  <div class="ann-item-desc">角色設定可填幾組「你說／角色怎麼回」的範例對話，AI 會模仿那種語氣與用詞——這是讓角色「說話像本人」最有效的方式。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">貼文回覆更貼合人設 🌸</div>
                  <div class="ann-item-desc">角色回覆貼文留言時會帶入完整人設（背景／近況／喜好），不再說出與設定矛盾的話。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">主動訊息未讀即時亮燈 🔔</div>
                  <div class="ann-item-desc">角色主動傳訊息時，背景就會即時亮起未讀提示，回到 App 自動清除；群組逾時與失敗也會自動重試。</div>
                </div>
              </div>
            </template>

            <!-- 第二頁：使用方式 -->
            <template v-else-if="page === 1">
              <div class="ann-title">怎麼用</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">管理貼文</div>
                  <div class="ann-item-desc">在貼文卡片或貼文詳情頁右上角點「⋯」，即可選擇編輯（就地修改內容）、重新生成（讓角色重寫一篇）或刪除。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">管理留言／回覆</div>
                  <div class="ann-item-desc">在貼文詳情頁長按某一則留言，會跳出選單：複製、編輯、刪除；如果是角色的回覆，還會多一個「重新生成回覆」（只重生那一則，後面的留言會保留）。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">開啟角色的時間感</div>
                  <div class="ann-item-desc">角色設定 → 進階設定，打開「時間感」開關，角色就會依現在的日期、星期、時段來說話與發文。架空／古裝角色可保持關閉。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">填寫範例對話</div>
                  <div class="ann-item-desc">角色設定 →「說話方式」→ 範例對話，寫幾組「你說／角色怎麼回」，AI 會模仿這種語氣。不必照抄內容，留空會自動略過。</div>
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
                <div class="ann-guide-text">設定頁最底部顯示 <strong>P93</strong> 即為最新版</div>
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
