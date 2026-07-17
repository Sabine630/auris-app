import { describe, expect, it } from 'vitest';
import {
  buildKeyboardDiagnosticHref,
  formatKeyboardDiagnosticSnapshot,
  installRootScrollGuard,
  isStandaloneDisplay,
  parseKeyboardDiagnostics
} from '../keyboardDiagnostics.js';
import { APP_VERSION } from '../../version.js';

describe('keyboard diagnostics query switches', () => {
  it('parses combined and repeated nofx values while ignoring unknown flags', () => {
    const config = parseKeyboardDiagnostics('?kbdiag=1&nofx=caret,blur&nofx=stream,nope&kbiso=paint');

    expect(config.enabled).toBe(true);
    expect([...config.nofx]).toEqual(['caret', 'blur', 'stream']);
    expect(config.isolation).toBe('paint');
  });

  it('stays inert without an explicit diagnostic query', () => {
    expect(parseKeyboardDiagnostics('?demo=1')).toEqual({
      enabled: false,
      nofx: new Set(),
      isolation: '',
      shell: '',
      rootGuard: ''
    });
  });

  it('builds toggle links without dropping unrelated query parameters', () => {
    const href = buildKeyboardDiagnosticHref('?demo=1&kbdiag=1&nofx=caret,blur', { effect: 'caret' });
    const params = new URLSearchParams(href);

    expect(params.get('demo')).toBe('1');
    expect(params.get('kbdiag')).toBe('1');
    expect(params.get('nofx')).toBe('blur');
  });

  it('switches paint/layer isolation independently from nofx', () => {
    const href = buildKeyboardDiagnosticHref('?kbdiag=1&nofx=stream&kbiso=paint', { isolation: 'layer' });
    const params = new URLSearchParams(href);

    expect(params.get('nofx')).toBe('stream');
    expect(params.get('kbiso')).toBe('layer');
  });

  it('switches shell experiments without dropping the current diagnostic flags', () => {
    const href = buildKeyboardDiagnosticHref('?kbdiag=1&nofx=stream&kbiso=paint', { shell: 'absolute' });
    const params = new URLSearchParams(href);

    expect(params.get('nofx')).toBe('stream');
    expect(params.get('kbiso')).toBe('paint');
    expect(params.get('kbshell')).toBe('absolute');
    expect(parseKeyboardDiagnostics(href).shell).toBe('absolute');
  });

  it('ignores unknown shell modes and restores the original shell on an empty change', () => {
    expect(parseKeyboardDiagnostics('?kbdiag=1&kbshell=nope').shell).toBe('');
    const href = buildKeyboardDiagnosticHref('?kbdiag=1&kbshell=fixed', { shell: '' });
    expect(new URLSearchParams(href).has('kbshell')).toBe(false);
  });

  it('switches the root scroll guard without dropping shell and isolation flags', () => {
    const href = buildKeyboardDiagnosticHref('?kbdiag=1&kbshell=absolute&kbiso=paint', { rootGuard: 'guard' });
    const params = new URLSearchParams(href);

    expect(params.get('kbshell')).toBe('absolute');
    expect(params.get('kbiso')).toBe('paint');
    expect(params.get('kbroot')).toBe('guard');
    expect(parseKeyboardDiagnostics(href).rootGuard).toBe('guard');
  });

  it('ignores unknown root guard modes and restores free root scrolling on an empty change', () => {
    expect(parseKeyboardDiagnostics('?kbdiag=1&kbroot=nope').rootGuard).toBe('');
    const href = buildKeyboardDiagnosticHref('?kbdiag=1&kbroot=guard', { rootGuard: '' });
    expect(new URLSearchParams(href).has('kbroot')).toBe(false);
  });
});

describe('standalone display detection', () => {
  it('recognizes the iOS navigator.standalone signal', () => {
    expect(isStandaloneDisplay({
      navigator: { standalone: true },
      matchMedia: () => ({ matches: false })
    })).toBe(true);
  });

  it('falls back to the standard display-mode media query', () => {
    expect(isStandaloneDisplay({
      navigator: {},
      matchMedia: () => ({ matches: true })
    })).toBe(true);
  });
});

describe('keyboard diagnostic evidence', () => {
  it('prints the app version and computed body geometry instead of relying on query state', () => {
    const body = {
      scrollTop: 7,
      getBoundingClientRect: () => ({ top: 0, bottom: 852 })
    };
    const win = {
      visualViewport: { height: 500, offsetTop: 12 },
      innerHeight: 852,
      scrollY: 11,
      navigator: { standalone: true },
      matchMedia: () => ({ matches: false }),
      getComputedStyle: element => element === body
        ? { position: 'static' }
        : { getPropertyValue: () => '' }
    };
    const doc = {
      body,
      documentElement: { scrollTop: 13 },
      activeElement: { tagName: 'BODY', className: '' },
      querySelector: () => null
    };
    const readout = formatKeyboardDiagnosticSnapshot(
      { reason: 'test' },
      win,
      doc,
      { nofx: new Set(), isolation: '', shell: '', rootGuard: 'guard' },
      { corrections: 2, lastBefore: 404, lastAfter: 0, active: true }
    );

    expect(readout).toContain(`kbdiag ${APP_VERSION} · standalone`);
    expect(readout).toContain('scroll w 11.0 · html 13.0');
    expect(readout).toContain('body pos static');
    expect(readout).toContain('body rect 0.0…852.0');
    expect(readout).toContain('body scroll 7.0');
    expect(readout).toContain('shell original');
    expect(readout).toContain('root guard · fix 2');
    expect(readout).toContain('guard 404.0→0.0 · active');
  });
});

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

describe('root scroll guard', () => {
  it('resets iOS root scrolling only while a text control is focused and the keyboard viewport is open', () => {
    const vv = Object.assign(createEventTarget(), { height: 852, offsetTop: 0 });
    const win = Object.assign(createEventTarget(), {
      visualViewport: vv,
      innerHeight: 852,
      scrollY: 0,
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
    const states = [];
    win.scrollTo = (_x, y) => {
      win.scrollY = y;
      doc.documentElement.scrollTop = y;
    };
    const cleanup = installRootScrollGuard({
      windowObj: win,
      documentObj: doc,
      onStateChange: state => states.push(state)
    });

    win.scrollY = 12;
    doc.documentElement.scrollTop = 12;
    win.dispatch('scroll');
    expect(win.scrollY).toBe(12);

    const input = { tagName: 'INPUT' };
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
    expect(win.listenerCount('scroll')).toBe(0);
    expect(vv.listenerCount('resize')).toBe(0);
    expect(doc.listenerCount('focusin')).toBe(0);
  });

  it('stops correcting after focus leaves the text control', () => {
    const vv = Object.assign(createEventTarget(), { height: 852, offsetTop: 0 });
    const win = Object.assign(createEventTarget(), {
      visualViewport: vv,
      innerHeight: 852,
      scrollY: 0,
      requestAnimationFrame: callback => { callback(); return 1; },
      cancelAnimationFrame: () => {},
      setTimeout: () => 1,
      clearTimeout: () => {},
      scrollTo: () => {}
    });
    const doc = Object.assign(createEventTarget(), {
      documentElement: { scrollTop: 0 },
      body: { scrollTop: 0 },
      activeElement: { tagName: 'BODY' }
    });
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
});
