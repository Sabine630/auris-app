// zh-tw 輸出正規化的 Worker。
//
// OpenCC 的完整 cn→twp 字典是 1.06 MB，建成 converter 後常駐 12 MB 以上——放在主執行緒
// 會讓每個聊過天的分頁一直背著它。字典改成只在這個 Worker 裡展開，主執行緒用完即
// terminate，記憶體立刻歸還（實測主執行緒 heap 只 +0.02 MB）。
//
// 刻意不做字典精簡：OpenCC 的最長匹配依賴完整詞表互相制約，刪掉「逐字轉就正確」的詞條
// 會讓較短的詞在錯誤位置命中（不断发展→不斷髮展、三天后→三天后），錯得比留著簡體更難看。
import { ConverterFactory } from 'opencc-js/core';
import fromCn from 'opencc-js/from/cn';
import toTwp from 'opencc-js/to/twp';
import { convertVisibleProse } from './proseMask.js';

let converter = null;

self.onmessage = (event) => {
  const { text } = event.data || {};
  try {
    if (!converter) converter = ConverterFactory(...fromCn, ...toTwp);
    self.postMessage({ ok: true, text: convertVisibleProse(text, converter) });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error?.message || error) });
  }
};
