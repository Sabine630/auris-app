import { isIosDevice } from './keyboardRootScrollGuard.js';

// iOS 鍵盤上方那條「∧ ∨ ✓」表單輔助列（form assistant）在新版 iOS 改成浮動膠囊，
// 它**不屬於鍵盤**，而是浮在 visual viewport 內的 overlay：visualViewport.height 只扣掉
// 鍵盤本身，不會扣掉這條膠囊。於是任何「貼齊 visual viewport 底邊」的輸入列都會被它
// 整條蓋住——P132 實機錄影（2026-07-27）就是這個症狀：聊天室輸入框看起來完全消失，
// 打的字隱約透在膠囊底下，關掉鍵盤後字又好端端在輸入框裡。
//
// 這條膠囊沒有任何 Web API 量得到（不在 DOM、不在 vv、iOS 也沒有 VirtualKeyboard API），
// 只能用實機量到的常數扣除。量測自上述錄影（iPhone，logical 393×852）：
//   膠囊上緣 y≈457 · visual viewport 底邊（鍵盤上緣）y≈515 → 需要讓出 58px
//
// 保守面：多讓 58px 最壞是輸入列上方多一條黑邊（膠囊本來就會蓋住那塊，看不出來）；
// 少讓則是輸入框整條看不見。因此寧可讓。
export const IOS_KEYBOARD_ACCESSORY_PX = 58;

const KEYBOARD_OPEN_THRESHOLD = 80;

// 只在「iOS 且軟體鍵盤確實升起」時讓位：接了實體鍵盤時 visual viewport 不縮，
// 輔助列也不會擋住畫面底部，不該平白挖掉 58px。
//
// keyboardOpen：呼叫端自己有可信基準時（keyboardViewport 有 focus 前量到的 baseline）
// 直接傳進來，不要讓這裡自己猜。實機診斷（2026-07-27）證實 iOS standalone 的
// window.innerHeight 會跟著鍵盤縮到與 vv.height 相同（log 中 vv=448h/win=448h），
// 拿它當基準會誤判成「鍵盤沒開」→ acc 在 58/0 之間跳、版面跟著抖。
//
// 沒有可信基準時（App.vue 一般頁面）改用 documentElement.clientHeight：layout viewport
// 不隨鍵盤縮放，是這幾個數字裡最穩的。三者取 max 只會高估基準，方向安全——寧可多讓
// 58px（被輔助列蓋住看不出來），不可少讓（輸入框整條消失）。
export function keyboardAccessoryInset(win = globalThis.window, { keyboardOpen = null } = {}) {
  if (!win || !isIosDevice(win)) return 0;
  if (keyboardOpen === false) return 0;
  const vv = win.visualViewport;
  if (!vv) return 0;
  if (keyboardOpen === true) return IOS_KEYBOARD_ACCESSORY_PX;

  const height = Number(vv.height) || 0;
  const baseline = Math.max(
    Number(win.document?.documentElement?.clientHeight) || 0,
    Number(win.innerHeight) || 0,
    height
  );
  if (baseline - height <= KEYBOARD_OPEN_THRESHOLD) return 0;
  return IOS_KEYBOARD_ACCESSORY_PX;
}
