import { describe, expect, it } from 'vitest';
import { IOS_KEYBOARD_ACCESSORY_PX, keyboardAccessoryInset } from '../keyboardAccessory.js';

function fakeWin({ ua = 'iPhone', innerHeight = 852, vvHeight = 852, hasVv = true } = {}) {
  return {
    navigator: { userAgent: ua, platform: ua === 'iPhone' ? 'iPhone' : 'MacIntel', maxTouchPoints: 0 },
    innerHeight,
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

  it('沒有 visualViewport 或沒有 window 時安全回 0', () => {
    expect(keyboardAccessoryInset(fakeWin({ vvHeight: 515, hasVv: false }))).toBe(0);
    expect(keyboardAccessoryInset(null)).toBe(0);
  });
});
