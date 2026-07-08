import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock db 層：settings 用記憶體 map、訊息數可調
const state = vi.hoisted(() => ({ settings: {}, msgCount: 0 }));
vi.mock('../db.js', () => ({
  getSetting: async (k) => (k in state.settings ? state.settings[k] : null),
  setSetting: async (k, v) => { state.settings[k] = v; },
  exportAllData: async () => ({ aurisExportVersion: 1, data: {} }),
  dbCount: async () => state.msgCount,
}));

import { shouldRemindBackup, markBackedUp, snoozeBackupReminder, REMIND_INTERVAL_DAYS } from '../backup.js';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  state.settings = {};
  state.msgCount = 0;
});

describe('shouldRemindBackup — 首次提醒（從未備份）', () => {
  it('訊息 < 50 → 不提醒', async () => {
    state.msgCount = 49;
    expect(await shouldRemindBackup()).toBeNull();
  });

  it('訊息 ≥ 50 → 首次提醒（kind: first）', async () => {
    state.msgCount = 50;
    const r = await shouldRemindBackup();
    expect(r).toEqual({ kind: 'first', days: 0 });
  });
});

describe('shouldRemindBackup — 週期提醒（已備份過）', () => {
  it('距上次備份未滿 14 天 → 不提醒', async () => {
    state.settings.last_backup_at = Date.now() - 10 * DAY;
    state.msgCount = 999; // 已備份過就不看訊息數門檻
    expect(await shouldRemindBackup()).toBeNull();
  });

  it('距上次備份滿 14 天 → 提醒（kind: overdue，帶天數）', async () => {
    state.settings.last_backup_at = Date.now() - (REMIND_INTERVAL_DAYS + 1) * DAY;
    const r = await shouldRemindBackup();
    expect(r?.kind).toBe('overdue');
    expect(r?.days).toBe(REMIND_INTERVAL_DAYS + 1);
  });

  it('markBackedUp 重置計時 → 不提醒', async () => {
    state.settings.last_backup_at = Date.now() - 30 * DAY;
    await markBackedUp();
    expect(await shouldRemindBackup()).toBeNull();
  });
});

describe('shouldRemindBackup — snooze', () => {
  it('按過「稍後」（snooze 3 天內）→ 即使逾期也不提醒', async () => {
    state.settings.last_backup_at = Date.now() - 30 * DAY;
    await snoozeBackupReminder();
    expect(await shouldRemindBackup()).toBeNull();
  });

  it('snooze 已過期 → 恢復提醒', async () => {
    state.settings.last_backup_at = Date.now() - 30 * DAY;
    state.settings.backup_snooze_until = Date.now() - 1000; // 已過期
    const r = await shouldRemindBackup();
    expect(r?.kind).toBe('overdue');
  });

  it('snooze 也擋首次提醒', async () => {
    state.msgCount = 100;
    await snoozeBackupReminder();
    expect(await shouldRemindBackup()).toBeNull();
  });
});
