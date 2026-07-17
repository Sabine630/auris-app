const ROOT_GUARD_THRESHOLD = 80;
const ROOT_GUARD_SETTLE_DELAYS_MS = [60, 240, 500];
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'number']);

const subscribers = new Set();
let latestState = {
  enabled: false,
  active: false,
  corrections: 0,
  lastBefore: 0,
  lastAfter: 0,
  reason: 'not-installed',
  baselineHeight: 0
};

export function isStandaloneDisplay(win = window) {
  return win.navigator?.standalone === true
    || win.matchMedia?.('(display-mode: standalone)')?.matches === true;
}

export function isIosDevice(win = window) {
  const navigator = win.navigator || {};
  const userAgent = String(navigator.userAgent || '');
  const platform = String(navigator.platform || '');
  return /iPhone|iPad|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1);
}

function publishState(state) {
  latestState = { ...latestState, ...state };
  for (const subscriber of subscribers) subscriber(latestState);
}

export function getRootScrollGuardState() {
  return latestState;
}

export function subscribeRootScrollGuardState(subscriber) {
  subscribers.add(subscriber);
  subscriber(latestState);
  return () => subscribers.delete(subscriber);
}

function isTextControl(target) {
  const tag = target?.tagName?.toUpperCase?.();
  if (tag === 'TEXTAREA' || target?.isContentEditable === true) return true;
  if (tag !== 'INPUT') return false;
  return TEXT_INPUT_TYPES.has(String(target.type || 'text').toLowerCase());
}

function rootScrollPosition(win, doc) {
  return Math.max(
    Math.abs(Number(win.scrollY) || 0),
    Math.abs(Number(doc.documentElement?.scrollTop) || 0),
    Math.abs(Number(doc.body?.scrollTop) || 0)
  );
}

export function installRootScrollGuard(options = {}) {
  const win = options.windowObj || window;
  const doc = options.documentObj || document;
  const vv = options.visualViewport || win.visualViewport;
  if (!vv) return () => {};

  const requestFrame = options.requestFrame || win.requestAnimationFrame.bind(win);
  const cancelFrame = options.cancelFrame || win.cancelAnimationFrame.bind(win);
  const setTimer = options.setTimer || win.setTimeout.bind(win);
  const clearTimer = options.clearTimer || win.clearTimeout.bind(win);
  const onStateChange = options.onStateChange || (() => {});
  let baselineHeight = Math.max(Number(vv.height) || 0, Number(win.innerHeight) || 0);
  let focused = isTextControl(doc.activeElement);
  let destroyed = false;
  let frame = 0;
  let corrections = 0;
  let lastBefore = 0;
  let lastAfter = 0;
  let lastReason = 'install';
  const settleTimers = new Set();

  const keyboardOpen = () => baselineHeight - (Number(vv.height) || baselineHeight) > ROOT_GUARD_THRESHOLD;
  const publish = () => onStateChange({
    enabled: true,
    active: focused && keyboardOpen(),
    corrections,
    lastBefore,
    lastAfter,
    reason: lastReason,
    baselineHeight
  });

  function correctNow(reason) {
    if (destroyed || !focused || !keyboardOpen()) return false;
    const before = rootScrollPosition(win, doc);
    lastReason = reason;
    if (before <= 0.5) {
      lastAfter = before;
      publish();
      return false;
    }

    lastBefore = before;
    if (doc.documentElement) doc.documentElement.scrollTop = 0;
    if (doc.body) doc.body.scrollTop = 0;
    win.scrollTo?.(0, 0);
    lastAfter = rootScrollPosition(win, doc);
    corrections += 1;
    publish();
    return true;
  }

  function scheduleCorrection(reason) {
    if (destroyed || !focused || !keyboardOpen()) return;
    correctNow(reason);
    if (frame) cancelFrame(frame);
    frame = requestFrame(() => {
      frame = 0;
      correctNow(`${reason}:raf`);
    });
  }

  function clearSettleTimers() {
    for (const timer of settleTimers) clearTimer(timer);
    settleTimers.clear();
  }

  function scheduleSettledCorrections(reason) {
    scheduleCorrection(reason);
    clearSettleTimers();
    for (const delay of ROOT_GUARD_SETTLE_DELAYS_MS) {
      const timer = setTimer(() => {
        settleTimers.delete(timer);
        scheduleCorrection(`${reason}:${delay}`);
      }, delay);
      settleTimers.add(timer);
    }
  }

  function updateRestingBaseline() {
    if (focused && keyboardOpen()) return;
    baselineHeight = Math.max(baselineHeight, Number(vv.height) || 0, Number(win.innerHeight) || 0);
  }

  function onFocusIn(event) {
    if (!isTextControl(event.target)) return;
    focused = true;
    updateRestingBaseline();
    scheduleSettledCorrections('focusin');
    publish();
  }

  function onFocusOut() {
    focused = false;
    clearSettleTimers();
    publish();
  }

  function onViewport(event) {
    updateRestingBaseline();
    scheduleSettledCorrections(`vv:${event.type}`);
  }

  function onWindowScroll() {
    scheduleCorrection('window:scroll');
  }

  function onOrientationChange() {
    baselineHeight = Math.max(Number(vv.height) || 0, Number(win.innerHeight) || 0);
    lastReason = 'orientationchange';
    publish();
  }

  vv.addEventListener('resize', onViewport);
  vv.addEventListener('scroll', onViewport);
  win.addEventListener('scroll', onWindowScroll, true);
  win.addEventListener('orientationchange', onOrientationChange);
  doc.addEventListener('focusin', onFocusIn, true);
  doc.addEventListener('focusout', onFocusOut, true);
  publish();

  return () => {
    destroyed = true;
    vv.removeEventListener('resize', onViewport);
    vv.removeEventListener('scroll', onViewport);
    win.removeEventListener('scroll', onWindowScroll, true);
    win.removeEventListener('orientationchange', onOrientationChange);
    doc.removeEventListener('focusin', onFocusIn, true);
    doc.removeEventListener('focusout', onFocusOut, true);
    if (frame) cancelFrame(frame);
    clearSettleTimers();
  };
}

export function installIosStandaloneRootScrollGuard(options = {}) {
  const win = options.windowObj || window;
  const doc = options.documentObj || document;
  const vv = options.visualViewport || win.visualViewport;
  const onStateChange = options.onStateChange || (() => {});

  if (!isIosDevice(win) || !isStandaloneDisplay(win) || !vv) {
    const state = {
      enabled: false,
      active: false,
      corrections: 0,
      lastBefore: 0,
      lastAfter: 0,
      reason: 'not-ios-standalone',
      baselineHeight: Math.max(Number(vv?.height) || 0, Number(win.innerHeight) || 0)
    };
    publishState(state);
    onStateChange(state);
    return () => {};
  }

  const remove = installRootScrollGuard({
    ...options,
    windowObj: win,
    documentObj: doc,
    visualViewport: vv,
    onStateChange: state => {
      publishState(state);
      onStateChange(state);
    }
  });

  return () => {
    remove();
    publishState({ enabled: false, active: false, reason: 'destroy' });
  };
}
