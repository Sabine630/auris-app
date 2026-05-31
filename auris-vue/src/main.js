import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'
import router from './router'
import { initDB } from './services/db.js'

initDB().then(() => {
  const app = createApp(App)

  app.config.globalProperties.$toast = (msg, ms) => {
    if (window.toast_) window.toast_(msg, ms);
    else alert(msg); // fallback
  };

  app.use(router)
  app.mount('#app')
}).catch(err => {
  console.error('IndexedDB 初始化失敗：', err);
  document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif">資料庫初始化失敗，請嘗試重新整理。</div>';
})
