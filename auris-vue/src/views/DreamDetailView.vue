<template>
  <div class="page active" id="pg-dream-detail">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">夢境</div>
      <div></div>
    </div>
    <div v-if="dream" id="dream-detail-content">
      <div class="dream-detail-wrap">
        <div class="dream-detail-av-row">
          <div class="dream-detail-av">
            <img v-if="avatar && avatar.startsWith('data:')" :src="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:10px">
            <span v-else>{{ avatar || '🌸' }}</span>
          </div>
          <div class="dream-detail-meta">
            <div class="dream-detail-name">{{ charName }}</div>
            <div class="dream-detail-time">{{ timeStr }}</div>
          </div>
        </div>
        <div class="dream-detail-text" v-html="bodyHtml"></div>
      </div>
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
const dreamId = route.params.id;

const dream = ref(null);
const charName = ref('');
const avatar = ref('');

onMounted(async () => {
  const d = await dbGet('dreams', dreamId);
  if (!d) { router.push('/dream'); return; }
  dream.value = d;
  const c = await dbGet('characters', d.charId);
  if (c) { charName.value = c.name; avatar.value = c.avatar; }
});

const timeStr = computed(() => {
  if (!dream.value) return '';
  const dt = new Date(dream.value.createdAt);
  return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}  ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
});

const bodyHtml = computed(() => {
  if (!dream.value) return '';
  return formatContent(dream.value.content);
});
</script>
