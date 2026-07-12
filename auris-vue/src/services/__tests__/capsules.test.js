import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock db 層：settings 用記憶體 map（比照 keepsakes.test.js）
const state = vi.hoisted(() => ({ settings: {} }));
vi.mock('../db.js', () => ({
  getSetting: async (k) => (k in state.settings ? state.settings[k] : null),
  setSetting: async (k, v) => { state.settings[k] = v; },
}));

import {
  listCapsules, buryCapsule, dueCapsules, markDueResult, openCapsule, removeCapsule,
  MIN_OPEN_DELAY_MS,
} from '../capsules.js';

const DAY = 86400000;
const in90d = () => Date.now() + 90 * DAY;

beforeEach(() => {
  state.settings = {};
});

describe('buryCapsule', () => {
  it('存快照（我的信＋角色的信＋開啟日）', async () => {
    const cap = await buryCapsule({ charId: 'c1', charName: '夜雨', text: ' 想去看海 ', openAt: in90d(), aiLetter: '我也想' });
    expect(cap.id).toMatch(/^cap_/);
    expect(cap.mine).toBe('想去看海'); // 去頭尾空白
    expect(cap.aiLetter).toBe('我也想');
    expect(cap.opened).toBe(false);
    expect(cap.dueNotified).toBe(false);
    expect(state.settings.capsules).toHaveLength(1);
  });

  it('空內容不封存', async () => {
    expect(await buryCapsule({ charId: 'c1', text: '  ', openAt: in90d() })).toBeNull();
    expect(state.settings.capsules).toBeUndefined();
  });

  it('開啟日不足 30 天不封存（最後防線）', async () => {
    expect(await buryCapsule({ charId: 'c1', text: 'x', openAt: Date.now() + 29 * DAY })).toBeNull();
    expect(await buryCapsule({ charId: 'c1', text: 'x', openAt: 0 })).toBeNull();
    // 剛好 30 天可以
    expect(await buryCapsule({ charId: 'c1', text: 'x', openAt: Date.now() + MIN_OPEN_DELAY_MS + 1000 })).not.toBeNull();
  });
});

describe('listCapsules', () => {
  it('帶 charId 只回該角色；未拆在前（開啟日近→遠）、已拆在後', async () => {
    const a = await buryCapsule({ charId: 'c1', text: '遠的', openAt: Date.now() + 200 * DAY });
    const b = await buryCapsule({ charId: 'c1', text: '近的', openAt: Date.now() + 40 * DAY });
    await buryCapsule({ charId: 'c2', text: '別人的', openAt: in90d() });
    const c = await buryCapsule({ charId: 'c1', text: '已拆的', openAt: in90d() });
    c.opened = true; c.openedAt = Date.now(); // mock 存同一份引用，直接改

    const list = await listCapsules('c1');
    expect(list.map(k => k.mine)).toEqual(['近的', '遠的', '已拆的']);
    expect(list).toHaveLength(3);
    void a; void b;
  });
});

describe('dueCapsules / markDueResult', () => {
  it('只回「到期＋未拆＋未通知」的膠囊', async () => {
    const due = await buryCapsule({ charId: 'c1', text: '到了', openAt: Date.now() + 40 * DAY });
    await buryCapsule({ charId: 'c1', text: '還沒到', openAt: Date.now() + 200 * DAY });
    due.openAt = Date.now() - 1000; // 壓成已到期

    const list = await dueCapsules();
    expect(list.map(k => k.mine)).toEqual(['到了']);
  });

  it('成功記 dueNotified；失敗累計 3 次後放棄（視同已通知）', async () => {
    const cap = await buryCapsule({ charId: 'c1', text: 'x', openAt: in90d() });
    await markDueResult(cap.id, false);
    expect(state.settings.capsules[0].dueNotified).toBe(false);
    await markDueResult(cap.id, false);
    await markDueResult(cap.id, false);
    expect(state.settings.capsules[0].dueNotified).toBe(true); // 3 次放棄
    expect(state.settings.capsules[0].dueTries).toBe(3);

    const cap2 = await buryCapsule({ charId: 'c1', text: 'y', openAt: in90d() });
    await markDueResult(cap2.id, true);
    expect(state.settings.capsules[1].dueNotified).toBe(true); // 一次成功即記
  });
});

describe('openCapsule', () => {
  it('未到期不可拆（最後防線）', async () => {
    const cap = await buryCapsule({ charId: 'c1', text: 'x', openAt: in90d() });
    expect(await openCapsule(cap.id)).toBeNull();
    expect(state.settings.capsules[0].opened).toBe(false);
  });

  it('到期可拆：標記 opened＋openedAt；重複拆回 null', async () => {
    const cap = await buryCapsule({ charId: 'c1', text: 'x', openAt: in90d() });
    cap.openAt = Date.now() - 1000;
    const opened = await openCapsule(cap.id);
    expect(opened.opened).toBe(true);
    expect(opened.openedAt).toBeGreaterThan(0);
    expect(await openCapsule(cap.id)).toBeNull();
  });
});

describe('removeCapsule', () => {
  it('刪除指定膠囊', async () => {
    const cap = await buryCapsule({ charId: 'c1', text: 'x', openAt: in90d() });
    await buryCapsule({ charId: 'c1', text: 'y', openAt: in90d() });
    await removeCapsule(cap.id);
    const list = await listCapsules('c1');
    expect(list).toHaveLength(1);
    expect(list[0].mine).toBe('y');
  });
});
