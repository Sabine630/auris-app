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
  age: '',
  job: '',
  persona: '',
  note: '',
  cycleEnabled: false,
  lastPeriodStart: '',
  cycleLength: 28,
  periodLength: 5
});

const phaseLabel = computed(() => cyclePhaseLabel(getCyclePhase(me.value)));

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
