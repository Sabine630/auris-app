import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: process.env.VERCEL ? '/' : '/auris-app/',
  // Build 時間戳（P132）：修 bug 期間常連推好幾個 [skip-ver] commit，版號都停在同一個
  // P 號，實機回報時分不出手機上到底是哪一版、更分不出「修好了」還是「還沒拿到新版」。
  // 診斷匯出帶上這個就能直接比對。
  // 角色語音旗標（P133）：必須走 define 而非 import.meta.env——實測以模組匯出的
  // const 包裝時，Rollup 不會跨模組常數摺疊，VoiceSettingsView 與 tts 的 chunk 照樣
  // 產生（正式版 bundle 仍含語音程式碼）。define 會在每個使用點直接替換成字面
  // true/false，死分支連同其 dynamic import 才會被整段移除。
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
    __VOICE_ENABLED__: JSON.stringify(process.env.VITE_VOICE_ENABLED !== '0'),
  },
})
// trigger re-deploy
