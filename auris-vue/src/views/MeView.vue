<template>
  <div class="page active" id="pg-me">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/settings')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">我的設定</div>
      <div class="ph-act" @click="saveMe">儲存</div>
    </div>
    <div style="padding-bottom:32px;overflow-y:auto;flex:1">
      <div class="av-hero">
        <div class="av-circle" :class="{'has-img': hasAvImg}" @click="showAvMenu = !showAvMenu">
          <img v-if="hasAvImg" :src="me.avatar">
          <span v-else>{{ me.avatar || '🙂' }}</span>
          <div class="av-edit"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
        </div>
        <div class="av-hint">點擊更換你的頭像</div>
      </div>

      <input type="file" ref="avFileInput" accept="image/*" style="display:none" @change="onAvFileChange">

      <div class="av-menu" :class="{ open: showAvMenu }">
        <div class="av-menu-item" @click="triggerAvUpload">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>從相簿上傳圖片
        </div>
        <div class="av-menu-item" @click="showAvMenu=false; showEmojiPicker=true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>選擇 Emoji
        </div>
        <div class="av-menu-item" v-if="hasAvImg" style="color:var(--red)" @click="removeAvImg">
          <svg viewBox="0 0 24 24" style="stroke:var(--red)"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>移除圖片
        </div>
      </div>

      <div class="emoji-picker" :class="{ open: showEmojiPicker }">
        <div v-for="e in EMOJIS" :key="e" class="emoji-opt" :class="{ sel: me.avatar === e }" @click="pickEmoji(e)">{{ e }}</div>
      </div>

      <div class="sec-label" style="margin-top:8px">你在故事世界裡的身份</div>
      <div class="form-group">
        <div class="form-row">
          <div class="form-label">你希望被叫什麼</div>
          <input class="form-input" v-model="me.name" type="text" placeholder="例：小晴、阿雨、或你的名字…">
          <div class="form-hint">角色會用這個稱呼你（除非角色設定有覆蓋）</div>
        </div>
        <div class="form-row">
          <div class="form-label">年齡</div>
          <input class="form-input" v-model="me.age" type="number" placeholder="例：22" min="1" max="120" style="width:80px">
        </div>
        <div class="form-row">
          <div class="form-label">職業 / 身份</div>
          <input class="form-input" v-model="me.job" type="text" placeholder="例：大學生、插畫師、咖啡師…">
        </div>
        <div class="form-row">
          <div class="form-label">個性簡述</div>
          <textarea class="form-input" v-model="me.persona" rows="3" placeholder="你是什麼樣的人？這會影響角色怎麼對待你。例：外表大方但內心容易緊張，喜歡被照顧卻不擅長開口要求…"></textarea>
        </div>
        <div class="form-row">
          <div class="form-label">其他備註</div>
          <textarea class="form-input" v-model="me.note" rows="2" placeholder="其他想讓所有角色知道的事…"></textarea>
        </div>
      </div>

      <div class="sec-label">作息 / 行程</div>
      <div class="form-group">
        <div class="form-row">
          <div class="form-label">上班 / 上課時間</div>
          <input class="form-input" type="text" v-model="me.workTime" placeholder="例：週一到五 09:00–18:00、輪班制…">
        </div>
        <div class="form-row">
          <div class="form-label">上班 / 上課地點</div>
          <input class="form-input" type="text" v-model="me.workPlace" placeholder="例：信義區的公司、學校…">
        </div>
        <div class="form-row">
          <div class="form-label">作息習慣</div>
          <textarea class="form-input" rows="2" v-model="me.restTime" placeholder="例：通常凌晨1點睡、早上8點起；週末會睡到中午…"></textarea>
          <div class="form-hint">填寫後，角色會依現在時間推測你在上班、通勤還是休息，主動訊息更有情境感，也更知道什麼時候該關心你</div>
        </div>
      </div>

      <div class="sec-label">生理期追蹤</div>
      <div class="form-group">
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-name">開啟週期追蹤</div>
            <div class="toggle-desc">資料只存在你的裝置本地、不會上傳。開啟後，再到個別角色的編輯頁打開「生理期關心」，該角色才會在經期前後體貼你、主動傳關心訊息。</div>
          </div>
          <div class="toggle" :class="{ on: me.cycleEnabled }" @click="me.cycleEnabled = !me.cycleEnabled"><div class="toggle-knob"></div></div>
        </div>

        <template v-if="me.cycleEnabled">
          <div class="form-row">
            <div class="form-label">最近一次經期開始日</div>
            <input class="form-input" v-model="me.lastPeriodStart" type="date" style="width:auto">
            <div class="form-hint">系統會用這天往後推算，預測之後的經期</div>
          </div>
          <div class="form-row">
            <div class="form-label">週期長度（天）</div>
            <input class="form-input" v-model="me.cycleLength" type="number" min="20" max="45" placeholder="28" style="width:80px">
            <div class="form-hint">兩次經期開始之間的天數，平均約 28 天</div>
          </div>
          <div class="form-row">
            <div class="form-label">經期天數</div>
            <input class="form-input" v-model="me.periodLength" type="number" min="2" max="10" placeholder="5" style="width:80px">
            <div class="form-hint">每次經期持續的天數，平均約 3～7 天</div>
          </div>
          <div v-if="phaseLabel" class="form-row">
            <div class="form-hint" style="margin-top:0">目前推算：<b style="color:var(--rose)">{{ phaseLabel }}</b></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getSetting, setSetting } from '../services/db.js';
import { getCyclePhase, cyclePhaseLabel } from '../services/cycle.js';

const router = useRouter();
const me = ref({
  name: '',
  avatar: '🙂',
  age: '',
  job: '',
  persona: '',
  note: '',
  workTime: '',
  workPlace: '',
  restTime: '',
  cycleEnabled: false,
  lastPeriodStart: '',
  cycleLength: 28,
  periodLength: 5
});

const EMOJIS = ['🙂','😊','😎','🥰','😴','🤓','🦊','🐰','🐱','🌸','🌙','⭐','🍀','🎀','🦋','💎','🌷','🍓','🎵','🌊','🌈','✨','🍵','📖'];
const showAvMenu = ref(false);
const showEmojiPicker = ref(false);
const avFileInput = ref(null);
const hasAvImg = computed(() => me.value.avatar && me.value.avatar.startsWith('data:'));

const phaseLabel = computed(() => cyclePhaseLabel(getCyclePhase(me.value)));

onMounted(async () => {
  const data = await getSetting('me_settings');
  if (data) {
    me.value = { ...me.value, ...data };
  }
});

function triggerAvUpload() {
  showAvMenu.value = false;
  avFileInput.value.click();
}

function removeAvImg() {
  me.value.avatar = '🙂';
  showAvMenu.value = false;
}

function pickEmoji(e) {
  me.value.avatar = e;
  showEmojiPicker.value = false;
}

function onAvFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 200;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const s = Math.min(img.width, img.height);
      const ox = (img.width - s) / 2, oy = (img.height - s) / 2;
      ctx.drawImage(img, ox, oy, s, s, 0, 0, size, size);
      me.value.avatar = canvas.toDataURL('image/jpeg', 0.8);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

async function saveMe() {
  await setSetting('me_settings', JSON.parse(JSON.stringify(me.value)));
  window.toast_('已儲存');
  router.push('/settings');
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
</style>
