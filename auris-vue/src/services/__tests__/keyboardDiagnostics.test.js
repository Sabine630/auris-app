import { describe, expect, it } from 'vitest';
import {
  buildKeyboardDiagnosticHref,
  isStandaloneDisplay,
  parseKeyboardDiagnostics
} from '../keyboardDiagnostics.js';

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
    const href = buildKeyboardDiagnosticHref('?kbdiag=1&nofx=stream&kbiso=paint', { shell: 'fixed' });
    const params = new URLSearchParams(href);

    expect(params.get('nofx')).toBe('stream');
    expect(params.get('kbiso')).toBe('paint');
    expect(params.get('kbshell')).toBe('fixed');
    expect(parseKeyboardDiagnostics(href).shell).toBe('fixed');
  });

  it('ignores unknown shell modes and restores the original shell on an empty change', () => {
    expect(parseKeyboardDiagnostics('?kbdiag=1&kbshell=nope').shell).toBe('');
    const href = buildKeyboardDiagnosticHref('?kbdiag=1&kbshell=fixed', { shell: '' });
    expect(new URLSearchParams(href).has('kbshell')).toBe(false);
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
