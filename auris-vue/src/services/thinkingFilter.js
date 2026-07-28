// 剝除模型輸出裡的思考區塊（P132）。
//
// 部分模型（實機：Anthropic Claude 走代理）會把 <thinking>…</thinking> 當成一般文字吐出來。
// 這段文字沒有被任何地方過濾，於是原樣進了聊天泡泡、貼文、日記，也污染了需要解析 JSON 的
// 背景任務——待續事件擷取器的 parseThreadOps 從「第一個 [」找陣列，思考內容裡只要出現方
// 括號就會解析失敗、靜默丟掉整批事件。因此統一在 callLLM 出口剝除，所有下游一次乾淨。
//
// 只認開頭與結尾都完整的標籤配對；未閉合的殘段（例如被 max_tokens 切斷）也一併去掉尾巴，
// 否則使用者會看到半截的英文思考。

const THINKING_TAGS = ['thinking', 'think', 'reasoning', 'antthinking'];
const BLOCK_RE = new RegExp(
  `<(${THINKING_TAGS.join('|')})>[\\s\\S]*?</\\1>`,
  'gi',
);
// 未閉合的開頭標籤：從它到文字結尾整段捨棄（截斷的思考不可能還原）
const UNCLOSED_RE = new RegExp(`<(${THINKING_TAGS.join('|')})>[\\s\\S]*$`, 'i');

export function stripThinking(text) {
  if (typeof text !== 'string' || !text.includes('<')) return text;
  const stripped = text.replace(BLOCK_RE, '').replace(UNCLOSED_RE, '');
  // 全部都是思考內容時不要回傳空字串——寧可保留原文讓上層照既有規則處理，
  // 也不要讓「模型只吐了思考」看起來像「模型回了空白」而觸發不同的錯誤路徑。
  const cleaned = stripped.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned || text;
}

// 串流用的狀態過濾器：標籤可能被切在任意 chunk 邊界，故維持一個小緩衝區，
// 只有「確定不可能是標籤前綴」的文字才放行給畫面。
export function createThinkingStreamFilter(onChunk) {
  if (typeof onChunk !== 'function') return { push: () => {}, flush: () => {} };
  let pending = '';
  let inside = false;

  const openRe = new RegExp(`<(${THINKING_TAGS.join('|')})>`, 'i');
  const closeRe = new RegExp(`</(${THINKING_TAGS.join('|')})>`, 'i');
  // 尾端可能是「還沒收完的標籤」→ 先扣住不放行
  const partialTailRe = /<\/?[a-zA-Z]{0,12}$/;

  function drain() {
    while (pending) {
      if (inside) {
        const close = pending.match(closeRe);
        if (!close) {
          // 還在思考區塊內：整段吞掉，只留可能是結尾標籤前綴的尾巴
          const tail = pending.match(partialTailRe);
          pending = tail ? tail[0] : '';
          return;
        }
        pending = pending.slice(close.index + close[0].length);
        inside = false;
        continue;
      }
      const open = pending.match(openRe);
      if (!open) {
        const tail = pending.match(partialTailRe);
        const safe = tail ? pending.slice(0, pending.length - tail[0].length) : pending;
        if (safe) onChunk(safe);
        pending = tail ? tail[0] : '';
        return;
      }
      if (open.index > 0) onChunk(pending.slice(0, open.index));
      pending = pending.slice(open.index + open[0].length);
      inside = true;
    }
  }

  return {
    push(chunk) {
      pending += String(chunk ?? '');
      drain();
    },
    // 串流結束：把扣住的尾巴放行（除非它其實是思考區塊的殘段）
    flush() {
      if (!inside && pending && !openRe.test(pending)) onChunk(pending);
      pending = '';
      inside = false;
    },
  };
}
