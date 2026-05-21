import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.config.globalProperties.$toast = (msg, ms) => {
  if (window.toast_) window.toast_(msg, ms);
  else alert(msg); // fallback
};

app.use(router)
app.mount('#app')
