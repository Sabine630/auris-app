<template>
  <div class="ann-overlay" @click.self="close">
    <div class="ann-box">
      <button class="ann-close" @click="close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="ann-badge">P132 更新公告</div>

      <div class="ann-pages">
        <transition name="ann-slide" mode="out-in">
          <div class="ann-page" :key="page">

            <!-- 第一頁：新功能 -->
            <template v-if="page === 0">
              <div class="ann-title">新功能</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">待續的事 📌</div>
                  <div class="ann-item-desc">你提到的未來事、約定、還沒回答的問題（「我下週三要面試」「說好禮拜六一起看電影」），他會記下來，在該關心的時候主動問結果——不用你再提一次。聊天室的記憶抽屜多了「待續的事」分頁，可以查看、修改、標記完成或回到來源訊息；不想讓某個角色記，在角色設定關掉就好。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">睡前模式 🌙</div>
                  <div class="ann-item-desc">聊天室選單一鍵進入。畫面轉為低刺激的暖色濾光，他會改用低聲短句陪你，不開刺激話題，也可以講平靜的睡前故事。你道晚安他會溫柔收尾；久沒回應（大概睡著了）他會自己輕聲道晚安。隔天再聊，他記得昨晚。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">關係里程碑 🎉</div>
                  <div class="ann-item-desc">在一起 100、200、300、520、1000 天，關係頁會提前倒數，當天他也會自然提起、陪你一起紀念。</div>
                </div>
              </div>
            </template>

            <!-- 第二頁：修復與改善 -->
            <template v-else-if="page === 1">
              <div class="ann-title">修復與改善</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">背景功能其實一直沒在跑 🔧</div>
                  <div class="ann-item-desc">使用 Anthropic 時，記憶總結、日記、貼文、「我想你」、每日一問可能長期都是空轉的——不會報錯，只是靜靜地什麼都沒做。現在已修復。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">不再冒出簡體字 🇹🇼</div>
                  <div class="ann-item-desc">角色回覆統一轉成台灣繁體用語（角色設定為其他語言的除外）。轉換用完立刻釋放，不額外消耗 token，也不佔記憶體。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">回覆混入英文思考內容 💭</div>
                  <div class="ann-item-desc">部分模型會把內部推理當成回覆的一部分吐出來，現在會在顯示前剝除，串流時也不會先閃一下。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">iPhone 打字看不到輸入框 ⌨️</div>
                  <div class="ann-item-desc">鍵盤上方那條工具列會蓋住輸入框的問題已修復，聊天室與設定頁都適用。角色也不會再把日期的星期幾算錯。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">安全性更新 🔒</div>
                  <div class="ann-item-desc">修補已知的相依套件弱點，並修正貼文標籤解析的效能風險。</div>
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
                <div class="ann-guide-text">設定頁最底部顯示 <strong>P132</strong> 即為最新版</div>
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
const PAGE_COUNT = 3;
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
