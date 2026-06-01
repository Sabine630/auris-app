import { reactive } from 'vue';
import { initDB, dbAll, getSetting } from '../services/db.js';

export const globalStore = reactive({
  theme: 'cream',
  characters: [],
  settings: {},
  chatListData: [],
  keyboardOffset: 0,

  async init() {
    await initDB();
    this.theme = await getSetting('theme') || 'cream';
    this.characters = await dbAll('characters');
    
    // Setup generic tracking of visual viewport for keyboard avoidance
    if (window.visualViewport) {
      const updateKB = () => {
        const layoutH = window.innerHeight;
        const visualH = window.visualViewport.height;
        this.keyboardOffset = Math.max(0, layoutH - visualH - window.visualViewport.offsetTop);
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
