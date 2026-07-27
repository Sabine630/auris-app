import { describe, expect, it } from 'vitest';
import { IOS_KEYBOARD_ACCESSORY_PX, keyboardAccessoryInset } from '../keyboardAccessory.js';

function fakeWin({
  ua = 'iPhone', innerHeight = 852, vvHeight = 852, clientHeight = 852, hasVv = true
} = {}) {
  return {
    navigator: { userAgent: ua, platform: ua === 'iPhone' ? 'iPhone' : 'MacIntel', maxTouchPoints: 0 },
    innerHeight,
    document: { documentElement: { clientHeight } },
    visualViewport: hasVv ? { height: vvHeight } : undefined
  };
}

describe('keyboardAccessoryInset', () => {
  it('iOS 軟體鍵盤升起時讓出輔助列高度', () => {
    expect(keyboardAccessoryInset(fakeWin({ vvHeight: 515 }))).toBe(IOS_KEYBOARD_ACCESSORY_PX);
  });

  it('鍵盤未升起（含接實體鍵盤：viewport 不縮）時不讓位', () => {
    expect(keyboardAccessoryInset(fakeWin({ vvHeight: 852 }))).toBe(0);
    // 剛好 80px 門檻內的縮動（例如 Safari 工具列收合）不算鍵盤
    expect(keyboardAccessoryInset(fakeWin({ vvHeight: 772 }))).toBe(0);
    expect(keyboardAccessoryInset(fakeWin({ vvHeight: 771 }))).toBe(IOS_KEYBOARD_ACCESSORY_PX);
  });

  it('非 iOS 平台一律 0：Android／桌面沒有這條浮動輔助列', () => {
    expect(keyboardAccessoryInset(fakeWin({ ua: 'Android', vvHeight: 515 }))).toBe(0);
  });

  // 實機診斷（2026-07-27）：iOS standalone 的 innerHeight 會跟著鍵盤縮到與 vv 同高，
  // 那一格 acc 就掉回 0、bottom-inset 在 403/345 之間抖。layout viewport 不隨鍵盤縮放，
  // 用 documentElement.clientHeight 當基準才穩。
  it('innerHeight 跟著鍵盤縮到與 vv 同高時仍判定鍵盤開啟（不可用 innerHeight 當基準）', () => {
    expect(keyboardAccessoryInset(fakeWin({ innerHeight: 448, vvHeight: 448, clientHeight: 852 })))
      .toBe(IOS_KEYBOARD_ACCESSORY_PX);
  });

  it('呼叫端有可信基準時以 keyboardOpen 為準，不再自行猜測', () => {
    // keyboardViewport 用 focus 前量到的 baseline 判定，比任何 heuristic 可靠
    expect(keyboardAccessoryInset(fakeWin({ innerHeight: 448, vvHeight: 448, clientHeight: 448 }), { keyboardOpen: true }))
      .toBe(IOS_KEYBOARD_ACCESSORY_PX);
    expect(keyboardAccessoryInset(fakeWin({ vvHeight: 515 }), { keyboardOpen: false })).toBe(0);
    // 非 iOS 時 keyboardOpen 也不能把讓位打開
    expect(keyboardAccessoryInset(fakeWin({ ua: 'Android', vvHeight: 515 }), { keyboardOpen: true })).toBe(0);
  });

  it('沒有 visualViewport 或沒有 window 時安全回 0', () => {
    expect(keyboardAccessoryInset(fakeWin({ vvHeight: 515, hasVv: false }))).toBe(0);
    expect(keyboardAccessoryInset(null)).toBe(0);
  });
});
