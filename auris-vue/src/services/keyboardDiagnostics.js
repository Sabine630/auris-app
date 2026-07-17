const VALID_NOFX = new Set(['blur', 'caret', 'stream']);
const VALID_ISOLATION = new Set(['paint', 'layer']);
const VALID_SHELL = new Set(['body', 'page', 'clip', 'flow']);

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
  return {
    enabled: params.get('kbdiag') === '1',
    nofx,
    isolation,
    shell
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

function formatSnapshot(snapshot, win, doc, config) {
  const vv = win.visualViewport;
  const page = doc.querySelector?.('.keyboard-page.kb-active, .keyboard-page');
  const rect = page?.getBoundingClientRect?.();
  const styles = page ? win.getComputedStyle?.(page) : null;
  const focus = doc.activeElement;
  const displayMode = isStandaloneDisplay(win) ? 'standalone' : 'browser';
  return [
    `kbdiag · ${displayMode}`,
    `event ${snapshot?.reason || 'install'}`,
    `vv h ${formatNumber(vv?.height)} · top ${formatNumber(vv?.offsetTop)}`,
    `window h ${formatNumber(win.innerHeight)}`,
    `page ${formatNumber(rect?.top)}…${formatNumber(rect?.bottom)}`,
    `inset t ${snapshot?.topInset ?? (styles?.getPropertyValue('--keyboard-top-inset')?.trim() || '0')} · b ${snapshot?.bottomInset ?? (styles?.getPropertyValue('--keyboard-bottom-inset')?.trim() || '0')}`,
    `baseline h ${formatNumber(snapshot?.baselineHeight)} · top ${formatNumber(snapshot?.baselineTop)}`,
    `state ${page?.classList?.contains('kb-open') ? 'open' : 'closed'} / ${page?.classList?.contains('kb-active') ? 'active' : 'idle'}`,
    `focus ${focus?.tagName?.toLowerCase?.() || 'none'}${focus?.className ? '.' + String(focus.className).trim().replace(/\s+/g, '.') : ''}`,
    `nofx ${[...config.nofx].join(',') || 'none'} · iso ${config.isolation || 'none'}`,
    `shell ${config.shell || 'original'}`
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
    ['', '\u539f\u6bbc', !config.shell],
    ['body', 'Body', config.shell === 'body'],
    ['page', 'Page', config.shell === 'page'],
    ['clip', 'Clip', config.shell === 'clip'],
    ['flow', 'Flow', config.shell === 'flow']
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
  const labLink = doc.createElement('a');
  labLink.href = `${import.meta.env.BASE_URL}keyboard-lab.html`;
  labLink.textContent = '\u7d14\u9801\u6e2c\u8a66';
  controls.appendChild(labLink);
  panel.append(readout, controls);
  doc.body.appendChild(panel);

  let lastSnapshot = { reason: 'install' };
  let frame = 0;
  const render = () => {
    frame = 0;
    readout.textContent = formatSnapshot(lastSnapshot, win, doc, config);
  };
  const scheduleRender = reason => {
    if (reason) lastSnapshot = { ...lastSnapshot, reason };
    if (!frame) frame = win.requestAnimationFrame(render);
  };
  const onViewport = event => scheduleRender(`vv:${event.type}`);
  const onFocus = event => scheduleRender(event.type);
  const onSnapshot = snapshot => {
    lastSnapshot = snapshot || lastSnapshot;
    scheduleRender();
  };

  subscribers.add(onSnapshot);
  win.visualViewport?.addEventListener('resize', onViewport);
  win.visualViewport?.addEventListener('scroll', onViewport);
  doc.addEventListener('focusin', onFocus, true);
  doc.addEventListener('focusout', onFocus, true);
  scheduleRender();

  return () => {
    subscribers.delete(onSnapshot);
    win.visualViewport?.removeEventListener('resize', onViewport);
    win.visualViewport?.removeEventListener('scroll', onViewport);
    doc.removeEventListener('focusin', onFocus, true);
    doc.removeEventListener('focusout', onFocus, true);
    if (frame) win.cancelAnimationFrame(frame);
    panel.remove();
  };
}
