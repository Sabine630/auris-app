<template>
  <div class="page active" id="pg-diary-detail">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">日記</div>
      <div></div>
    </div>
    <div v-if="diary" id="diary-detail-content">
      <div class="diary-detail-header">
        <div class="diary-detail-av-row">
          <div class="diary-detail-av">
            <img v-if="avatar && avatar.startsWith('data:')" :src="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
            <span v-else>{{ avatar || '🌸' }}</span>
          </div>
          <div>
            <div class="diary-detail-name">{{ charName }}</div>
            <div class="diary-detail-date">{{ fmtDate(diary.date) }}</div>
          </div>
          <span style="margin-left:auto;font-size:22px">{{ diary.mood || '📔' }}</span>
        </div>
        <div class="diary-detail-title">{{ title }}</div>
      </div>
      <div class="diary-detail-body" v-html="bodyHtml"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet } from '../services/db.js';
import { formatContent } from '../services/format.js';

const route = useRoute();
const router = useRouter();
const diaryId = route.params.id;

const diary = ref(null);
const charName = ref('');
const avatar = ref('');

onMounted(async () => {
  const d = await dbGet('diary', diaryId);
  if (!d) { router.push('/diary'); return; }
  diary.value = d;
  const c = await dbGet('characters', d.charId);
  if (c) { charName.value = c.name; avatar.value = c.avatar; }
});

const title = computed(() => {
  if (!diary.value) return '';
  const lines = diary.value.content.split('\n').filter(l => l.trim());
  return (lines[0] || '日記').replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/, '');
});

const bodyHtml = computed(() => {
  if (!diary.value) return '';
  const lines = diary.value.content.split('\n').filter(l => l.trim());
  const body = lines.slice(1).join('\n').trim();
  return formatContent(body);
});

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const dt = new Date(+y, +m - 1, +d);
  return `${y} 年 ${+m} 月 ${+d} 日　星期${weekdays[dt.getDay()]}`;
}
</script>
