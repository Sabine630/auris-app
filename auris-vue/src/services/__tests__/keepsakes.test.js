import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock db 層：settings 用記憶體 map
const state = vi.hoisted(() => ({ settings: {} }));
vi.mock('../db.js', () => ({
  getSetting: async (k) => (k in state.settings ? state.settings[k] : null),
  setSetting: async (k, v) => { state.settings[k] = v; },
}));

import { listKeepsakes, addKeepsake, removeKeepsake, updateKeepsakeNote } from '../keepsakes.js';

beforeEach(() => {
  state.settings = {};
});

describe('addKeepsake', () => {
  it('存快照（含說話者、備註、原訊息時間）', async () => {
    const k = await addKeepsake({
      msgId: 'msg_1', charId: 'c1', charName: '夜雨',
      role: 'assistant', content: '晚安，記得蓋被子', note: ' 他第一次說晚安 ', msgAt: 1000,
    });
    expect(k.id).toMatch(/^ks_/);
    expect(k.charName).toBe('夜雨');
    expect(k.note).toBe('他第一次說晚安'); // 備註去頭尾空白
    expect(k.msgAt).toBe(1000);
    expect(state.settings.keepsakes).toHaveLength(1);
  });

  it('空內容不收藏', async () => {
    expect(await addKeepsake({ msgId: 'm', charId: 'c1', content: '' })).toBeNull();
    expect(state.settings.keepsakes).toBeUndefined();
  });

  it('同一則訊息重複收藏 → 回 null 不重複入列', async () => {
    await addKeepsake({ msgId: 'msg_1', charId: 'c1', content: 'a' });
    const dup = await addKeepsake({ msgId: 'msg_1', charId: 'c1', content: 'a' });
    expect(dup).toBeNull();
    expect(state.settings.keepsakes).toHaveLength(1);
  });

  it('快照不存引用：來源訊息刪了收藏仍在（存的是 content 複本）', async () => {
    const src = { msgId: 'msg_1', charId: 'c1', content: '捨不得忘的話' };
    await addKeepsake(src);
    src.content = '已被改掉';
    const [k] = await listKeepsakes('c1');
    expect(k.content).toBe('捨不得忘的話');
  });
});

describe('listKeepsakes', () => {
  it('帶 charId 只回該角色、新到舊排序', async () => {
    const a = await addKeepsake({ msgId: 'm1', charId: 'c1', content: '早' });
    const b = await addKeepsake({ msgId: 'm2', charId: 'c1', content: '晚' });
    await addKeepsake({ msgId: 'm3', charId: 'c2', content: '別人的' });
    a.savedAt = 1000; // 壓時間差（mock 的 settings 存同一份引用）
    b.savedAt = 2000;

    const list = await listKeepsakes('c1');
    expect(list.map(k => k.content)).toEqual(['晚', '早']);
  });

  it('不帶 charId 回全部；沒資料回空陣列', async () => {
    expect(await listKeepsakes()).toEqual([]);
    await addKeepsake({ msgId: 'm1', charId: 'c1', content: 'x' });
    await addKeepsake({ msgId: 'm2', charId: 'c2', content: 'y' });
    expect(await listKeepsakes()).toHaveLength(2);
  });
});

describe('removeKeepsake / updateKeepsakeNote', () => {
  it('刪除指定收藏', async () => {
    const k = await addKeepsake({ msgId: 'm1', charId: 'c1', content: 'x' });
    await addKeepsake({ msgId: 'm2', charId: 'c1', content: 'y' });
    await removeKeepsake(k.id);
    const list = await listKeepsakes('c1');
    expect(list).toHaveLength(1);
    expect(list[0].content).toBe('y');
  });

  it('更新備註（去頭尾空白；找不到 id 靜默略過）', async () => {
    const k = await addKeepsake({ msgId: 'm1', charId: 'c1', content: 'x' });
    await updateKeepsakeNote(k.id, '  新備註  ');
    expect((await listKeepsakes('c1'))[0].note).toBe('新備註');
    await updateKeepsakeNote('ks_不存在', 'z'); // 不應丟錯
  });
});
