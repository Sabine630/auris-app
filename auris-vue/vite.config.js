import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: process.env.VERCEL ? '/' : '/auris-app/',
  // Build 時間戳（P132）：修 bug 期間常連推好幾個 [skip-ver] commit，版號都停在同一個
  // P 號，實機回報時分不出手機上到底是哪一版、更分不出「修好了」還是「還沒拿到新版」。
  // 診斷匯出帶上這個就能直接比對。
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
})
// trigger re-deploy
