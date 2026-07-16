import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db.js', () => ({
  getSetting: async () => null,
  dbCount: async () => 0,
}));

import { logError, getErrors } from '../diag.js';
import { APP_VERSION } from '../../version.js';

// node 環境沒有 localStorage：給一個記憶體版 stub
const store = new Map();
beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

describe('logError — 錯誤 ring buffer', () => {
  it('記一筆：含時間、當時版號、來源、訊息', () => {
    logError('llm', 'anthropic/claude-x：HTTP 429');
    const list = getErrors();
    expect(list).toHaveLength(1);
    expect(list[0].v).toBe(APP_VERSION);
    expect(list[0].src).toBe('llm');
    expect(list[0].msg).toContain('HTTP 429');
    expect(list[0].t).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('超過 30 筆只留最新 30 筆（ring buffer）', () => {
    for (let i = 1; i <= 35; i++) logError('window', `err ${i}`);
    const list = getErrors();
    expect(list).toHaveLength(30);
    expect(list[0].msg).toBe('err 6');
    expect(list[29].msg).toBe('err 35');
  });

  it('過長訊息截到 300 字元', () => {
    logError('promise', 'x'.repeat(500));
    expect(getErrors()[0].msg).toHaveLength(300);
  });

  it('undefined／物件訊息不炸、轉成字串', () => {
    logError('window', undefined);
    logError('window', { weird: true });
    const list = getErrors();
    expect(list).toHaveLength(2);
    expect(typeof list[0].msg).toBe('string');
  });
});

describe('getErrors — 容錯', () => {
  it('localStorage 內容損毀 → 回空陣列', () => {
    store.set('auris_diag_errors', '{not json');
    expect(getErrors()).toEqual([]);
  });

  it('內容不是陣列 → 回空陣列', () => {
    store.set('auris_diag_errors', '{"a":1}');
    expect(getErrors()).toEqual([]);
  });

  it('localStorage 不存在（隱私模式炸掉）→ logError 不拋錯', () => {
    delete globalThis.localStorage;
    expect(() => logError('window', 'boom')).not.toThrow();
    expect(getErrors()).toEqual([]);
  });
});
