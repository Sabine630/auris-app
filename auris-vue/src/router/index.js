import { createRouter, createWebHistory } from 'vue-router';

import HomeView from '../views/HomeView.vue';
import ChatRoomView from '../views/ChatRoomView.vue';
import MomentsView from '../views/MomentsView.vue';
import DiaryView from '../views/DiaryView.vue';
import SettingsView from '../views/SettingsView.vue';
import ApiView from '../views/ApiView.vue';
import LockView from '../views/LockView.vue';
import OnboardingView from '../views/OnboardingView.vue';
import CharManageView from '../views/CharManageView.vue';
import CharEditView from '../views/CharEditView.vue';
import ChatListView from '../views/ChatListView.vue';
import GroupListView from '../views/GroupListView.vue';
import GroupCreateView from '../views/GroupCreateView.vue';
import GroupRoomView from '../views/GroupRoomView.vue';
import PostDetailView from '../views/PostDetailView.vue';
import DiaryDetailView from '../views/DiaryDetailView.vue';
import DreamView from '../views/DreamView.vue';
import DreamDetailView from '../views/DreamDetailView.vue';
import BlackboxView from '../views/BlackboxView.vue';
import NotificationsView from '../views/NotificationsView.vue';
import MeView from '../views/MeView.vue';
import WorldsView from '../views/WorldsView.vue';
import WorldEditView from '../views/WorldEditView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/api', name: 'api', component: ApiView },
    { path: '/lock', name: 'lock', component: LockView },
    { path: '/onboarding', name: 'onboarding', component: OnboardingView },
    { path: '/chat-list', name: 'chat-list', component: ChatListView },
    { path: '/chat/:id?', name: 'chat', component: ChatRoomView },
    { path: '/moments', name: 'moments', component: MomentsView },
    { path: '/post/:id', name: 'post-detail', component: PostDetailView },
    { path: '/diary', name: 'diary', component: DiaryView },
    { path: '/diary/:id', name: 'diary-detail', component: DiaryDetailView },
    { path: '/dream', name: 'dream', component: DreamView },
    { path: '/dream/:id', name: 'dream-detail', component: DreamDetailView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/char-manage', name: 'char-manage', component: CharManageView },
    { path: '/char-edit/:id?', name: 'char-edit', component: CharEditView },
    { path: '/group-list', name: 'group-list', component: GroupListView },
    { path: '/group-create', name: 'group-create', component: GroupCreateView },
    { path: '/group-room/:id?', name: 'group-room', component: GroupRoomView },
    { path: '/blackbox', name: 'blackbox', component: BlackboxView },
    { path: '/notifications', name: 'notifications', component: NotificationsView },
    { path: '/me', name: 'me', component: MeView },
    { path: '/worlds', name: 'worlds', component: WorldsView },
    { path: '/worlds/edit/:id?', name: 'worlds-edit', component: WorldEditView }
  ]
});

export default router;
