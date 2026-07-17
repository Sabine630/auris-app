import { APP_VERSION } from '../version.js';

const VALID_NOFX = new Set(['blur', 'caret', 'stream']);
const VALID_ISOLATION = new Set(['paint', 'layer']);
const VALID_SHELL = new Set(['absolute', 'fixed']);
const VALID_ROOT_GUARD = new Set(['guard']);
const ROOT_GUARD_THRESHOLD = 80;
const ROOT_GUARD_SETTLE_DELAYS_MS = [60, 240, 500];

function tokens(params, key) {
  return params.getAll(key)
    .flatMap(value => value.split(','))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

export function parseKeyboardDiagnostics(search = '') {
  const params = new URLSearchParams(search);
  const nofx = new Set(tokens(params, 'nofx').filter(value => VALID_NOFX.has(value)));
  const isolation = tokens(params, 'kbiso').find(value => VALID_ISOLATION.has(value)) || '';
  const shell = tokens(params, 'kbshell').find(value => VALID_SHELL.has(value)) || '';
  const rootGuard = tokens(params, 'kbroot').find(value => VALID_ROOT_GUARD.has(value)) || '';
  return {
    enabled: params.get('kbdiag') === '1',
    nofx,
    isolation,
    shell,
    rootGuard
  };
}

export function buildKeyboardDiagnosticHref(search = '', change = {}) {
  const params = new URLSearchParams(search);
  const nofx = new Set(parseKeyboardDiagnostics(search).nofx);
  params.set('kbdiag', '1');

  if (VALID_NOFX.has(change.effect)) {
    if (nofx.has(change.effect)) nofx.delete(change.effect);
    else nofx.add(change.effect);
    params.delete('nofx');
    if (nofx.size) params.set('nofx', [...nofx].join(','));
  }
  if (Object.prototype.hasOwnProperty.call(change, 'isolation')) {
    if (VALID_ISOLATION.has(change.isolation)) params.set('kbiso', change.isolation);
    else params.delete('kbiso');
  }
  if (Object.prototype.hasOwnProperty.call(change, 'shell')) {
    if (VALID_SHELL.has(change.shell)) params.set('kbshell', change.shell);
    else params.delete('kbshell');
  }
  if (Object.prototype.hasOwnProperty.call(change, 'rootGuard')) {
    if (VALID_ROOT_GUARD.has(change.rootGuard)) params.set('kbroot', change.rootGuard);
    else params.delete('kbroot');
  }
  return `?${params.toString()}`;
}

export function isStandaloneDisplay(win = window) {
  return win.navigator?.standalone === true
    || win.matchMedia?.('(display-mode: standalone)')?.matches === true;
}

function currentConfig() {
  return parseKeyboardDiagnostics(globalThis.location?.search || '');
}

export function isKeyboardEffectDisabled(effect) {
  return currentConfig().nofx.has(effect);
}

const subscribers = new Set();

export function publishKeyboardDiagnostic(snapshot) {
  for (const subscriber of subscribers) subscriber(snapshot);
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '—';
}

function isTextControl(target) {
  const tag = target?.tagName?.toUpperCase?.();
  return tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable === true;
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

export function formatKeyboardDiagnosticSnapshot(snapshot, win, doc, config, guardState = {}) {
  const vv = win.visualViewport;
  const page = doc.querySelector?.('.keyboard-page.kb-active, .keyboard-page');
  const rect = page?.getBoundingClientRect?.();
  const styles = page ? win.getComputedStyle?.(page) : null;
  const body = doc.body;
  const bodyRect = body?.getBoundingClientRect?.();
  const bodyStyles = body ? win.getComputedStyle?.(body) : null;
  const focus = doc.activeElement;
  const displayMode = isStandaloneDisplay(win) ? 'standalone' : 'browser';
  return [
    `kbdiag ${APP_VERSION} · ${displayMode}`,
    `event ${snapshot?.reason || 'install'}`,
    `vv h ${formatNumber(vv?.height)} · top ${formatNumber(vv?.offsetTop)}`,
    `window h ${formatNumber(win.innerHeight)}`,
    `scroll w ${formatNumber(win.scrollY)} · html ${formatNumber(doc.documentElement?.scrollTop)}`,
    `body pos ${bodyStyles?.position || '—'}`,
    `body rect ${formatNumber(bodyRect?.top)}…${formatNumber(bodyRect?.bottom)}`,
    `body scroll ${formatNumber(body?.scrollTop)}`,
    `page ${formatNumber(rect?.top)}…${formatNumber(rect?.bottom)}`,
    `inset t ${snapshot?.topInset ?? (styles?.getPropertyValue('--keyboard-top-inset')?.trim() || '0')} · b ${snapshot?.bottomInset ?? (styles?.getPropertyValue('--keyboard-bottom-inset')?.trim() || '0')}`,
    `baseline h ${formatNumber(snapshot?.baselineHeight)} · top ${formatNumber(snapshot?.baselineTop)}`,
    `state ${page?.classList?.contains('kb-open') ? 'open' : 'closed'} / ${page?.classList?.contains('kb-active') ? 'active' : 'idle'}`,
    `focus ${focus?.tagName?.toLowerCase?.() || 'none'}${focus?.className ? '.' + String(focus.className).trim().replace(/\s+/g, '.') : ''}`,
    `nofx ${[...config.nofx].join(',') || 'none'} · iso ${config.isolation || 'none'}`,
    `shell ${config.shell || 'original'}`,
    `root ${config.rootGuard || 'free'} · fix ${guardState.corrections || 0}`,
    `guard ${formatNumber(guardState.lastBefore)}→${formatNumber(guardState.lastAfter)} · ${guardState.active ? 'active' : 'idle'}`
  ].join('\n');
}

export function installKeyboardDiagnostics(options = {}) {
  const win = options.windowObj || window;
  const doc = options.documentObj || document;
  const config = parseKeyboardDiagnostics(options.search ?? win.location?.search ?? '');
  const root = doc.documentElement;

  for (const effect of config.nofx) root.classList.add(`diag-nofx-${effect}`);
  if (config.isolation) root.classList.add(`diag-kbiso-${config.isolation}`);
  if (config.shell) root.classList.add(`diag-kbshell-${config.shell}`);
  if (!config.enabled) return () => {};

  const panel = doc.createElement('section');
  panel.id = 'keyboard-diagnostic-panel';
  panel.setAttribute('aria-label', '鍵盤診斷面板');
  const readout = doc.createElement('pre');
  const controls = doc.createElement('div');
  controls.id = 'keyboard-diagnostic-controls';
  const specs = [
    ['caret', '游標', { effect: 'caret' }, config.nofx.has('caret')],
    ['blur', '毛玻璃', { effect: 'blur' }, config.nofx.has('blur')],
    ['stream', '串流', { effect: 'stream' }, config.nofx.has('stream')],
    ['none', '不隔離', { isolation: '' }, !config.isolation],
    ['paint', 'Paint', { isolation: 'paint' }, config.isolation === 'paint'],
    ['layer', 'Layer', { isolation: 'layer' }, config.isolation === 'layer']
  ];
  for (const [, label, change, active] of specs) {
    const link = doc.createElement('a');
    link.href = buildKeyboardDiagnosticHref(win.location?.search || '', change);
    link.textContent = label;
    if (active) link.classList.add('active');
    controls.appendChild(link);
  }
  const shellSpecs = [
    ['', 'Static', !config.shell],
    ['absolute', 'Absolute', config.shell === 'absolute'],
    ['fixed', 'Fixed', config.shell === 'fixed']
  ];
  const shellRow = doc.createElement('div');
  shellRow.id = 'keyboard-diagnostic-shell-controls';
  for (const [shell, label, active] of shellSpecs) {
    const link = doc.createElement('a');
    link.href = buildKeyboardDiagnosticHref(win.location?.search || '', { shell });
    link.textContent = label;
    if (active) link.classList.add('active');
    shellRow.appendChild(link);
  }
  controls.appendChild(shellRow);
  const rootGuardSpecs = [
    ['', 'Root自由', !config.rootGuard],
    ['guard', 'Root鎖定', config.rootGuard === 'guard']
  ];
  const rootGuardRow = doc.createElement('div');
  rootGuardRow.id = 'keyboard-diagnostic-root-controls';
  for (const [rootGuard, label, active] of rootGuardSpecs) {
    const link = doc.createElement('a');
    link.href = buildKeyboardDiagnosticHref(win.location?.search || '', { rootGuard });
    link.textContent = label;
    if (active) link.classList.add('active');
    rootGuardRow.appendChild(link);
  }
  controls.appendChild(rootGuardRow);
  const labLink = doc.createElement('a');
  labLink.href = `${import.meta.env.BASE_URL}keyboard-lab.html`;
  labLink.textContent = '\u7d14\u9801\u6e2c\u8a66';
  controls.appendChild(labLink);
  panel.append(readout, controls);
  doc.body.appendChild(panel);

  let lastSnapshot = { reason: 'install' };
  let guardState = {};
  let frame = 0;
  const render = () => {
    frame = 0;
    readout.textContent = formatKeyboardDiagnosticSnapshot(lastSnapshot, win, doc, config, guardState);
  };
  const scheduleRender = reason => {
    if (reason) lastSnapshot = { ...lastSnapshot, reason };
    if (!frame) frame = win.requestAnimationFrame(render);
  };
  const onViewport = event => scheduleRender(`vv:${event.type}`);
  const onWindowScroll = () => scheduleRender('window:scroll');
  const onFocus = event => scheduleRender(event.type);
  const onSnapshot = snapshot => {
    lastSnapshot = snapshot || lastSnapshot;
    scheduleRender();
  };
  const removeRootGuard = config.rootGuard === 'guard'
    ? installRootScrollGuard({
      windowObj: win,
      documentObj: doc,
      onStateChange: state => {
        guardState = state;
        scheduleRender(`guard:${state.reason}`);
      }
    })
    : () => {};

  subscribers.add(onSnapshot);
  win.visualViewport?.addEventListener('resize', onViewport);
  win.visualViewport?.addEventListener('scroll', onViewport);
  win.addEventListener('scroll', onWindowScroll, true);
  doc.addEventListener('focusin', onFocus, true);
  doc.addEventListener('focusout', onFocus, true);
  scheduleRender();

  return () => {
    subscribers.delete(onSnapshot);
    win.visualViewport?.removeEventListener('resize', onViewport);
    win.visualViewport?.removeEventListener('scroll', onViewport);
    win.removeEventListener('scroll', onWindowScroll, true);
    doc.removeEventListener('focusin', onFocus, true);
    doc.removeEventListener('focusout', onFocus, true);
    removeRootGuard();
    if (frame) win.cancelAnimationFrame(frame);
    panel.remove();
  };
}
