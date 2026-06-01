// 月經週期計算與關心提示組裝。
// 週期資料只存在 me_settings（本機 IndexedDB），全在本地計算，不上傳任何伺服器。

// 依「最近一次經期開始日 + 週期長度 + 經期天數」推算今天落在週期的哪個階段。
// 回傳 null 代表未啟用或資料不足，呼叫端應略過所有生理期相關行為。
export function getCyclePhase(me, now = new Date()) {
  if (!me || !me.cycleEnabled || !me.lastPeriodStart) return null;
  const cycleLen = Number(me.cycleLength) || 28;
  const periodLen = Number(me.periodLength) || 5;
  const start = new Date(me.lastPeriodStart + 'T00:00:00');
  if (isNaN(start.getTime())) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSince = Math.floor((today - start) / 86400000);
  if (daysSince < 0) return null; // 開始日填在未來，視為無效

  const dayInCycle = ((daysSince % cycleLen) + cycleLen) % cycleLen; // 0-based
  const dayNum = dayInCycle + 1;                                     // 1-based（經期/週期第幾天）
  const daysUntilNext = (cycleLen - dayInCycle) % cycleLen;          // 距下次經期天數，0=今天開始

  let phase;
  if (dayInCycle < periodLen) phase = 'period';                            // 經期中
  else if (daysUntilNext <= 2) phase = 'pms';                              // 經期前（約2天內）
  else if (Math.abs(dayInCycle - Math.round(cycleLen / 2)) <= 1) phase = 'ovulation'; // 排卵期附近
  else phase = 'normal';

  return { phase, dayNum, dayInCycle, daysUntilNext, cycleLen, periodLen };
}

// 給聊天 system prompt 用的「被動體貼」提示。
// 只在經期中/經期前回傳內容，其餘階段回空字串，避免角色沒事一直把話題繞到生理期。
export function cycleCareContext(ph) {
  if (!ph) return '';
  if (ph.phase === 'period') {
    return `\n【對方目前的身體狀態】對方正值生理期第 ${ph.dayNum} 天，可能小腹悶痛、疲倦、情緒比較敏感。請在適當時機自然地表達關心（例如提醒保暖、多休息、喝點熱的、別吃生冷，或單純問一句會不會不舒服），但不要每句話都繞到這件事、不要說教，完全符合你的角色個性。`;
  }
  if (ph.phase === 'pms') {
    return `\n【對方目前的身體狀態】對方的生理期預計再過 ${ph.daysUntilNext} 天就要來，這幾天可能情緒起伏、容易累或煩躁。請對對方溫柔一點、多些包容，可在適當時機提醒注意身體，但不要刻意點破或說教。`;
  }
  return '';
}

// 給人看的階段中文標籤（MeView 預覽用）。
export function cyclePhaseLabel(ph) {
  if (!ph) return '';
  if (ph.phase === 'period') return `生理期第 ${ph.dayNum} 天`;
  if (ph.phase === 'pms') return `生理期預計 ${ph.daysUntilNext} 天後來`;
  if (ph.phase === 'ovulation') return '排卵期前後';
  return `週期第 ${ph.dayNum} 天`;
}
