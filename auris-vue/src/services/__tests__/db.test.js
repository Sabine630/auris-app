// ── exportAllData / importAllData 測試（2026-07-15 資安審查高優先修復）────────
// 跑在 fake-indexeddb 上（真實 IndexedDB 語意），驗證：
// 1. 匯出排除 API 設定  2. 缺必填 store 拒絕匯入  3. 匯入忽略備份內 API 設定
// 4. 單一 transaction 原子性（失敗整批回滾）  5. 外部圖片 URL 過濾
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

vi.mock('../demoMode.js', () => ({ isDemo: () => false }));

import {
  initDB, dbPut, dbAll, getSetting, setSetting,
  exportAllData, importAllData, importCharacterData, stripUnsafeImage,
} from '../db.js';
import { seedDemoIfEmpty } from '../demoData.js';

const REQUIRED_STORES = ['characters', 'messages', 'memories', 'moments', 'diary', 'dreams', 'worlds', 'groups', 'group_messages', 'notifications', 'settings'];
const PNG_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

// 產生一份合法的空備份（含全部必填 store）
function makeBackup(overrides = {}) {
  const data = {};
  for (const s of REQUIRED_STORES) data[s] = [];
  return { aurisExportVersion: 1, exportDate: Date.now(), data: { ...data, ...overrides } };
}

beforeEach(async () => {
  // 每個測試用全新的 IndexedDB 實體，互不污染
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
  await initDB();
});

describe('stripUnsafeImage', () => {
  it('外部 URL 圖片 → 移除 image 欄位（保留其他欄位）', () => {
    const r = stripUnsafeImage({ id: 'm1', content: 'hi', image: 'https://attacker.example/pixel.png' });
    expect(r.image).toBeUndefined();
    expect(r.content).toBe('hi');
  });

  it('data:image/ 內嵌圖 → 保留', () => {
    const r = stripUnsafeImage({ id: 'm1', image: 'data:image/jpeg;base64,/9j/4AAQ' });
    expect(r.image).toBe('data:image/jpeg;base64,/9j/4AAQ');
  });

  it('無 image 欄位 → 原樣返回', () => {
    const rec = { id: 'm1', content: 'hi' };
    expect(stripUnsafeImage(rec)).toBe(rec);
  });
});

describe('exportAllData', () => {
  it('排除全部 API 設定（key/provider/base/model），保留其他設定', async () => {
    await setSetting('api_key', 'sk-demo-secret');
    await setSetting('api_provider', 'openai');
    await setSetting('api_base', 'https://api.openai.com/v1');
    await setSetting('api_model', 'gpt-4o-mini');
    await setSetting('theme', 'cream');

    const out = await exportAllData();
    const keys = out.data.settings.map(r => r.key);
    expect(keys).toEqual(['theme']);
    expect(out.aurisExportVersion).toBe(1);
  });
});

describe('importAllData — 格式驗證', () => {
  it('缺必填 store（messages）→ 拒絕，現有資料不動', async () => {
    await dbPut('messages', { id: 'm1', charId: 'c1', content: '既有訊息' });
    const backup = makeBackup();
    delete backup.data.messages;

    await expect(importAllData(backup)).rejects.toThrow(/缺少「messages」/);
    const msgs = await dbAll('messages');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('既有訊息');
  });

  it('缺選填 store（notes，備份功能之後才新增）→ 接受，該 store 清空', async () => {
    await dbPut('notes', { id: 'n1', charId: 'c1' });
    await expect(importAllData(makeBackup())).resolves.toBeUndefined();
    expect(await dbAll('notes')).toHaveLength(0);
  });

  it('store 內含無效資料（缺 id）→ 拒絕，現有資料不動', async () => {
    await dbPut('characters', { id: 'c1', name: '既有角色' });
    const backup = makeBackup({ characters: [{ name: '沒有 id' }] });

    await expect(importAllData(backup)).rejects.toThrow(/缺少有效的「id」/);
    expect(await dbAll('characters')).toHaveLength(1);
  });

  it('版本欄位錯誤 → 拒絕', async () => {
    await expect(importAllData({ aurisExportVersion: 2, data: {} })).rejects.toThrow(/無效的備份/);
  });
});

describe('importAllData — API 設定屬本機、備份內一律忽略', () => {
  it('備份夾帶 api_base/api_key → 忽略；本機原有 key 保留', async () => {
    await setSetting('api_key', 'local-real-key');
    const backup = makeBackup({
      settings: [
        { key: 'api_base', value: 'https://evil.example/v1' },
        { key: 'api_key', value: 'attacker-planted' },
        { key: 'theme', value: 'night' },
      ],
    });

    await importAllData(backup);
    expect(await getSetting('api_key')).toBe('local-real-key');   // 本機 key 沒被蓋掉
    expect(await getSetting('api_base')).toBeNull();               // 惡意 endpoint 沒被寫入
    expect(await getSetting('theme')).toBe('night');               // 一般設定正常還原
  });

  it('本機四項 API 設定在還原後全數保留', async () => {
    await setSetting('api_key', 'k');
    await setSetting('api_provider', 'anthropic');
    await setSetting('api_base', 'https://api.anthropic.com/v1');
    await setSetting('api_model', 'claude-sonnet-5');

    await importAllData(makeBackup());
    expect(await getSetting('api_key')).toBe('k');
    expect(await getSetting('api_provider')).toBe('anthropic');
    expect(await getSetting('api_base')).toBe('https://api.anthropic.com/v1');
    expect(await getSetting('api_model')).toBe('claude-sonnet-5');
  });
});

describe('importAllData — 原子性（單一 transaction）', () => {
  it('寫入中途失敗 → 整批回滾，資料庫維持匯入前狀態', async () => {
    await dbPut('characters', { id: 'c1', name: '既有角色' });
    await dbPut('messages', { id: 'm1', charId: 'c1', content: '既有訊息' });
    await setSetting('api_key', 'local-key');

    // Promise 無法被 IndexedDB structured-clone；核心欄位格式合法，讓錯誤確實發生在 transaction 內。
    const backup = makeBackup({
      characters: [{ id: 'c_new', name: '新角色' }],
      messages: [{ id: 'm_new', charId: 'c_new', role: 'assistant', content: '壞訊息', uncloneable: Promise.resolve('x') }],
    });

    await expect(importAllData(backup)).rejects.toThrow();
    // 清空與部分寫入必須全部回滾
    const chars = await dbAll('characters');
    expect(chars).toHaveLength(1);
    expect(chars[0].name).toBe('既有角色');
    const msgs = await dbAll('messages');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('既有訊息');
    expect(await getSetting('api_key')).toBe('local-key');
  });

  it('成功匯入 → 舊資料完全替換為備份內容', async () => {
    await dbPut('characters', { id: 'c_old', name: '舊角色' });
    await dbPut('messages', { id: 'm_old', charId: 'c_old', content: '舊訊息' });

    const backup = makeBackup({
      characters: [{ id: 'c_new', name: '新角色' }],
      messages: [
        { id: 'm_new', charId: 'c_new', role: 'assistant', content: '新訊息' },
        { id: 'm_img', charId: 'c_new', role: 'user', content: '圖', image: 'https://tracker.example/p.gif' },
      ],
    });

    await importAllData(backup);
    const chars = await dbAll('characters');
    expect(chars.map(c => c.id)).toEqual(['c_new']);
    const msgs = await dbAll('messages');
    expect(msgs).toHaveLength(2);
    // 匯入的外部圖片 URL 被過濾
    expect(msgs.find(m => m.id === 'm_img').image).toBeUndefined();
  });
});

describe('匯出 → 匯入 round-trip', () => {
  it('資料完整還原，API 設定不進備份也不丟失', async () => {
    await dbPut('characters', { id: 'c1', name: '小奧' });
    await dbPut('messages', { id: 'm1', charId: 'c1', role: 'assistant', content: '哈囉', image: PNG_DATA });
    await dbPut('worlds', { id: 'w1', name: '世界' });
    await setSetting('theme', 'cream');
    await setSetting('api_key', 'sk-demo-key');

    const backup = await exportAllData();
    // 模擬換一台裝置：清掉再匯入
    await dbPut('messages', { id: 'm_extra', charId: 'c1', content: '備份後才出現的訊息' });
    await importAllData(backup);

    const msgs = await dbAll('messages');
    expect(msgs.map(m => m.id)).toEqual(['m1']);           // 還原到備份快照
    expect(msgs[0].image).toBe(PNG_DATA); // 合法內嵌圖保留
    expect((await dbAll('characters'))[0].name).toBe('小奧');
    expect((await dbAll('worlds'))[0].name).toBe('世界');
    expect(await getSetting('theme')).toBe('cream');
    expect(await getSetting('api_key')).toBe('sk-demo-key'); // 本機 key 沿用
  });

  it('目前教學沙盒的完整資料形狀可通過 P127 schema 並整包還原', async () => {
    await seedDemoIfEmpty();
    const backup = await exportAllData();

    await expect(importAllData(backup)).resolves.toBeUndefined();
    expect((await dbAll('characters')).map(c => c.name)).toContain('夜雨');
    expect(await dbAll('messages')).not.toHaveLength(0);
    expect(await dbAll('moments')).not.toHaveLength(0);
    expect(await getSetting('me_settings')).toMatchObject({ name: '小晴' });
  });
});

describe('importCharacterData — 單角色匯入', () => {
  it('訊息外部圖片被過濾、charId 重新對應', async () => {
    const newId = await importCharacterData({
      aurisCharExportVersion: 1,
      character: { id: 'c_src', name: '分享角色' },
      messages: [
        { id: 'm1', charId: 'c_src', role: 'assistant', content: '安全圖', image: PNG_DATA },
        { id: 'm2', charId: 'c_src', role: 'user', content: '追蹤圖', image: 'https://evil.example/pixel' },
      ],
    });

    const msgs = (await dbAll('messages')).sort((a, b) => a.content.localeCompare(b.content));
    expect(msgs).toHaveLength(2);
    for (const m of msgs) expect(m.charId).toBe(newId);
    expect(msgs.find(m => m.content === '安全圖').image).toBe(PNG_DATA);
    expect(msgs.find(m => m.content === '追蹤圖').image).toBeUndefined();
  });
});
