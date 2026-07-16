const KEYBOARD_THRESHOLD = 80;
const VIEWPORT_RESTORED_EPSILON = 40;
const SETTLE_DELAY_MS = 60;
const BLUR_DELAY_MS = 100;

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

// 以鍵盤升起前的頁面框為基準，只計算目前 visual viewport 遮住的上下區域。
// 不讀 window.scrollY，也不平移整個 .phone，避開 P83/P85 已知失敗路徑。
export function computeKeyboardInsets({ baseTop, baseBottom, viewportTop, viewportHeight }) {
  const top = finiteNumber(baseTop);
  const bottom = Math.max(top, finiteNumber(baseBottom, top));
  const visibleTop = finiteNumber(viewportTop);
  const visibleHeight = Math.max(0, finiteNumber(viewportHeight));
  const visibleBottom = visibleTop + visibleHeight;
  const topInset = Math.max(0, visibleTop - top);
  const bottomInset = Math.max(0, bottom - visibleBottom);
  const availableHeight = Math.max(0, bottom - top - topInset - bottomInset);

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
  let settleTimer = 0;
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
      viewportHeight: Math.max(0, finiteNumber(vv.height, win.innerHeight))
    };
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
      return;
    }

    const { topInset, bottomInset } = computeKeyboardInsets({
      baseTop: baseline.top,
      baseBottom: baseline.bottom,
      viewportTop: vv.offsetTop,
      viewportHeight: currentHeight
    });
    page.style.setProperty('--keyboard-top-inset', `${topInset}px`);
    page.style.setProperty('--keyboard-bottom-inset', `${bottomInset}px`);
    page.classList.add('kb-active');
    page.classList.add('kb-open');
  }

  // iOS PWA 偶爾在 resize 當下先回報 offsetTop=0；double-rAF 後量一次，
  // 再以短延遲做 trailing reconcile，避免永久採到過早的數值。
  function scheduleMeasure() {
    if (destroyed) return;
    if (firstFrame) cancelFrame(firstFrame);
    if (secondFrame) cancelFrame(secondFrame);
    if (settleTimer) clearTimer(settleTimer);
    firstFrame = requestFrame(() => {
      firstFrame = 0;
      secondFrame = requestFrame(() => {
        secondFrame = 0;
        measureNow();
      });
    });
    settleTimer = setTimer(() => {
      settleTimer = 0;
      measureNow();
    }, SETTLE_DELAY_MS);
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
    if (settleTimer) clearTimer(settleTimer);
    if (blurTimer) clearTimer(blurTimer);
    if (interactionTimer) clearTimer(interactionTimer);
    clearGeometry();
  };
}
