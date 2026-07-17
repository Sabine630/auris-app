import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  installIosStandaloneRootScrollGuard,
  installRootScrollGuard,
  isIosDevice,
  isStandaloneDisplay
} from '../keyboardRootScrollGuard.js';

const mainPath = fileURLToPath(new URL('../../main.js', import.meta.url));
const mainSource = readFileSync(mainPath, 'utf8');

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, event = {}) {
      for (const listener of listeners.get(type) || []) listener({ type, ...event });
    },
    listenerCount(type) {
      return listeners.get(type)?.size || 0;
    }
  };
}

function createEnvironment(navigator = {}) {
  const vv = Object.assign(createEventTarget(), { height: 852, offsetTop: 0 });
  const win = Object.assign(createEventTarget(), {
    navigator,
    visualViewport: vv,
    innerHeight: 852,
    scrollY: 0,
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: callback => { callback(); return 1; },
    cancelAnimationFrame: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {}
  });
  const doc = Object.assign(createEventTarget(), {
    documentElement: { scrollTop: 0 },
    body: { scrollTop: 0 },
    activeElement: { tagName: 'BODY' }
  });
  win.scrollTo = (_x, y) => {
    win.scrollY = y;
    doc.documentElement.scrollTop = y;
    doc.body.scrollTop = y;
  };
  return { vv, win, doc };
}

describe('iOS standalone eligibility', () => {
  it('installs the official guard during application startup', () => {
    expect(mainSource).toContain("import { installIosStandaloneRootScrollGuard } from './services/keyboardRootScrollGuard.js'");
    expect(mainSource).toContain('installIosStandaloneRootScrollGuard();');
  });

  it('recognizes native iOS and touch-capable iPadOS desktop user agents', () => {
    expect(isIosDevice({ navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' } })).toBe(true);
    expect(isIosDevice({ navigator: { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 } })).toBe(true);
    expect(isIosDevice({ navigator: { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 0 } })).toBe(false);
  });

  it('recognizes both iOS and standards-based standalone display signals', () => {
    expect(isStandaloneDisplay({ navigator: { standalone: true }, matchMedia: () => ({ matches: false }) })).toBe(true);
    expect(isStandaloneDisplay({ navigator: {}, matchMedia: () => ({ matches: true }) })).toBe(true);
  });

  it('does not install production listeners on desktop standalone or ordinary iOS browser tabs', () => {
    const desktop = createEnvironment({
      standalone: true,
      userAgent: 'Mozilla/5.0 (Macintosh)',
      platform: 'MacIntel',
      maxTouchPoints: 0
    });
    const desktopStates = [];
    installIosStandaloneRootScrollGuard({
      windowObj: desktop.win,
      documentObj: desktop.doc,
      onStateChange: state => desktopStates.push(state)
    });

    expect(desktop.win.listenerCount('scroll')).toBe(0);
    expect(desktopStates.at(-1)).toMatchObject({ enabled: false, reason: 'not-ios-standalone' });

    const browserTab = createEnvironment({
      standalone: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)'
    });
    installIosStandaloneRootScrollGuard({ windowObj: browserTab.win, documentObj: browserTab.doc });
    expect(browserTab.win.listenerCount('scroll')).toBe(0);
  });

  it('installs and cleans up the production guard on iOS standalone only', () => {
    const { vv, win, doc } = createEnvironment({
      standalone: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)'
    });
    const states = [];
    const cleanup = installIosStandaloneRootScrollGuard({
      windowObj: win,
      documentObj: doc,
      onStateChange: state => states.push(state)
    });

    expect(win.listenerCount('scroll')).toBe(1);
    expect(vv.listenerCount('resize')).toBe(1);
    expect(doc.listenerCount('focusin')).toBe(1);
    expect(states.at(-1)).toMatchObject({ enabled: true, active: false });

    cleanup();
    expect(win.listenerCount('scroll')).toBe(0);
    expect(vv.listenerCount('resize')).toBe(0);
    expect(doc.listenerCount('focusin')).toBe(0);
  });
});

describe('root scroll correction boundaries', () => {
  it('resets root scrolling only while a text control is focused and the keyboard viewport is open', () => {
    const { vv, win, doc } = createEnvironment();
    const states = [];
    const cleanup = installRootScrollGuard({
      windowObj: win,
      documentObj: doc,
      onStateChange: state => states.push(state)
    });

    win.scrollY = 12;
    doc.documentElement.scrollTop = 12;
    win.dispatch('scroll');
    expect(win.scrollY).toBe(12);

    const input = { tagName: 'INPUT', type: 'text' };
    doc.activeElement = input;
    doc.dispatch('focusin', { target: input });
    vv.height = 448;
    vv.offsetTop = 345;
    win.innerHeight = 448;
    win.scrollY = 404;
    doc.documentElement.scrollTop = 404;
    win.dispatch('scroll');

    expect(win.scrollY).toBe(0);
    expect(doc.documentElement.scrollTop).toBe(0);
    expect(states.at(-1)).toMatchObject({
      active: true,
      corrections: 1,
      lastBefore: 404,
      lastAfter: 0
    });
    cleanup();
  });

  it('stops correcting after focus leaves the text control', () => {
    const { vv, win, doc } = createEnvironment();
    const cleanup = installRootScrollGuard({ windowObj: win, documentObj: doc });
    const textarea = { tagName: 'TEXTAREA' };

    doc.dispatch('focusin', { target: textarea });
    vv.height = 448;
    doc.dispatch('focusout', { target: textarea });
    win.scrollY = 404;
    doc.documentElement.scrollTop = 404;
    win.dispatch('scroll');

    expect(win.scrollY).toBe(404);
    expect(doc.documentElement.scrollTop).toBe(404);
    cleanup();
  });

  it('does not treat checkbox, date, and other non-text inputs as keyboard controls', () => {
    const { vv, win, doc } = createEnvironment();
    const cleanup = installRootScrollGuard({ windowObj: win, documentObj: doc });
    const checkbox = { tagName: 'INPUT', type: 'checkbox' };

    doc.dispatch('focusin', { target: checkbox });
    vv.height = 448;
    win.innerHeight = 448;
    win.scrollY = 404;
    doc.documentElement.scrollTop = 404;
    win.dispatch('scroll');

    expect(win.scrollY).toBe(404);
    expect(doc.documentElement.scrollTop).toBe(404);

    const dateInput = { tagName: 'INPUT', type: 'date' };
    doc.dispatch('focusin', { target: dateInput });
    win.dispatch('scroll');
    expect(win.scrollY).toBe(404);
    cleanup();
  });
});
