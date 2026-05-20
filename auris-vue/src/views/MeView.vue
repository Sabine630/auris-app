<template>
  <div class="page active" id="pg-me">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/settings')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">我的設定</div>
      <div class="ph-act" @click="saveMe">儲存</div>
    </div>
    <div style="padding-bottom:32px;overflow-y:auto;flex:1">
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getSetting, setSetting } from '../services/db.js';

const router = useRouter();
const me = ref({
  name: '',
  age: '',
  job: '',
  persona: '',
  note: ''
});

onMounted(async () => {
  const data = await getSetting('me_settings');
  if (data) {
    me.value = { ...me.value, ...data };
  }
});

async function saveMe() {
  await setSetting('me_settings', JSON.parse(JSON.stringify(me.value)));
  router.push('/settings');
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
</style>
