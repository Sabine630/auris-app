import { describe, expect, it, vi } from 'vitest';
import {
  computeKeyboardInsets,
  installKeyboardViewport,
  isKeyboardViewportOpen,
  isViewportRestored
} from '../keyboardViewport.js';

describe('computeKeyboardInsets', () => {
  it('鍵盤未遮蔽頁面時 inset 為 0', () => {
    expect(computeKeyboardInsets({ baseTop: 48, baseBottom: 844, viewportTop: 0, viewportHeight: 852 }))
      .toEqual({ topInset: 0, bottomInset: 0, availableHeight: 796 });
  });

  it('鍵盤縮小 visual viewport 時只計算底部遮蔽', () => {
    expect(computeKeyboardInsets({ baseTop: 48, baseBottom: 844, viewportTop: 0, viewportHeight: 500 }))
      .toEqual({ topInset: 0, bottomInset: 296, availableHeight: 500 });
  });

  it('safe-area page top 不可直接從 visual viewport offset 扣除', () => {
    expect(computeKeyboardInsets({
      baseTop: 48,
      baseBottom: 844,
      baselineViewportTop: 0,
      viewportTop: 180,
      viewportHeight: 500
    })).toEqual({ topInset: 180, bottomInset: 116, availableHeight: 500 });
  });

  it('以 focus 前 viewport offset 為原點，避免 iOS 26 殘留 offset 重複補償', () => {
    expect(computeKeyboardInsets({
      baseTop: 48,
      baseBottom: 844,
      baselineViewportTop: 24,
      viewportTop: 180,
      viewportHeight: 500
    })).toEqual({ topInset: 156, bottomInset: 140, availableHeight: 500 });
  });

  it('無效與負值不會產生 NaN 或負高度', () => {
    expect(computeKeyboardInsets({ baseTop: NaN, baseBottom: -10, viewportTop: -20, viewportHeight: -1 }))
      .toEqual({ topInset: 0, bottomInset: 0, availableHeight: 0 });
  });
});

describe('viewport 狀態判定', () => {
  it('高度差超過門檻才視為鍵盤開啟', () => {
    expect(isKeyboardViewportOpen(800, 719)).toBe(true);
    expect(isKeyboardViewportOpen(800, 720)).toBe(false);
  });

  it('回升到基準高度容差內才視為復原', () => {
    expect(isViewportRestored(800, 760)).toBe(true);
    expect(isViewportRestored(800, 759)).toBe(false);
  });
});

class FakeTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type, target = null) {
    for (const fn of this.listeners.get(type) || []) fn({ type, target });
  }
}

function fakePage() {
  const target = new FakeTarget();
  const styles = new Map();
  const classes = new Set();
  const inputBar = { contains: el => el?.inInputBar === true };
  return Object.assign(target, {
    style: {
      setProperty: (key, value) => styles.set(key, value),
      removeProperty: key => styles.delete(key)
    },
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name)
    },
    querySelector: selector => selector === '.keyboard-input-bar' ? inputBar : null,
    contains: el => el?.inPage === true,
    getBoundingClientRect: () => ({ top: 48, bottom: 844 }),
    styles,
    classes
  });
}

function controllerHarness() {
  vi.useFakeTimers();
  const page = fakePage();
  const vv = Object.assign(new FakeTarget(), { height: 852, offsetTop: 0 });
  const win = Object.assign(new FakeTarget(), {
    innerHeight: 852,
    visualViewport: vv,
    requestAnimationFrame: cb => { cb(); return 1; },
    cancelAnimationFrame: () => {},
    setTimeout,
    clearTimeout
  });
  const doc = { activeElement: null };
  const destroy = installKeyboardViewport(page, { windowObj: win, documentObj: doc, visualViewport: vv });
  const textarea = { tagName: 'TEXTAREA', inPage: true, inInputBar: true };
  return { page, vv, win, destroy, textarea };
}

describe('installKeyboardViewport', () => {
  it('focus 後鍵盤尚未縮高時仍保持 active，blur 且 viewport 復原才清除', () => {
    const { page, win, destroy, textarea } = controllerHarness();
    page.emit('pointerdown', textarea);
    page.emit('focusin', textarea);
    win.emit('pointerup', textarea);
    vi.runAllTimers();
    expect(page.classes.has('kb-active')).toBe(true);

    page.emit('focusout', textarea);
    vi.runAllTimers();
    expect(page.classes.has('kb-active')).toBe(false);
    destroy();
    vi.useRealTimers();
  });

  it('focus 後依 visual viewport 套用局部 inset，不修改 .phone', () => {
    const { page, vv, destroy, textarea } = controllerHarness();
    page.emit('pointerdown', textarea);
    page.emit('focusin', textarea);
    vv.height = 500;
    vv.offsetTop = 180;
    vv.emit('resize');
    vi.runAllTimers();

    expect(page.styles.get('--keyboard-top-inset')).toBe('180px');
    expect(page.styles.get('--keyboard-bottom-inset')).toBe('116px');
    expect(page.classes.has('kb-open')).toBe(true);
    destroy();
    vi.useRealTimers();
  });

  it('blur 後 viewport 尚未回升時不還原', () => {
    const { page, vv, destroy, textarea } = controllerHarness();
    page.emit('pointerdown', textarea);
    page.emit('focusin', textarea);
    vv.height = 500;
    vv.emit('resize');
    vi.runAllTimers();
    page.emit('focusout', textarea);
    vi.runAllTimers();
    expect(page.classes.has('kb-open')).toBe(true);
    destroy();
    vi.useRealTimers();
  });

  it('延遲到 240ms 才更新的 offsetTop 仍會被 trailing reconcile 採用', () => {
    const { page, vv, destroy, textarea } = controllerHarness();
    page.emit('pointerdown', textarea);
    page.emit('focusin', textarea);
    vv.height = 500;
    vv.offsetTop = 0;
    vv.emit('resize');
    vi.advanceTimersByTime(100);
    expect(page.styles.get('--keyboard-top-inset')).toBe('0px');

    vv.offsetTop = 180;
    vi.advanceTimersByTime(150);
    expect(page.styles.get('--keyboard-top-inset')).toBe('180px');
    expect(page.styles.get('--keyboard-bottom-inset')).toBe('116px');
    destroy();
    vi.useRealTimers();
  });

  it('blur 後 100ms 內 refocus 會取消還原排程', () => {
    const { page, vv, destroy, textarea } = controllerHarness();
    page.emit('pointerdown', textarea);
    page.emit('focusin', textarea);
    vv.height = 500;
    vv.emit('resize');
    vi.advanceTimersByTime(60);
    page.emit('focusout', textarea);
    vi.advanceTimersByTime(50);
    page.emit('focusin', textarea);
    vi.advanceTimersByTime(100);
    expect(page.classes.has('kb-active')).toBe(true);
    destroy();
    vi.useRealTimers();
  });

  it('送出按鈕 pointer 操作結束前不還原', () => {
    const { page, vv, win, destroy, textarea } = controllerHarness();
    page.emit('pointerdown', textarea);
    page.emit('focusin', textarea);
    vv.height = 500;
    vv.emit('resize');
    vi.runAllTimers();

    const button = { tagName: 'BUTTON', inPage: true, inInputBar: true };
    page.emit('pointerdown', button);
    page.emit('focusout', textarea);
    vv.height = 852;
    vv.emit('resize');
    vi.advanceTimersByTime(200);
    expect(page.classes.has('kb-active')).toBe(true);

    win.emit('pointerup', button);
    vi.runAllTimers();
    expect(page.classes.has('kb-active')).toBe(false);
    destroy();
    vi.useRealTimers();
  });

  it('destroy 後清除樣式並解除 visual viewport 監聽', () => {
    const { page, vv, destroy, textarea } = controllerHarness();
    page.emit('pointerdown', textarea);
    page.emit('focusin', textarea);
    vv.height = 500;
    vv.emit('resize');
    vi.runAllTimers();
    destroy();
    expect(page.styles.size).toBe(0);
    expect(page.classes.has('kb-active')).toBe(false);

    vv.height = 400;
    vv.emit('resize');
    vi.runAllTimers();
    expect(page.styles.size).toBe(0);
    vi.useRealTimers();
  });
});
