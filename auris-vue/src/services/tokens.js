// 粗略 token 估算（前端無法取得各家真實 tokenizer，故用啟發式）。
// 用途：記憶抽屜的用量顯示、未來的 context 預算控管。
// 設計原則：不求精準，只求「穩定一致 + 寧可高估」——目標是控成本/避免稀釋，不是塞到極限。
//
// 經驗值：CJK 一字約 0.6 token；英數約 4 字 1 token（0.25 token/字）。
// 跨 provider（GPT BPE / Claude / Gemini SentencePiece）差異不大，保守估即可。
const CJK_RE = /[一-鿿぀-ヿ가-힯]/g;

export function estimateTokens(text = '') {
  if (!text) return 0;
  const cjk = (text.match(CJK_RE) || []).length;
  const rest = text.length - cjk;
  return Math.ceil(cjk * 0.6 + rest * 0.25);
}
