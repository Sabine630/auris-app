// 共用文字格式化工具
//
// 全站訊息／貼文／日記／夢境／心聲都用 v-html 渲染，內容來自 AI 回應、使用者輸入
// 與匯入的備份檔。這個函式是唯一的 XSS 防線：先 escape HTML 特殊字元，再把換行
// 轉成 <br>。任何要塞進 v-html 的純文字都必須經過這裡，不要在各 View 自行手刻，
// 以免漏掉某個 escape。
//
// 注意順序：& 必須最先處理，否則會把後面產生的 &lt; 再次轉義成 &amp;lt;。
export function formatContent(str) {
  const cleaned = (str || '')
    // 移除夾在中文字、標點、英數之間的孤立換行（非段落換行）
    .replace(/([一-鿿　-〿＀-￯\w，。！？、：；「」『』…—])\n([一-鿿　-〿＀-￯\w，。！？、：；「」『』…—])/g, '$1$2')
    // 合併三個以上連續換行為兩個
    .replace(/\n{3,}/g, '\n\n');
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
