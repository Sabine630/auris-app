<template>
  <div class="page active" id="pg-world-edit">
    <div class="ph">
      <div class="ph-back" @click="$router.back()"><svg viewBox="0 0 8 14"><path d="M7 1L1 7L7 13"/></svg>返回</div>
      <div class="ph-title">{{ isEdit ? '編輯詞條' : '新增詞條' }}</div>
      <div class="ph-act" @click="save">儲存</div>
    </div>

    <div class="we-body">
      <!-- 名稱 -->
      <div class="we-section">
        <div class="we-label">詞條名稱 <span class="we-req">*</span></div>
        <input class="we-input" v-model="form.name" placeholder="例：魔法學院、北極星王國" maxlength="40" />
        <div class="we-hint">AI 偵測到對話中出現這個名稱時，會自動參考此詞條</div>
      </div>

      <!-- 別名 -->
      <div class="we-section">
        <div class="we-label">別名 / 觸發關鍵字</div>
        <input class="we-input" v-model="aliasInput" placeholder="以逗號分隔，例：學院,霍格" />
        <div class="we-hint">其他可觸發此詞條的關鍵字（選填）</div>
      </div>

      <!-- 分類 -->
      <div class="we-section">
        <div class="we-label">分類</div>
        <div class="we-cat-row">
          <button v-for="cat in categories" :key="cat.value"
            class="we-cat-btn" :class="{ active: form.category === cat.value }"
            @click="form.category = cat.value">{{ cat.label }}</button>
        </div>
      </div>

      <!-- 內容 -->
      <div class="we-section">
        <div class="we-label">詞條內容 <span class="we-req">*</span></div>
        <textarea class="we-textarea" v-model="form.content" rows="6"
          placeholder="描述這個詞條的客觀設定，讓 AI 在對話中自然參考。&#10;例：魔法學院位於北方森林深處，創立於三百年前，收錄各類魔法師學習心法。校規嚴格，禁止在走廊施法，違者記過。" />
      </div>

      <!-- 適用角色 -->
      <div class="we-section">
        <div class="we-label">適用角色</div>
        <div class="we-scope-row">
          <button class="we-scope-btn" :class="{ active: form.charScope.length === 0 }" @click="form.charScope = []">全部角色</button>
          <button v-for="c in chars" :key="c.id"
            class="we-scope-btn" :class="{ active: form.charScope.includes(c.id) }"
            @click="toggleChar(c.id)">
            {{ c.avatar && !c.avatar.startsWith('data:') ? c.avatar : '' }} {{ c.name }}
          </button>
        </div>
        <div class="we-hint">限定哪些角色能看到這筆設定（預設全部）</div>
      </div>

      <!-- 啟用 -->
      <div class="we-section we-row">
        <div>
          <div class="we-label" style="margin-bottom:2px">啟用此詞條</div>
          <div class="we-hint" style="margin-top:0">關閉後 AI 不會參考此詞條</div>
        </div>
        <label class="wld-toggle">
          <input type="checkbox" v-model="form.enabled">
          <span class="wld-toggle-track"></span>
        </label>
      </div>

      <!-- Delete -->
      <div v-if="isEdit" style="margin-top:16px;padding:0 2px">
        <button class="we-del-btn" @click="confirmDelete">刪除此詞條</button>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <div class="menu-overlay" v-if="showDel" @click="showDel = false"></div>
    <div class="bottom-menu" :style="{ display: showDel ? 'block' : 'none' }">
      <div style="padding:20px 16px;text-align:center">
        <div style="font-size:15px;font-weight:500;margin-bottom:6px">確定刪除「{{ form.name }}」？</div>
        <div style="font-size:12px;color:var(--text-3)">此操作無法復原</div>
      </div>
      <div style="display:flex;gap:10px;padding:0 16px 20px">
        <button @click="showDel = false"
          style="flex:1;padding:12px;border-radius:12px;background:var(--surface);color:var(--text);border:.5px solid var(--border);font-size:14px;cursor:pointer">取消</button>
        <button @click="doDelete"
          style="flex:1;padding:12px;border-radius:12px;background:#e74c3c;color:#fff;border:none;font-size:14px;font-weight:500;cursor:pointer">確認刪除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { dbGet, dbPut, dbDel, dbAll } from '../services/db.js';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id);
const showDel = ref(false);
const chars = ref([]);

const categories = [
  { value: 'location', label: '地點' },
  { value: 'person',  label: '人物' },
  { value: 'rule',    label: '規則' },
  { value: 'item',    label: '物件' },
  { value: 'history', label: '歷史' },
];

const form = ref({
  name: '',
  content: '',
  category: 'location',
  aliases: [],
  charScope: [],
  enabled: true,
  createdAt: Date.now(),
});

const aliasInput = computed({
  get: () => form.value.aliases.join('，'),
  set: (v) => {
    form.value.aliases = v.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  }
});

onMounted(async () => {
  chars.value = await dbAll('characters');
  if (isEdit.value) {
    const entry = await dbGet('worlds', route.params.id);
    if (entry) form.value = { ...entry };
  }
});

function toggleChar(id) {
  const idx = form.value.charScope.indexOf(id);
  if (idx === -1) form.value.charScope.push(id);
  else form.value.charScope.splice(idx, 1);
}

async function save() {
  if (!form.value.name.trim()) { window.toast_('請填入詞條名稱'); return; }
  if (!form.value.content.trim()) { window.toast_('請填入詞條內容'); return; }
  const id = form.value.id || (isEdit.value ? route.params.id : 'world_' + Date.now());
  form.value.id = id;
  await dbPut('worlds', { ...form.value, id, name: form.value.name.trim(), content: form.value.content.trim() });
  window.toast_('已儲存');
  if (!isEdit.value) router.replace('/worlds/edit/' + id);
}

function confirmDelete() { showDel.value = true; }
async function doDelete() {
  await dbDel('worlds', route.params.id);
  window.toast_('已刪除');
  router.push('/worlds');
}
</script>

<style scoped>
.we-body { padding: 12px 16px 40px; }
.we-section { margin-bottom: 20px; }
.we-row { display: flex; align-items: center; justify-content: space-between; }
.we-label { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.we-req { color: var(--rose); }
.we-hint { font-size: 11px; color: var(--text-3); margin-top: 4px; line-height: 1.4; }
.we-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: .5px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
}
.we-input:focus { border-color: var(--rose); }
.we-textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: .5px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
  resize: vertical;
  line-height: 1.6;
}
.we-textarea:focus { border-color: var(--rose); }
.we-cat-row, .we-scope-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.we-cat-btn, .we-scope-btn {
  padding: 6px 12px;
  border-radius: 20px;
  border: .5px solid var(--border);
  background: var(--surface);
  color: var(--text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all .15s;
}
.we-cat-btn.active, .we-scope-btn.active {
  background: var(--rose);
  color: #fff;
  border-color: var(--rose);
  font-weight: 500;
}
.we-del-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: .5px solid #e74c3c;
  background: transparent;
  color: #e74c3c;
  font-size: 14px;
  cursor: pointer;
}

/* Toggle (duplicated from WorldsView for scoped) */
.wld-toggle { position: relative; cursor: pointer; }
.wld-toggle input { display: none; }
.wld-toggle-track {
  display: block;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--border);
  position: relative;
  transition: background .2s;
}
.wld-toggle-track::after {
  content: '';
  position: absolute;
  left: 3px; top: 3px;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
  transition: transform .2s;
}
.wld-toggle input:checked + .wld-toggle-track { background: var(--rose); }
.wld-toggle input:checked + .wld-toggle-track::after { transform: translateX(16px); }
</style>
