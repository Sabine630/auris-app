<template>
  <div class="ann-overlay" @click.self="close">
    <div class="ann-box">
      <button class="ann-close" @click="close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="ann-badge">P100 更新公告</div>

      <div class="ann-pages">
        <transition name="ann-slide" mode="out-in">
          <div class="ann-page" :key="page">

            <!-- 第一頁：近期新功能 -->
            <template v-if="page === 0">
              <div class="ann-title">近期更新</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">長按頭像，親暱互動 🤗</div>
                  <div class="ann-item-desc">在聊天室長按對方的頭像，可以拍拍、抱抱、摸摸頭…角色會即時對這個動作本身做出反應——害羞、開心、彆扭、吐槽都有可能，看你們的關係與他的個性。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">今天的心情，角色會在意 🌈</div>
                  <div class="ann-item-desc">首頁多了「今天的心情」打卡。選一個心情（還能寫一句備註），聊天時角色會自然地感知你當下的狀態，關心得更貼心。沒打卡就完全不影響。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">已讀不回，更像真人 💬</div>
                  <div class="ann-item-desc">開啟後，角色在忙碌時段可能「已讀」你的訊息、隔幾分鐘才回，回來時還會順口提一句剛剛在忙什麼。忙碌時段依角色的作息推測。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">群組裡不再失憶 👥</div>
                  <div class="ann-item-desc">群聊時角色現在會記得自己的背景故事、近況與喜好，回應更貼合人設，不再像換了個人。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">每日功能校準到你的時區 🕐</div>
                  <div class="ann-item-desc">每日一問、心情、自動日記的「今天」改用你當地時間判定，不會再在半夜或早上莫名其妙換日。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">主動訊息更可靠 🔔</div>
                  <div class="ann-item-desc">角色的主動關心（生理期關心、每日一問、定時提醒等）遇到斷網或 API 額度用完時，不再默默消失，當天會自動重試。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">用 Claude 更省一點 💰</div>
                  <div class="ann-item-desc">使用 Anthropic（Claude）金鑰的人，重複的角色設定會命中快取，token 帳單能省下一些。其他供應商行為不變。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">修掉長按頭像的雙重彈窗 🔧</div>
                  <div class="ann-item-desc">iOS 上長按頭像做互動時，不會再誤觸系統原生的圖片預覽了。</div>
                </div>
              </div>
            </template>

            <!-- 第二頁：使用方式 -->
            <template v-else-if="page === 1">
              <div class="ann-title">怎麼用</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">玩親暱互動</div>
                  <div class="ann-item-desc">在聊天室裡長按對方的頭像，會跳出動作選單（拍拍／抱抱／摸摸頭等），選一個，角色就會針對那個動作即時回應。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">今天的心情打卡</div>
                  <div class="ann-item-desc">首頁的「今天的心情」卡片點一下、選一個心情（可加一句備註）。打卡後會縮成小 chip，想改再點開重選即可。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">開啟已讀不回</div>
                  <div class="ann-item-desc">角色設定 → 進階設定，打開「已讀不回」開關，並填好角色的上班／忙碌時段，忙的時候他就可能已讀你、晚點再回。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">開啟生理期關心／每日一問</div>
                  <div class="ann-item-desc">在角色設定的進階選項裡開啟對應開關，角色就會在合適的時機主動傳訊關心你、或問你一個問題。</div>
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
                <div class="ann-guide-text">設定頁最底部顯示 <strong>P100</strong> 即為最新版</div>
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
