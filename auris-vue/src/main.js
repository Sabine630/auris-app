import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'
import router from './router'
import { initDB } from './services/db.js'
import { isDemo } from './services/demoMode.js'
import { seedDemoIfEmpty } from './services/demoData.js'
import { installGlobalErrorLog, logError } from './services/diag.js'

// 診斷（P105 M3）：越早掛越好——連 initDB 失敗都要留下紀錄。
installGlobalErrorLog();

initDB().then(async () => {
  // Demo/教學模式：在掛載前把示範資料灌進隔離的 auris-demo DB（若尚未有資料）。
  // 這樣 App.vue 讀到角色 + onboarding_done 就會直接進首頁、略過引導與公告。
  if (isDemo()) {
    await seedDemoIfEmpty();
  }

  const app = createApp(App)

  app.config.globalProperties.$toast = (msg, ms) => {
    if (window.toast_) window.toast_(msg, ms);
    else alert(msg); // fallback
  };

  app.use(router)
  app.mount('#app')

  // Demo 模式再疊一層「教學面板」：獨立掛在另一個節點，共用同一個 router 讀當前路由，
  // 完全不改 App.vue。正常網址不會走到這裡。
  if (isDemo()) {
    const { default: DemoTeachingPanel } = await import('./components/DemoTeachingPanel.vue');
    const host = document.createElement('div');
    host.id = 'demo-teaching-root';
    document.body.appendChild(host);
    const panel = createApp(DemoTeachingPanel);
    panel.use(router);
    panel.mount(host);
  }
}).catch(err => {
  console.error('IndexedDB 初始化失敗：', err);
  logError('init', err, { code: 'indexeddb_init_failed', policy: 'trusted-local' });
  document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif">資料庫初始化失敗，請嘗試重新整理。</div>';
})
