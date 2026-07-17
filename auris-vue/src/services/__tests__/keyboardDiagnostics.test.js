import { describe, expect, it } from 'vitest';
import {
  buildKeyboardDiagnosticHref,
  formatKeyboardDiagnosticSnapshot,
  parseKeyboardDiagnostics
} from '../keyboardDiagnostics.js';
import { isStandaloneDisplay } from '../keyboardRootScrollGuard.js';
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
      shell: ''
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

  it('drops the retired P123 kbroot experiment from all diagnostic links', () => {
    const href = buildKeyboardDiagnosticHref('?kbdiag=1&kbroot=guard&demo=1', { effect: 'caret' });
    const params = new URLSearchParams(href);

    expect(params.has('kbroot')).toBe(false);
    expect(params.get('demo')).toBe('1');
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
      { nofx: new Set(), isolation: '', shell: '' },
      { enabled: true, corrections: 2, lastBefore: 404, lastAfter: 0, active: true }
    );

    expect(readout).toContain(`kbdiag ${APP_VERSION} · standalone`);
    expect(readout).toContain('scroll w 11.0 · html 13.0');
    expect(readout).toContain('body pos static');
    expect(readout).toContain('body rect 0.0…852.0');
    expect(readout).toContain('body scroll 7.0');
    expect(readout).toContain('shell original');
    expect(readout).toContain('root official · fix 2');
    expect(readout).toContain('guard 404.0→0.0 · active');
  });
});
