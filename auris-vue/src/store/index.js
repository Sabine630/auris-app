import { reactive } from 'vue';
import { initDB, dbAll, getSetting } from '../services/db.js';

export const globalStore = reactive({
  theme: 'cream',
  characters: [],
  settings: {},
  chatListData: [],
  keyboardOffset: 0,
  chatFormatStyle: false,

  async init() {
    await initDB();
    this.theme = await getSetting('theme') || 'cream';
    this.chatFormatStyle = !!(await getSetting('chat_format_style'));
    this.characters = await dbAll('characters');
    
    // Setup generic tracking of visual viewport for keyboard avoidance
    if (window.visualViewport) {
      const root = document.documentElement;
      const updateKB = () => {
        const vv = window.visualViewport;
        const layoutH = window.innerHeight;
        this.keyboardOffset = Math.max(0, layoutH - vv.height - vv.offsetTop);
        // iOS PWA：鍵盤升起時 iOS 會平移可視區（offsetTop>0），keyboardOffset 會被算成 ~0。
        // 直接把 app 框（.phone）釘在 visualViewport 上：用實量高度設高、用 offsetTop 平移，
        // 框永遠覆蓋可見區、底部輸入框貼齊鍵盤上緣，露出帶（透到系統）消失。手機版 CSS 才消費這兩個變數。
        root.style.setProperty('--vvh', vv.height + 'px');
        root.style.setProperty('--vvtop', vv.offsetTop + 'px');
      };
      window.visualViewport.addEventListener('resize', updateKB);
      window.visualViewport.addEventListener('scroll', updateKB);
      updateKB();
    }
  },

  async loadCharacters() {
    this.characters = await dbAll('characters');
  }
});
