<template>
  <div id="onboarding" class="page active" style="z-index: 999; display: flex; flex-direction: column;">
    <div class="ob-steps">
      <!-- Step 0：歡迎 -->
      <div class="ob-step" :class="{ active: obStep === 0 }" id="ob-0">
        <div class="ob-ic"><span class="ob-ic-emoji">✦</span></div>
        <div class="ob-title">歡迎來到 Auris</div>
        <div class="ob-sub">這裡是你與角色共同生活的世界。<br>只需要 3 步驟，就能開始你們的故事。</div>
        <div style="margin-top:28px;display:flex;flex-direction:column;gap:12px;width:100%;max-width:320px">
          <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);border-radius:12px;border:.5px solid var(--border)">
            <span style="font-size:18px">🔑</span>
            <div><div style="font-size:12px;font-weight:400;color:var(--text);margin-bottom:2px">設定 API 金鑰</div><div style="font-size:11px;font-weight:300;color:var(--text-3)">連接 AI 讓角色活起來</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);border-radius:12px;border:.5px solid var(--border)">
            <span style="font-size:18px">🌸</span>
            <div><div style="font-size:12px;font-weight:400;color:var(--text);margin-bottom:2px">建立第一個角色</div><div style="font-size:11px;font-weight:300;color:var(--text-3)">設計他的個性與背景</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);border-radius:12px;border:.5px solid var(--border)">
            <span style="font-size:18px">💬</span>
            <div><div style="font-size:12px;font-weight:400;color:var(--text);margin-bottom:2px">開始對話</div><div style="font-size:11px;font-weight:300;color:var(--text-3)">你說，他在聽</div></div>
          </div>
        </div>
      </div>

      <!-- Step 1：設定 API -->
      <div class="ob-step" :class="{ active: obStep === 1 }" id="ob-1">
        <div class="ob-ic"><svg viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></div>
        <div class="ob-title">連接 AI</div>
        <div class="ob-sub">選擇你的 AI 服務商並填入 API 金鑰，角色才能真正說話。</div>
        <div class="ob-form">
          <div class="ob-provider-row">
            <div class="ob-prov-btn" :class="{ sel: apiProvider === 'openai' }" @click="apiProvider = 'openai'">OpenAI</div>
            <div class="ob-prov-btn" :class="{ sel: apiProvider === 'anthropic' }" @click="apiProvider = 'anthropic'">Claude</div>
            <div class="ob-prov-btn" :class="{ sel: apiProvider === 'google' }" @click="apiProvider = 'google'">Gemini</div>
          </div>
          <div class="ob-hint" id="ob-key-hint">{{ providerHint }}</div>
          <input class="ob-input" id="ob-api-key" type="password" v-model="apiKey" placeholder="貼上你的 API 金鑰">
          <div class="ob-hint" style="margin-top:4px">金鑰只存在你的裝置上，不會上傳任何伺服器。</div>
          <select class="ob-input" style="margin-top:12px; background:var(--surface2); cursor:pointer;" v-model="apiModel">
            <option v-for="m in availableModels" :key="m.id" :value="m.id">{{ m.name }} - {{ m.desc }}</option>
          </select>
        </div>
      </div>

      <!-- Step 2：建立角色 -->
      <div class="ob-step" :class="{ active: obStep === 2 }" id="ob-2">
        <div class="ob-ic"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
        <div class="ob-title">建立第一個角色</div>
        <div class="ob-sub">給他一個名字和個性，<br>故事就從這裡開始。</div>
        <div class="ob-char-form">
          <input class="ob-input" id="ob-char-name" type="text" v-model="charName" placeholder="角色名字" maxlength="20">
          <textarea class="ob-input" id="ob-char-persona" rows="3" v-model="charPersona" placeholder="個性描述，例：外表冷靜但內心細膩，不擅長直接說感受，對在乎的人會默默付出…" style="resize:none;line-height:1.6"></textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="ob-emoji-row">
            <div v-for="e in emojis" :key="e" class="ob-emoji-btn" :class="{ sel: charEmoji === e }" @click="charEmoji = e">{{ e }}</div>
          </div>
          <div class="ob-hint">選一個頭像 Emoji</div>
        </div>
      </div>

      <!-- Step 3：完成 -->
      <div class="ob-step" :class="{ active: obStep === 3 }" id="ob-3">
        <div class="ob-ic"><span class="ob-ic-emoji">🎉</span></div>
        <div class="ob-title">準備好了</div>
        <div class="ob-sub" id="ob-done-sub">角色已建立，開始你們的第一次對話吧。</div>
        <div style="margin-top:24px;padding:16px;background:var(--surface);border-radius:14px;border:.5px solid var(--border);width:100%;max-width:320px;box-sizing:border-box">
          <div style="font-size:11px;font-weight:300;color:var(--text-3);margin-bottom:10px;letter-spacing:.04em">小提示</div>
          <div style="font-size:12px;font-weight:300;color:var(--text-2);line-height:1.8">
            · 在<strong style="font-weight:400">角色設定</strong>裡可以設計更豐富的背景故事<br>
            · 開啟 <strong style="font-weight:400">Heart Voice</strong> 讓他留下說不出口的心聲<br>
            · <strong style="font-weight:400">日記</strong>和<strong style="font-weight:400">夢境</strong>會記錄他的內心世界
          </div>
        </div>
      </div>

    </div>

    <!-- 底部 -->
    <div class="ob-footer">
      <div class="ob-dots">
        <div class="ob-dot" :class="{ active: obStep === 0 }"></div>
        <div class="ob-dot" :class="{ active: obStep === 1 }"></div>
        <div class="ob-dot" :class="{ active: obStep === 2 }"></div>
        <div class="ob-dot" :class="{ active: obStep === 3 }"></div>
      </div>
      <button class="ob-next" id="ob-next-btn" @click="obNext">{{ nextBtnText }}</button>
      <div class="ob-skip" @click="obSkip" v-if="obStep < 3">跳過，直接進入</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { setSetting, dbPut } from '../services/db.js';
import { globalStore } from '../store/index.js';

const router = useRouter();
const obStep = ref(0);

const apiProvider = ref('openai');
const apiKey = ref('');
const charName = ref('');
const charPersona = ref('');
const charEmoji = ref('🌸');

const emojis = ['🌸','🦊','🐺','🐱','🐰','🐻','🌿','🌙'];

const MODELS = {
  openai: [
    { id: 'gpt-5.5',      name: 'GPT-5.5',       desc: '最新旗艦，最強（$5/$30/MTok，1M context）' },
    { id: 'gpt-5.4',      name: 'GPT-5.4',        desc: '平衡性能（$2.50/$15/MTok，1M context）' },
    { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini',   desc: '推薦：速度快費用低（$0.75/$4.50/MTok）' },
    { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano',   desc: '最省費，最低延遲' },
    { id: 'gpt-4o',       name: 'GPT-4o',          desc: '前代旗艦，相容性佳' },
    { id: 'gpt-4o-mini',  name: 'GPT-4o mini',     desc: '前代輕量，廣泛相容' },
  ],
  anthropic: [
    { id: 'claude-opus-4-8',  name: 'Claude Opus 4.8',   desc: '最新旗艦，最強推理' },
    { id: 'claude-sonnet-5',  name: 'Claude Sonnet 5',   desc: '推薦：速度與智能兼顧' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5',  desc: '最快最省' },
  ],
  google: [
    { id: 'gemini-3.5-flash',      name: 'Gemini 3.5 Flash',      desc: '最新穩定旗艦，頂尖性能' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', desc: '新一代省費穩定版' },
    { id: 'gemini-2.5-pro',        name: 'Gemini 2.5 Pro',        desc: '複雜任務推薦' },
    { id: 'gemini-2.5-flash',      name: 'Gemini 2.5 Flash',      desc: '速度快，價格平衡' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', desc: '最省費用' },
  ],
};

const availableModels = computed(() => MODELS[apiProvider.value] || MODELS.openai);
const apiModel = ref(availableModels.value[0].id);

watch(apiProvider, () => {
  apiModel.value = availableModels.value[0].id;
});
const providerHint = computed(() => {
  if (apiProvider.value === 'anthropic') return '前往 console.anthropic.com 申請';
  if (apiProvider.value === 'google') return '前往 aistudio.google.com 申請';
  return '前往 platform.openai.com 申請，格式：sk-…';
});

const nextBtnText = computed(() => {
  if (obStep.value === 0) return '開始設定';
  if (obStep.value === 1) return '儲存並繼續';
  if (obStep.value === 2) return '建立角色';
  return '開始對話 →';
});

async function obNext() {
  if (obStep.value === 0) {
    obStep.value = 1;
  } else if (obStep.value === 1) {
    if (!apiKey.value.trim()) {
      window.toast_('請填入 API 金鑰');
      return;
    }
    await setSetting('api_provider', apiProvider.value);
    await setSetting('api_key', apiKey.value.trim());
    await setSetting('api_model', apiModel.value);

    obStep.value = 2;
  } else if (obStep.value === 2) {
    if (!charName.value.trim()) {
      window.toast_('請輸入角色名字');
      return;
    }
    // Create character
    const newChar = {
      id: 'char_' + Date.now(),
      name: charName.value.trim(),
      avatar: charEmoji.value,
      persona: charPersona.value.trim(),
      createdAt: Date.now(),
      hasUnread: false
    };
    await dbPut('characters', newChar);
    await globalStore.loadCharacters();
    obStep.value = 3;
  } else if (obStep.value === 3) {
    await setSetting('onboarding_done', true);
    // Find the newly created character and go to chat room
    const latestChar = globalStore.characters[globalStore.characters.length - 1];
    if (latestChar) {
      router.push('/chat/' + latestChar.id);
    } else {
      router.push('/');
    }
  }
}

async function obSkip() {
  await setSetting('onboarding_done', true);
  router.push('/');
}
</script>
