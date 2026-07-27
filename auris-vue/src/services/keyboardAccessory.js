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
export function keyboardAccessoryInset(win = globalThis.window) {
  if (!win || !isIosDevice(win)) return 0;
  const vv = win.visualViewport;
  if (!vv) return 0;
  const height = Number(vv.height) || 0;
  const baseline = Math.max(Number(win.innerHeight) || 0, height);
  if (baseline - height <= KEYBOARD_OPEN_THRESHOLD) return 0;
  return IOS_KEYBOARD_ACCESSORY_PX;
}
