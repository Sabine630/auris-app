<template>
  <div class="demo-overlay" :data-theme="globalStore.theme">
    <div class="demo-stage">
      <!-- 浮動教學鈕 -->
      <button v-if="!open" class="demo-fab" @click="open = true" aria-label="教學">
        <span class="demo-fab-q">?</span>
        <span class="demo-fab-txt">教學</span>
      </button>

      <!-- 底部教學面板 -->
      <div v-if="open" class="demo-backdrop" @click="open = false"></div>
      <transition name="demo-sheet">
        <div v-if="open" class="demo-sheet">
          <div class="demo-grip"></div>
          <div class="demo-badge">教學示範模式 · 虛構資料，可放心亂點</div>
          <div class="demo-title">{{ guide.title }}</div>
          <ul class="demo-body">
            <li v-for="(line, i) in guide.body" :key="i">{{ line }}</li>
          </ul>
          <div class="demo-actions">
            <button class="demo-btn ghost" @click="open = false">知道了</button>
            <button class="demo-btn exit" @click="leave">離開示範</button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { globalStore } from '../store/index.js';
import { exitDemo } from '../services/demoMode.js';
import { GUIDE, FALLBACK } from '../services/demoGuideContent.js';

const route = useRoute();
const open = ref(false);

const guide = computed(() => GUIDE[route.name] || FALLBACK);

function leave() {
  exitDemo();
}
</script>

<style scoped>
/* 覆蓋在 App 之上，但只在手機區域範圍內顯示，桌面預覽時對齊置中的手機框。 */
.demo-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 8000;
  font-family: var(--font, 'Outfit', sans-serif);
}
.demo-stage {
  position: relative;
  width: 390px;
  height: 844px;
  pointer-events: none;
}
@media (max-width: 500px) {
  .demo-stage { width: 100%; height: 100%; }
}

/* 浮動鈕：右下角，浮在底部導覽列之上 */
.demo-fab {
  position: absolute;
  right: 16px;
  bottom: 90px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px 9px 11px;
  border: none;
  border-radius: 22px;
  background: var(--rose, #c9887a);
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18), 0 1px 3px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  pointer-events: auto;
  transition: transform .15s, opacity .15s;
  -webkit-tap-highlight-color: transparent;
}
.demo-fab:active { transform: scale(.94); }
.demo-fab-q {
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  font-size: 12px; font-weight: 700;
}
.demo-fab-txt { font-size: 13px; font-weight: 500; letter-spacing: .04em; }
@media (max-width: 500px) {
  .demo-fab { bottom: calc(86px + env(safe-area-inset-bottom, 0px)); }
}

/* 半透明背景，點外面關閉；只暗手機區域 */
.demo-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.28);
  pointer-events: auto;
  border-radius: 40px;
}
@media (max-width: 500px) { .demo-backdrop { border-radius: 0; } }

/* 底部面板 */
.demo-sheet {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  pointer-events: auto;
  background: var(--surface, #fff);
  border-radius: 22px 22px 0 0;
  padding: 8px 20px calc(18px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.16);
  color: var(--text, #2a2420);
  max-height: 72%;
  overflow-y: auto;
}
.demo-grip {
  width: 38px; height: 4px; border-radius: 2px;
  background: var(--border-2, rgba(42, 36, 32, 0.15));
  margin: 6px auto 12px;
}
.demo-badge {
  display: inline-block;
  font-size: 10px; font-weight: 400; letter-spacing: .03em;
  color: var(--rose, #c9887a);
  background: var(--rose-light, rgba(201, 136, 122, 0.1));
  padding: 4px 10px; border-radius: 10px;
  margin-bottom: 12px;
}
.demo-title {
  font-size: 17px; font-weight: 600;
  color: var(--text, #2a2420);
  margin-bottom: 10px;
}
.demo-body { list-style: none; margin: 0; padding: 0; }
.demo-body li {
  position: relative;
  font-size: 13px; font-weight: 300; line-height: 1.7;
  color: var(--text-2, #5a4f4a);
  padding-left: 16px; margin-bottom: 8px;
}
.demo-body li::before {
  content: '';
  position: absolute; left: 2px; top: 9px;
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--rose, #c9887a);
}
.demo-actions {
  display: flex; gap: 10px;
  margin-top: 16px;
}
.demo-btn {
  flex: 1;
  padding: 11px; border-radius: 12px;
  font-size: 13px; font-weight: 500; font-family: inherit;
  cursor: pointer; border: .5px solid var(--border, rgba(42, 36, 32, 0.08));
  transition: opacity .15s;
}
.demo-btn:active { opacity: .7; }
.demo-btn.ghost { background: var(--surface2, #f2f0ed); color: var(--text, #2a2420); }
.demo-btn.exit { background: var(--rose, #c9887a); color: #fff; border-color: transparent; }

/* 面板滑入 */
.demo-sheet-enter-active, .demo-sheet-leave-active { transition: transform .26s cubic-bezier(.4, 0, .2, 1); }
.demo-sheet-enter-from, .demo-sheet-leave-to { transform: translateY(100%); }
</style>
