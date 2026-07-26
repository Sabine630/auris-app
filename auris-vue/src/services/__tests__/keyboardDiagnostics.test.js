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

// P132：鍵盤事件 ring buffer——實機 iOS 問題唯一能事後定層的證據來源，
// 必須不用開 kbdiag query 就常駐記錄，且隨診斷匯出一起帶走。
describe('鍵盤事件 ring buffer', () => {
  const env = (focus = { tagName: 'TEXTAREA', className: 'chat-in' }) => ({
    windowObj: {
      visualViewport: { height: 508, offsetTop: 0 },
      innerHeight: 844,
      scrollY: 0,
      location: { pathname: '/chat/char1' },
    },
    documentObj: {
      documentElement: { scrollTop: 0 },
      body: { scrollTop: 0 },
      activeElement: focus,
      querySelector: () => ({
        getBoundingClientRect: () => ({ top: 0, bottom: 508 }),
        classList: { contains: (c) => c === 'kb-open' || c === 'kb-active' },
      }),
    },
  });

  it('記錄 inset、baseline 與 viewport 數值', async () => {
    const { recordKeyboardEvent, getKeyboardEvents } = await import('../keyboardDiagnostics.js');
    const before = getKeyboardEvents().length;
    recordKeyboardEvent(
      { reason: 'measure:open', topInset: 0, bottomInset: 336, baselineHeight: 844, baselineTop: 0 },
      env(),
    );
    const events = getKeyboardEvents();
    expect(events.length).toBe(before + 1);
    const last = events.at(-1);
    expect(last).toContain('measure:open');
    expect(last).toContain('inset=0/336');
    expect(last).toContain('base=844h/0t');
    expect(last).toContain('vv=508h/0t');
    expect(last).toContain('state=open/active');
  });

  it('只記元素 tag 與 class，不碰輸入內容', async () => {
    const { recordKeyboardEvent, getKeyboardEvents } = await import('../keyboardDiagnostics.js');
    recordKeyboardEvent(
      { reason: 'focusin' },
      env({ tagName: 'TEXTAREA', className: 'chat-in', value: '這是使用者打的秘密內容' }),
    );
    const last = getKeyboardEvents().at(-1);
    expect(last).toContain('focus=textarea.chat-in');
    expect(last).not.toContain('秘密');
  });

  it('超過上限時捨棄最舊的一筆', async () => {
    const { recordKeyboardEvent, getKeyboardEvents } = await import('../keyboardDiagnostics.js');
    for (let i = 0; i < 80; i++) recordKeyboardEvent({ reason: `bulk-${i}` }, env());
    const events = getKeyboardEvents();
    expect(events.length).toBeLessThanOrEqual(60);
    expect(events.at(-1)).toContain('bulk-79');
    expect(events.some(e => e.includes('bulk-0 '))).toBe(false);
  });

  it('沒有 window／document 時安靜跳過，不影響主流程', async () => {
    const { recordKeyboardEvent, getKeyboardEvents } = await import('../keyboardDiagnostics.js');
    const before = getKeyboardEvents().length;
    expect(() => recordKeyboardEvent({ reason: 'x' }, { windowObj: null, documentObj: null })).not.toThrow();
    expect(getKeyboardEvents().length).toBe(before);
  });
});
