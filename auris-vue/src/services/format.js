// 共用文字格式化工具
//
// 全站訊息／貼文／日記／夢境／心聲都用 v-html 渲染，內容來自 AI 回應、使用者輸入
// 與匯入的備份檔。這個函式是唯一的 XSS 防線：先 escape HTML 特殊字元，再把換行
// 轉成 <br>。任何要塞進 v-html 的純文字都必須經過這裡，不要在各 View 自行手刻，
// 以免漏掉某個 escape。
//
// 注意順序：& 必須最先處理，否則會把後面產生的 &lt; 再次轉義成 &amp;lt;。
// enableRich：聊天室專用排版。開啟時把 *動作敘述* 轉成斜體旁白、「對話」上色。
// 貼文／日記／夢境等不傳此參數，維持原樣，避免內文偶然出現的 * 被誤判。
export function formatContent(str, enableRich = false) {
  const cleaned = (str || '')
    // \r\n / \r 先正規化成 \n，否則殘留的 \r 會卡在字與換行之間、讓下面的合併配不到
    .replace(/\r\n?/g, '\n')
    // 移除夾在中文字、標點、英數之間的孤立換行（非段落換行）。
    // 用 lookahead 不吃掉右側字元，讓「A\nB\nC」這種連續單行也能逐一合併；
    // 容忍換行兩側的空白（模型偶爾輸出「字 \n字」）；英數↔英數之間補回一個空格，
    // 避免 hello\nworld 被黏成 helloworld。
    .replace(
      /([一-鿿　-〿＀-￯\w，。！？、：；「」『』…—])[ \t]*\n[ \t]*(?=([一-鿿　-〿＀-￯\w，。！？、：；「」『』…—]))/g,
      (_, a, b) => a + (/\w/.test(a) && /\w/.test(b) ? ' ' : '')
    )
    // 合併三個以上連續換行為兩個
    .replace(/\n{3,}/g, '\n\n');
  let html = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // 必須在 HTML escape 之後才解析，星號與引號皆為純文字，無 XSS 風險。
  if (enableRich) {
    html = html
      .replace(/\*([^*\n]+)\*/g, '<em class="msg-action">$1</em>')
      .replace(/「([^」]*)」/g, '<span class="msg-quote">「$1」</span>');
  }
  return html.replace(/\n/g, '<br>');
}

// 把 AI 一次回覆依「空行」切成多則訊息（真人 LINE 連發短泡泡）。
// 規則：以一個以上空行（\n{2,}）分段、各段 trim、丟掉空段。
// 無空行 → 回傳單段陣列（= 原本的單泡泡行為，安全退路）。
// maxSegments：上限（通常傳角色的 maxMsg），超過時把多出來的尾段合併回最後一段，
// 避免模型一句一段炸出一堆泡泡。預設不限。
export function splitReply(text, maxSegments = 0) {
  const segs = (text || '')
    .split(/\n{2,}/)
    .flatMap(splitQuotedBubbles)
    .map(s => s.trim())
    .filter(Boolean);
  if (!segs.length) return [];
  if (maxSegments > 0 && segs.length > maxSegments) {
    const head = segs.slice(0, maxSegments - 1);
    const tail = segs.slice(maxSegments - 1).join('\n\n');
    return [...head, tail];
  }
  return segs;
}

// 動作排版（「」包對話）下，模型常把多句「…」連寫成一段、彼此不空行，
// 使 splitReply 只切出一顆泡泡。這裡在「一句結束的 」」緊接「下一句的 「」
//（或中間夾一段 *動作* 後再接 「）的交界補切點，讓每則對話（含其前綴動作）各自成泡泡。
// 只在 」 後面確實還有下一句 「 時才切，句末引號或夾在句中的引用詞不受影響。
function splitQuotedBubbles(seg) {
  if (!seg || seg.indexOf('」') === -1) return [seg];
  return seg.split(/(?<=」)\s*(?=「|\*[^*\n]+\*\s*「)/);
}
