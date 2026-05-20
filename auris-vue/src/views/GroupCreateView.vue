<template>
  <div class="page active" id="pg-group-create">
    <div class="ph">
      <div class="ph-back" @click="$router.push('/group-list')"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">建立群組</div>
      <div class="ph-act" @click="createGroup" style="color:var(--rose)">建立</div>
    </div>
    <div style="padding:16px">
      <div class="form-label">群組名稱</div>
      <input class="form-input" v-model="groupName" type="text" placeholder="例：下午茶時光" maxlength="20">
    </div>
    <div style="padding:0 16px 8px">
      <div class="form-label">選擇角色（至少 2 位）</div>
    </div>
    <div id="group-char-pick" style="padding:0 16px 32px">
      <div v-if="globalStore.characters.length < 2" style="font-size:12px;color:var(--text-3);font-weight:300">
        群組需要至少 2 位角色，請先去新增更多角色。
      </div>
      <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:12px">
        <div v-for="c in globalStore.characters" :key="c.id" 
             style="display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer"
             @click="toggleSelect(c.id)">
          <div style="width:50px;height:50px;border-radius:16px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:24px;border:2px solid transparent;transition:all .2s"
               :style="selectedMembers.includes(c.id) ? 'border-color:var(--rose);background:var(--rose-pale)' : ''">
            <img v-if="c.avatar && c.avatar.startsWith('data:')" :src="c.avatar" style="width:100%;height:100%;object-fit:cover;border-radius:14px">
            <span v-else>{{ c.avatar || '🌸' }}</span>
          </div>
          <div style="font-size:11px;color:var(--text);font-weight:400;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            {{ c.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../store/index.js';
import { dbPut } from '../services/db.js';

const router = useRouter();
const groupName = ref('');
const selectedMembers = ref([]);

onMounted(async () => {
  await globalStore.loadCharacters();
});

function toggleSelect(id) {
  const idx = selectedMembers.value.indexOf(id);
  if (idx > -1) selectedMembers.value.splice(idx, 1);
  else selectedMembers.value.push(id);
}

async function createGroup() {
  if (selectedMembers.value.length < 2) {
    alert('最少需要選擇 2 位角色');
    return;
  }
  const name = groupName.value.trim() || '未命名群組';
  const g = {
    id: 'grp_' + Date.now(),
    name: name,
    members: [...selectedMembers.value],
    createdAt: Date.now()
  };
  await dbPut('groups', g);
  router.push('/group-room/' + g.id);
}
</script>
