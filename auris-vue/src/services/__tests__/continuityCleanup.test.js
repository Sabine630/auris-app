import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  rows: [],
  setting: null,
  puts: [],
  deletes: [],
  failPut: false,
}));

vi.mock('../db.js', () => ({
  dbAll: vi.fn(async () => structuredClone(state.rows)),
  dbPut: vi.fn(async (_store, row) => {
    if (state.failPut) throw new Error('write failed');
    state.puts.push(structuredClone(row));
  }),
  dbDel: vi.fn(async (_store, id) => { state.deletes.push(id); }),
  getSetting: vi.fn(async () => state.setting),
  setSetting: vi.fn(async (_key, value) => { state.setting = value; }),
}));

import { runContinuityCleanup } from '../continuityCleanup.js';

const DAY = 86400000;
const NOW = new Date(2026, 6, 25, 12, 0).getTime();

beforeEach(() => {
  state.rows = [];
  state.setting = null;
  state.puts = [];
  state.deletes = [];
  state.failPut = false;
});

describe('runContinuityCleanup', () => {
  it('同輪處理逾期、刪除與舊資料 closedAt 回填，成功後才記每日 key', async () => {
    state.rows = [
      { id: 'expire', status: 'planned', followUpAfter: NOW - 15 * DAY, updatedAt: NOW },
      { id: 'purge', status: 'resolved', closedAt: NOW - 31 * DAY, updatedAt: NOW },
      { id: 'legacy', status: 'cancelled', closedAt: null, updatedAt: NOW - 10 * DAY },
    ];

    await expect(runContinuityCleanup(NOW)).resolves.toEqual({
      skipped: false, expired: 1, purged: 1, backfilled: 1,
    });
    expect(state.puts.find(x => x.id === 'expire')).toMatchObject({
      status: 'expired', closedAt: NOW,
    });
    expect(state.puts.find(x => x.id === 'legacy').closedAt).toBe(NOW - 10 * DAY);
    expect(state.deletes).toEqual(['purge']);
    expect(state.setting).toBe('2026-07-25');
  });

  it('同日已完成則略過', async () => {
    state.setting = '2026-07-25';
    await expect(runContinuityCleanup(NOW)).resolves.toMatchObject({ skipped: true });
    expect(state.puts).toEqual([]);
  });

  it('中途失敗不寫每日 key，保留下次重試機會', async () => {
    state.rows = [{ id: 'expire', status: 'planned', followUpAfter: NOW - 15 * DAY }];
    state.failPut = true;
    await expect(runContinuityCleanup(NOW)).rejects.toThrow('write failed');
    expect(state.setting).toBeNull();
  });
});
