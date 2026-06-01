<template>
  <div class="ann-overlay" @click.self="close">
    <div class="ann-box">
      <button class="ann-close" @click="close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="ann-badge">P53 – P59 更新公告</div>

      <div class="ann-pages">
        <transition name="ann-slide" mode="out-in">
          <div class="ann-page" :key="page">

            <!-- 第一頁：新功能 -->
            <template v-if="page === 0">
              <div class="ann-title">新功能</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">生理期關心</div>
                  <div class="ann-item-desc">在「我」頁面設定月經週期，授權的角色會在生理期前後主動傳關心訊息，聊天時也會自然帶到體貼語氣。資料只存本機、不上傳。（角色設定 → 自動功能 → 生理期關心）</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">防誤刪角色</div>
                  <div class="ann-item-desc">聊天列表左划「刪除」已移除——不再因誤觸殺掉整個角色。刪除角色請走「設定 → 角色管理」。左划現在只有置頂與清空。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">清空對話可選範圍</div>
                  <div class="ann-item-desc">清空時會跳確認視窗，預設只清聊天訊息與記憶；若想連日記、夢境、貼文一起清，手動勾選即可。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">OpenRouter 服務商</div>
                  <div class="ann-item-desc">API 設定新增 OpenRouter，可直接使用多家模型，無需另設代理。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">Google Vertex AI</div>
                  <div class="ann-item-desc">API 設定支援 Vertex AI，使用 GCP 免費額度或帳單抵免。</div>
                </div>
              </div>
            </template>

            <!-- 第二頁：修復與強化 -->
            <template v-else-if="page === 1">
              <div class="ann-title">修復與強化</div>
              <div class="ann-items">
                <div class="ann-item">
                  <div class="ann-item-title">Anthropic API 直連修復</div>
                  <div class="ann-item-desc">修復瀏覽器直接呼叫 Anthropic API 被 CORS 擋住的問題，Anthropic 金鑰用戶無需再設代理。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">友善錯誤訊息</div>
                  <div class="ann-item-desc">API 錯誤（401/403/429/逾時/網路斷線）現在顯示中文說明，不再出現技術英文錯誤碼。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">貼文與夢境更貼近角色</div>
                  <div class="ann-item-desc">貼文與夢境生成時加入近期聊天脈絡，內容更符合你們實際的互動。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">資安強化</div>
                  <div class="ann-item-desc">匯出備份不再包含 API 金鑰；匯入前先驗證格式再清空舊資料，防止因損壞備份導致資料遺失。</div>
                </div>
                <div class="ann-item">
                  <div class="ann-item-title">群組聊天名字修正</div>
                  <div class="ann-item-desc">修復群組 system prompt 中你的名字永遠空白的問題。</div>
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
                <div class="ann-guide-text">設定頁最底部顯示 <strong>P59</strong> 即為最新版</div>
              </div>

              <div class="ann-guide-section">
                <div class="ann-guide-label">注意：左划刪除已移除</div>
                <div class="ann-guide-text">聊天列表左划不再有「刪除角色」按鈕。刪除請走 設定 → 角色管理。</div>
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
