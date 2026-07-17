import { publishKeyboardDiagnostic } from './keyboardDiagnostics.js';

const KEYBOARD_THRESHOLD = 80;
const VIEWPORT_RESTORED_EPSILON = 40;
const SETTLE_DELAYS_MS = [60, 240, 500];
const BLUR_DELAY_MS = 100;

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

// visualViewport.offsetTop 與 page rect 不在同一個座標原點：手機版 .phone 的
// safe-area padding 會反映在 baseTop，卻不會出現在 resting viewportTop。
// 因此先用 focus 前的 viewportTop 把目前 offset 轉成「頁面內位移」，再計算
// 上下 inset；不可直接拿 viewportTop - baseTop，否則整頁會上移一個 safe-area。
export function computeKeyboardInsets({
  baseTop,
  baseBottom,
  baselineViewportTop = 0,
  viewportTop,
  viewportHeight
}) {
  const top = finiteNumber(baseTop);
  const bottom = Math.max(top, finiteNumber(baseBottom, top));
  const pageHeight = bottom - top;
  const restingViewportTop = finiteNumber(baselineViewportTop);
  const visibleTop = Math.max(0, finiteNumber(viewportTop) - restingViewportTop);
  const visibleHeight = Math.max(0, finiteNumber(viewportHeight));
  const visibleBottom = visibleTop + visibleHeight;
  const topInset = visibleTop;
  const bottomInset = Math.max(0, pageHeight - visibleBottom);
  const availableHeight = Math.max(0, pageHeight - topInset - bottomInset);

  return { topInset, bottomInset, availableHeight };
}

export function isKeyboardViewportOpen(baselineHeight, currentHeight, threshold = KEYBOARD_THRESHOLD) {
  const baseline = Math.max(0, finiteNumber(baselineHeight));
  const current = Math.max(0, finiteNumber(currentHeight, baseline));
  return baseline - current > threshold;
}

export function isViewportRestored(baselineHeight, currentHeight, epsilon = VIEWPORT_RESTORED_EPSILON) {
  const baseline = Math.max(0, finiteNumber(baselineHeight));
  const current = Math.max(0, finiteNumber(currentHeight, baseline));
  return current >= baseline - epsilon;
}

function isTextControl(target) {
  const tag = target?.tagName?.toUpperCase?.();
  return tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable === true;
}

export function installKeyboardViewport(page, options = {}) {
  const win = options.windowObj || window;
  const vv = options.visualViewport || win.visualViewport;
  if (!page || !vv) return () => {};

  const requestFrame = options.requestFrame || win.requestAnimationFrame.bind(win);
  const cancelFrame = options.cancelFrame || win.cancelAnimationFrame.bind(win);
  const setTimer = options.setTimer || win.setTimeout.bind(win);
  const clearTimer = options.clearTimer || win.clearTimeout.bind(win);
  const inputBar = page.querySelector?.('.keyboard-input-bar');

  let baseline = null;
  let destroyed = false;
  let interactionActive = false;
  let focusWithin = false;
  let firstFrame = 0;
  let secondFrame = 0;
  const settleTimers = new Set();
  let blurTimer = 0;
  let interactionTimer = 0;

  function clearGeometry() {
    page.style.removeProperty('--keyboard-top-inset');
    page.style.removeProperty('--keyboard-bottom-inset');
    page.classList.remove('kb-open');
    page.classList.remove('kb-active');
  }

  function captureBaseline() {
    if (destroyed || isKeyboardViewportOpen(baseline?.viewportHeight, vv.height)) return;
    clearGeometry();
    const rect = page.getBoundingClientRect();
    baseline = {
      top: finiteNumber(rect.top),
      bottom: finiteNumber(rect.bottom, rect.top),
      viewportTop: finiteNumber(vv.offsetTop),
      viewportHeight: Math.max(0, finiteNumber(vv.height, win.innerHeight))
    };
    publishKeyboardDiagnostic({
      reason: 'baseline',
      baselineHeight: baseline.viewportHeight,
      baselineTop: baseline.viewportTop,
      topInset: 0,
      bottomInset: 0
    });
  }

  function measureNow() {
    if (destroyed || !baseline) return;
    const currentHeight = Math.max(0, finiteNumber(vv.height, baseline.viewportHeight));
    const keyboardOpen = isKeyboardViewportOpen(baseline.viewportHeight, currentHeight);

    if (!keyboardOpen) {
      page.style.removeProperty('--keyboard-top-inset');
      page.style.removeProperty('--keyboard-bottom-inset');
      page.classList.remove('kb-open');
      if (!interactionActive && isViewportRestored(baseline.viewportHeight, currentHeight)) {
        if (!focusWithin) page.classList.remove('kb-active');
      }
      publishKeyboardDiagnostic({
        reason: 'measure:closed',
        baselineHeight: baseline.viewportHeight,
        baselineTop: baseline.viewportTop,
        topInset: 0,
        bottomInset: 0
      });
      return;
    }

    const { topInset, bottomInset } = computeKeyboardInsets({
      baseTop: baseline.top,
      baseBottom: baseline.bottom,
      baselineViewportTop: baseline.viewportTop,
      viewportTop: vv.offsetTop,
      viewportHeight: currentHeight
    });
    page.style.setProperty('--keyboard-top-inset', `${topInset}px`);
    page.style.setProperty('--keyboard-bottom-inset', `${bottomInset}px`);
    page.classList.add('kb-active');
    page.classList.add('kb-open');
    publishKeyboardDiagnostic({
      reason: 'measure:open',
      baselineHeight: baseline.viewportHeight,
      baselineTop: baseline.viewportTop,
      topInset,
      bottomInset
    });
  }

  function clearSettleTimers() {
    for (const timer of settleTimers) clearTimer(timer);
    settleTimers.clear();
  }

  // WebKit 可能在 resize 當下先回報舊的 offsetTop/height，且 standalone PWA
  // 不一定會在數值穩定後再送事件。double-rAF 後先量一次，再於鍵盤動畫期間
  // 做三次有限的 trailing reconcile；不使用永久 polling。
  function scheduleMeasure() {
    if (destroyed) return;
    if (firstFrame) cancelFrame(firstFrame);
    if (secondFrame) cancelFrame(secondFrame);
    clearSettleTimers();
    firstFrame = requestFrame(() => {
      firstFrame = 0;
      secondFrame = requestFrame(() => {
        secondFrame = 0;
        measureNow();
      });
    });
    for (const delay of SETTLE_DELAYS_MS) {
      const timer = setTimer(() => {
        settleTimers.delete(timer);
        measureNow();
      }, delay);
      settleTimers.add(timer);
    }
  }

  function onPointerDown(event) {
    if (destroyed) return;
    const target = event.target;
    if (inputBar?.contains?.(target)) interactionActive = true;
    if (isTextControl(target) && page.contains?.(target)
      && !isKeyboardViewportOpen(baseline?.viewportHeight, vv.height)) {
      captureBaseline();
    }
  }

  function onPointerUp() {
    if (!interactionActive || destroyed) return;
    if (interactionTimer) clearTimer(interactionTimer);
    // pointerup 後的 click 必須先完成，才允許版面復原。
    interactionTimer = setTimer(() => {
      interactionTimer = 0;
      interactionActive = false;
      scheduleMeasure();
    }, 0);
  }

  function onFocusIn(event) {
    if (!isTextControl(event.target) || !page.contains?.(event.target)) return;
    focusWithin = true;
    if (blurTimer) {
      clearTimer(blurTimer);
      blurTimer = 0;
    }
    if (!baseline || !isKeyboardViewportOpen(baseline.viewportHeight, vv.height)) captureBaseline();
    page.classList.add('kb-active');
    scheduleMeasure();
  }

  function onFocusOut() {
    focusWithin = false;
    if (blurTimer) clearTimer(blurTimer);
    // blur 只排程複核；鍵盤尚未收起或期間重新 focus 時都不還原。
    blurTimer = setTimer(() => {
      blurTimer = 0;
      scheduleMeasure();
    }, BLUR_DELAY_MS);
  }

  function onOrientationChange() {
    baseline = null;
    clearGeometry();
  }

  page.addEventListener('pointerdown', onPointerDown, true);
  page.addEventListener('focusin', onFocusIn);
  page.addEventListener('focusout', onFocusOut);
  win.addEventListener('pointerup', onPointerUp, true);
  win.addEventListener('pointercancel', onPointerUp, true);
  win.addEventListener('orientationchange', onOrientationChange);
  vv.addEventListener('resize', scheduleMeasure);
  vv.addEventListener('scroll', scheduleMeasure);

  return function destroyKeyboardViewport() {
    destroyed = true;
    page.removeEventListener('pointerdown', onPointerDown, true);
    page.removeEventListener('focusin', onFocusIn);
    page.removeEventListener('focusout', onFocusOut);
    win.removeEventListener('pointerup', onPointerUp, true);
    win.removeEventListener('pointercancel', onPointerUp, true);
    win.removeEventListener('orientationchange', onOrientationChange);
    vv.removeEventListener('resize', scheduleMeasure);
    vv.removeEventListener('scroll', scheduleMeasure);
    if (firstFrame) cancelFrame(firstFrame);
    if (secondFrame) cancelFrame(secondFrame);
    clearSettleTimers();
    if (blurTimer) clearTimer(blurTimer);
    if (interactionTimer) clearTimer(interactionTimer);
    clearGeometry();
  };
}
