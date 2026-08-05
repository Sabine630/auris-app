// 使用者可見的角色輸出語言防線。
// Prompt 規則負責降低模型混用語言的機率；zh-tw 輸出在落庫前再經本機 OpenCC 正規化，
// 避免供應商忽略 prompt 時把簡體中文永久存進聊天、貼文、日記等內容。
//
// 轉換一律在 zhTwWorker 裡做、做完就 terminate：完整字典建成 converter 後要 12 MB 以上，
// 不能讓它常駐在主執行緒（純前端 PWA，使用者裝置就是唯一的執行環境）。零 API 呼叫、零 token。
import { logError } from './diag.js';
import { convertVisibleProse } from './proseMask.js';
import { filterPhraseDict } from './zhPhraseBlocklist.js';

const WORKER_TIMEOUT_MS = 8000;

export function characterLanguageInstruction(lang = 'zh-tw') {
  const rules = {
    'zh-tw': '【輸出語言】所有一般中文內容必須使用自然的繁體中文（台灣用語），不得混入簡體中文；專有名詞、網址、程式碼與忠實原文引述可保留原樣。',
    'zh-cn': '【输出语言】所有一般中文内容必须使用自然的简体中文；专有名词、网址、代码与忠实原文引用可保留原样。',
    ja: '【出力言語】自然な日本語で書いてください。固有名詞、URL、コード、正確な原文引用のみ原文のまま残せます。',
    ko: '【출력 언어】자연스러운 한국어로 작성하세요. 고유명사, URL, 코드, 정확한 원문 인용만 원문 그대로 유지할 수 있습니다.',
    en: '【Output language】Write in natural English. Only proper nouns, URLs, code, and faithful quotations may remain in their original language.',
  };
  return rules[lang] || rules['zh-tw'];
}

// 每次轉換都是「開 Worker → 轉 → terminate」。字典下載後由瀏覽器 HTTP cache 命中，
// 重開的成本只有 spawn（實測整趟約 80 ms），落庫路徑感受不到。
function convertInWorker(text) {
  const worker = new Worker(new URL('./zhTwWorker.js', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('zh-tw worker timeout')), WORKER_TIMEOUT_MS);
    const done = (fn, arg) => { clearTimeout(timer); fn(arg); };
    worker.onmessage = ({ data }) => (data?.ok
      ? done(resolve, data.text)
      : done(reject, new Error(data?.error || 'zh-tw worker failed')));
    worker.onerror = (event) => done(reject, new Error(event?.message || 'zh-tw worker error'));
    worker.postMessage({ text });
  }).finally(() => worker.terminate());
}

// 沒有 Worker 的環境（vitest／舊瀏覽器）退回主執行緒轉換，行為與 Worker 版一致。
// converter 刻意不快取：快取起來就等於把 20 MB 以上的字典 trie 永久釘在主執行緒，
// 正是這支模組要避免的事。每次退路都重建（約 70 ms），轉完即可被 GC 回收。
// （字典模組本身進了 ES module registry 就無法卸載，那 1 MB 字串留著是平台限制；
//   真正該避免的是 trie。Worker 路徑連 registry 都隨 terminate 一起清掉。）
async function convertOnMainThread(text) {
  const [{ ConverterFactory }, { default: fromCn }, { default: toTwp }] = await Promise.all([
    import('opencc-js/core'),
    import('opencc-js/from/cn'),
    import('opencc-js/to/twp'),
  ]);
  return convertVisibleProse(text, ConverterFactory(...fromCn, ...filterPhraseDict(toTwp)));
}

// 正規化是加分防線，不是落庫的前提：轉換失敗（字典載不到、Worker 起不來、逾時）時退回
// 原文，不能讓已經生成且已計費的角色回覆整則消失。
export async function normalizeCharacterOutput(text, lang = 'zh-tw') {
  if (lang !== 'zh-tw' || typeof text !== 'string' || !text) return text;
  if (typeof Worker !== 'undefined') {
    try {
      return await convertInWorker(text);
    } catch (error) {
      // 舊 Safari 有 Worker 但不吃 type:'module'。品質優先，退回主執行緒轉換（記憶體代價
      // 只發生在這些環境），仍失敗才放棄。
      logError('outputLanguage', error, { phase: 'worker' });
    }
  }
  try {
    return await convertOnMainThread(text);
  } catch (error) {
    logError('outputLanguage', error, { phase: 'normalize' });
    return text;
  }
}

export { convertVisibleProse };
