// ── 角色回覆就地編輯（P136）──────────────────────────────────────────────
// 背景：角色講錯事實（例如生日）後，錯誤答案留在對話歷史裡會被模型當成「記得」的事，
// 使用者怎麼糾正都沒用。刪除單則訊息會破壞 user/assistant 交替結構（Gemini／Anthropic
// 會拒絕連續同角色訊息），編輯則完全不影響則數與角色順序，是更安全的解法。
//
// 這裡只處理「換掉訊息內容」這件事本身，刻意不碰 DB／UI——純函式好測，
// 呼叫端（ChatRoomView.vue）負責決定何時呼叫、以及呼叫後怎麼寫回。

/**
 * 套用使用者對訊息內容的編輯，回傳要寫回 DB 的新訊息物件。
 * 內容無效（trim 後為空）或沒有實質變更（trim 後與原內容相同）時回傳 null，
 * 呼叫端應據此判斷不需要寫入。
 *
 * 刻意不對 newContent 做任何正規化轉換（例如繁體字形轉換）——
 * 這是使用者刻意打的字，原樣保存，避免重現 P134 修過的誤傷專有名詞問題。
 *
 * @param {object} msg 原始訊息物件（不會被修改）
 * @param {string} newContent 使用者編輯後的新內容
 * @returns {object|null} 新訊息物件，或 null（無變更／無效輸入）
 */
export function applyMessageEdit(msg, newContent) {
  // 陣列的 typeof 也是 'object'，不擋掉的話 { ...[] } 會生出只有 content 的垃圾物件。
  // 實務上呼叫端傳的一定是真的訊息物件，這裡純粹是不讓函式有無意義的輸出路徑。
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return null;
  if (typeof newContent !== 'string') return null;

  const trimmed = newContent.trim();
  if (!trimmed) return null;
  if (trimmed === msg.content) return null;

  return { ...msg, content: trimmed };
}
