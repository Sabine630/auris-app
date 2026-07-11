// ── 訊息朗讀（P106 B3，TTS 輕量版）──────────────────────────────────────────
// speechSynthesis 唸出訊息：免費、純前端、不落庫。只做長按「朗讀」，
// 不做自動朗讀（iOS 中文系統音偏機械，自動播破壞氣氛）。高品質 TTS API 未來另議。

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSpeaking() {
  return speechSupported() && window.speechSynthesis.speaking;
}

export function stopSpeak() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

// 朗讀一段文字（會先停掉前一段）。動作系括號內容（如「（抱住了你）」）唸起來
// 出戲，先剝掉再唸；全是動作就照唸原文。
export function speakText(text) {
  if (!speechSupported() || !text) return false;
  stopSpeak();
  const spoken = stripActionText(text);
  const u = new SpeechSynthesisUtterance(spoken);
  u.lang = 'zh-TW';
  const voice = pickZhVoice();
  if (voice) u.voice = voice;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
  return true;
}

// 剝除全形/半形括號內的動作描寫；剝完若沒剩東西則回原文
export function stripActionText(text) {
  const stripped = text.replace(/（[^）]*）|\([^)]*\)/g, '').replace(/\n{2,}/g, '\n').trim();
  return stripped || text;
}

function pickZhVoice() {
  const voices = window.speechSynthesis.getVoices() || [];
  return voices.find(v => /^zh[-_]TW/i.test(v.lang))
      || voices.find(v => /^zh/i.test(v.lang))
      || null;
}
