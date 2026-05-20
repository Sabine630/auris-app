import { createRouter, createWebHistory } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import ChatRoomView from '../views/ChatRoomView.vue';
import MomentsView from '../views/MomentsView.vue';
import DiaryView from '../views/DiaryView.vue';
import SettingsView from '../views/SettingsView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/chat/:id?',
      name: 'chat',
      component: ChatRoomView
    },
    {
      path: '/moments',
      name: 'moments',
      component: MomentsView
    },
    {
      path: '/diary',
      name: 'diary',
      component: DiaryView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ]
});

export default router;
