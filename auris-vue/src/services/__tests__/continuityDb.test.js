// ── P131 批次 1：DB v8、備份相容、單角色重映射、刪除與清除連動 ────────────────
// 跑在 fake-indexeddb 上（真實 IndexedDB 語意）。重點驗證：
// 1. 全新安裝直接開 v8 與 v7→v8 升級兩條路徑都建得出 store／index，且不動既有資料
// 2. 舊備份（無 continuity_threads）仍可匯入；新備份 round-trip 保留全部欄位與狀態
// 3. 單角色匯入重映射 charId 與 sourceMsgId，斷鏈時降為 null 而非丟資料
// 4. 刪角色不留孤兒；清聊天預設保留 threads，勾選才清，且兩入口既有範圍不變
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

vi.mock('../demoMode.js', () => ({ isDemo: () => false }));

import {
  initDB, dbPut, dbAll, dbGet,
  exportAllData, importAllData,
  exportCharacterData, importCharacterData,
  deleteCharacterCascade, clearChatData,
} from '../db.js';
import { validateStoreRows } from '../importValidation.js';

const REQUIRED_STORES = ['characters', 'messages', 'memories', 'moments', 'diary', 'dreams', 'worlds', 'groups', 'group_messages', 'notifications', 'settings'];

// v7 當時存在的 store（continuity_threads 是 v8 才有的）
const V7_STORES = [
  ['characters', [['worldId', 'worldId']]],
  ['messages', [['charId', 'charId'], ['createdAt', 'createdAt']]],
  ['memories', [['charId', 'charId']]],
  ['moments', [['charId', 'charId'], ['createdAt', 'createdAt']]],
  ['diary', [['charId', 'charId'], ['date', 'date']]],
  ['dreams', [['charId', 'charId']]],
  ['worlds', []],
  ['groups', []],
  ['group_messages', [['groupId', 'groupId'], ['createdAt', 'createdAt']]],
  ['notifications', [['charId', 'charId'], ['createdAt', 'createdAt']]],
  ['chat_memories', [['charId', 'charId']]],
  ['wishes', [['charId', 'charId']]],
  ['notes', [['charId', 'charId']]],
];

function makeBackup(overrides = {}) {
  const data = {};
  for (const s of REQUIRED_STORES) data[s] = [];
  return { aurisExportVersion: 1, exportDate: Date.now(), data: { ...data, ...overrides } };
}

// 一筆欄位齊全的待續事件，用來驗 round-trip 不掉欄位
function makeThread(over = {}) {
  return {
    id: 'thread_1', charId: 'c1',
    kind: 'event', owner: 'user',
    title: '週一參加面試', detail: '使用者要參加新工作的面試',
    matchKeywords: ['面試'],
    eventDate: '2026-07-27', eventTime: null, datePrecision: 'date',
    followUpAfter: 1785168000000,
    status: 'planned', result: null,
    sourceMsgId: 'msg_old_1', sourcePreview: '我下週一要去面試',
    enabled: true, lastPromptedAt: null, promptedCount: 0,
    offeredCount: 0, cooldownUntil: null,
    createdAt: 1, updatedAt: 2, closedAt: null,
    ...over,
  };
}

// 直接開一條連線讀 schema（initDB 不外露 db 實體）
function inspectSchema() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('auris');
    req.onsuccess = (e) => {
      const d = e.target.result;
      const store = d.objectStoreNames.contains('continuity_threads')
        ? d.transaction('continuity_threads', 'readonly').objectStore('continuity_threads')
        : null;
      const out = {
        version: d.version,
        hasStore: !!store,
        indexes: store ? Array.from(store.indexNames) : [],
        keyPath: store ? store.keyPath : null,
      };
      d.close();
      resolve(out);
    };
    req.onerror = reject;
  });
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;
});

describe('DB v8 upgrade', () => {
  it('全新安裝直接開 v8：store、keyPath 與三個 index 齊全', async () => {
    await initDB();
    const schema = await inspectSchema();
    expect(schema.version).toBe(8);
    expect(schema.hasStore).toBe(true);
    expect(schema.keyPath).toBe('id');
    expect(schema.indexes.sort()).toEqual(['charId', 'charId_status', 'followUpAfter']);
  });

  it('v7 升 v8：既有資料完整保留，並補上新 store', async () => {
    // 先造一個 v7 資料庫並塞資料
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('auris', 7);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        for (const [name, idx] of V7_STORES) {
          const os = d.createObjectStore(name, { keyPath: 'id' });
          for (const [n, k] of idx) os.createIndex(n, k, { unique: false });
        }
        d.createObjectStore('settings', { keyPath: 'key' });
        e.target.transaction.objectStore('messages')
          .createIndex('charId_createdAt', ['charId', 'createdAt'], { unique: false });
      };
      req.onsuccess = (e) => {
        const d = e.target.result;
        const tx = d.transaction(['characters', 'messages'], 'readwrite');
        tx.objectStore('characters').put({ id: 'c1', name: '夜雨' });
        tx.objectStore('messages').put({ id: 'm1', charId: 'c1', role: 'user', content: '舊訊息', createdAt: 100 });
        tx.oncomplete = () => { d.close(); resolve(); };
        tx.onerror = reject;
      };
      req.onerror = reject;
    });

    await initDB();

    const schema = await inspectSchema();
    expect(schema.version).toBe(8);
    expect(schema.hasStore).toBe(true);
    expect(schema.indexes.sort()).toEqual(['charId', 'charId_status', 'followUpAfter']);

    // 既有資料一字未動
    expect(await dbAll('characters')).toEqual([{ id: 'c1', name: '夜雨' }]);
    const msgs = await dbAll('messages');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('舊訊息');
    // 新 store 是空的，不是「不存在」
    expect(await dbAll('continuity_threads')).toEqual([]);
  });
});

describe('全站備份相容', () => {
  it('舊備份缺 continuity_threads → 視為空，可正常匯入（不當作損毀）', async () => {
    await dbPut('continuity_threads', makeThread());
    const backup = makeBackup();
    expect(backup.data.continuity_threads).toBeUndefined();

    await importAllData(backup);
    // 還原＝回到備份當下的快照，舊備份沒有這個 store 就是空的
    expect(await dbAll('continuity_threads')).toEqual([]);
  });

  it('新備份 round-trip：所有欄位與狀態原樣保留', async () => {
    const thread = makeThread({ status: 'waiting_result', promptedCount: 2, lastPromptedAt: 999 });
    await dbPut('continuity_threads', thread);

    const out = await exportAllData();
    expect(out.data.continuity_threads).toHaveLength(1);

    globalThis.indexedDB = new IDBFactory();
    await initDB();
    await importAllData(out);

    expect(await dbAll('continuity_threads')).toEqual([thread]);
  });
});

describe('單角色匯出／匯入', () => {
  beforeEach(async () => {
    await initDB();
    await dbPut('characters', { id: 'c1', name: '夜雨' });
    await dbPut('messages', { id: 'msg_old_1', charId: 'c1', role: 'user', content: '我下週一要去面試', createdAt: 1 });
    await dbPut('messages', { id: 'msg_old_2', charId: 'c1', role: 'assistant', content: '會順利的', createdAt: 2 });
  });

  it('匯出含該角色 threads；匯入重映射 charId 與 sourceMsgId', async () => {
    await dbPut('continuity_threads', makeThread({ sourceMsgId: 'msg_old_2' }));

    const dump = await exportCharacterData('c1');
    expect(dump.threads).toHaveLength(1);

    const newCharId = await importCharacterData(dump);
    const threads = (await dbAll('continuity_threads')).filter(t => t.charId === newCharId);
    expect(threads).toHaveLength(1);

    // sourceMsgId 要指到「這批匯入後的新訊息 ID」，而且該訊息真的存在
    const target = await dbGet('messages', threads[0].sourceMsgId);
    expect(target).toBeDefined();
    expect(target.content).toBe('會順利的');
    expect(target.charId).toBe(newCharId);
    // 內容欄位不受重映射影響
    expect(threads[0].title).toBe('週一參加面試');
    expect(threads[0].status).toBe('planned');
  });

  it('來源訊息不在這批匯入裡 → sourceMsgId 降為 null，保留 sourcePreview 不丟整筆', async () => {
    await dbPut('continuity_threads', makeThread({ sourceMsgId: 'msg_不存在' }));

    const dump = await exportCharacterData('c1');
    const newCharId = await importCharacterData(dump);

    const thread = (await dbAll('continuity_threads')).find(t => t.charId === newCharId);
    expect(thread).toBeDefined();
    expect(thread.sourceMsgId).toBeNull();
    expect(thread.sourcePreview).toBe('我下週一要去面試');
  });

  it('備份完全沒帶 messages → threads 仍可匯入，sourceMsgId 為 null', async () => {
    await dbPut('continuity_threads', makeThread());
    const dump = await exportCharacterData('c1');
    delete dump.messages;

    const newCharId = await importCharacterData(dump);
    const thread = (await dbAll('continuity_threads')).find(t => t.charId === newCharId);
    expect(thread.sourceMsgId).toBeNull();
  });
});

describe('刪除與清除連動', () => {
  beforeEach(async () => {
    await initDB();
    await dbPut('characters', { id: 'c1', name: '夜雨' });
    await dbPut('messages', { id: 'm1', charId: 'c1', role: 'user', content: 'hi', createdAt: 1 });
    await dbPut('memories', { id: 'mem1', charId: 'c1', content: '心聲' });
    await dbPut('diary', { id: 'd1', charId: 'c1', content: '日記' });
    await dbPut('continuity_threads', makeThread());
    await dbPut('notifications', { id: 'n1', charId: 'c1', type: 'chat', text: '新訊息' });
    await dbPut('notifications', { id: 'n2', charId: 'c1', type: 'hv', text: '心聲' });
  });

  it('刪除角色 → 不留孤兒 threads', async () => {
    await deleteCharacterCascade('c1');
    expect(await dbAll('characters')).toEqual([]);
    expect(await dbAll('continuity_threads')).toEqual([]);
    expect(await dbAll('messages')).toEqual([]);
  });

  it('聊天室入口預設：只刪 messages，不動 memories 與 threads', async () => {
    await clearChatData(['c1'], {});
    expect(await dbAll('messages')).toEqual([]);
    expect(await dbAll('memories')).toHaveLength(1);      // 聊天室既有範圍：不刪 memories
    expect(await dbAll('continuity_threads')).toHaveLength(1);
    // hv 通知綁 memories，沒刪 memories 就不該清掉
    const notifTypes = (await dbAll('notifications')).map(n => n.type);
    expect(notifTypes).toEqual(['hv']);
  });

  it('列表入口預設：刪 messages + memories，仍保留 threads 與日記', async () => {
    await clearChatData(['c1'], { includeMemories: true });
    expect(await dbAll('messages')).toEqual([]);
    expect(await dbAll('memories')).toEqual([]);
    expect(await dbAll('diary')).toHaveLength(1);
    expect(await dbAll('continuity_threads')).toHaveLength(1);
    expect(await dbAll('notifications')).toEqual([]);     // chat + hv 都清掉
  });

  it('勾選「待續的事」才會清除 threads', async () => {
    await clearChatData(['c1'], { includeMemories: true, alsoThreads: true });
    expect(await dbAll('continuity_threads')).toEqual([]);
    expect(await dbAll('diary')).toHaveLength(1);         // 沒勾內容 → 日記仍在
  });

  it('批次清空多個角色，只影響指定角色', async () => {
    await dbPut('characters', { id: 'c2', name: '朝霧' });
    await dbPut('continuity_threads', makeThread({ id: 'thread_2', charId: 'c2' }));
    await dbPut('continuity_threads', makeThread({ id: 'thread_3', charId: 'c3' }));

    await clearChatData(['c1', 'c2'], { includeMemories: true, alsoThreads: true });

    const left = await dbAll('continuity_threads');
    expect(left.map(t => t.charId)).toEqual(['c3']);
  });
});

describe('匯入驗證：continuity_threads schema', () => {
  const row = (over = {}) => [makeThread(over)];

  it('合法一筆 → 通過', () => {
    expect(validateStoreRows('continuity_threads', row())).toBe(1);
  });

  it('status 不在白名單 → 拒絕', () => {
    expect(() => validateStoreRows('continuity_threads', row({ status: 'zombie' })))
      .toThrow(/status/);
  });

  it('kind／owner 不在白名單 → 拒絕', () => {
    expect(() => validateStoreRows('continuity_threads', row({ kind: 'todo' }))).toThrow(/kind/);
    expect(() => validateStoreRows('continuity_threads', row({ owner: 'char' }))).toThrow(/owner/);
  });

  it('2026-02-30 → 判為無效，不滾成 3 月', () => {
    expect(() => validateStoreRows('continuity_threads', row({ eventDate: '2026-02-30' })))
      .toThrow(/eventDate/);
  });

  it('閏年 2024-02-29 合法、平年 2026-02-29 無效', () => {
    expect(validateStoreRows('continuity_threads', row({ eventDate: '2024-02-29' }))).toBe(1);
    expect(() => validateStoreRows('continuity_threads', row({ eventDate: '2026-02-29' })))
      .toThrow(/eventDate/);
  });

  it('eventDate/eventTime 為 null（無日期事件）→ 通過', () => {
    expect(validateStoreRows('continuity_threads', row({
      eventDate: null, eventTime: null, datePrecision: 'unknown', followUpAfter: null,
    }))).toBe(1);
  });

  it('eventTime 超出 00:00–23:59 → 拒絕', () => {
    expect(() => validateStoreRows('continuity_threads', row({ eventTime: '24:00' }))).toThrow(/eventTime/);
    expect(() => validateStoreRows('continuity_threads', row({ eventTime: '12:60' }))).toThrow(/eventTime/);
  });

  it('matchKeywords 超過 3 個或含超長詞 → 拒絕', () => {
    expect(() => validateStoreRows('continuity_threads', row({ matchKeywords: ['a', 'b', 'c', 'd'] })))
      .toThrow(/matchKeywords/);
    expect(() => validateStoreRows('continuity_threads', row({ matchKeywords: ['超過八個字的關鍵詞測試'] })))
      .toThrow(/matchKeywords/);
  });

  it('時間戳欄位非數字 → 拒絕', () => {
    expect(() => validateStoreRows('continuity_threads', row({ closedAt: 'yesterday' })))
      .toThrow(/closedAt/);
  });

  it('缺 charId 或 title → 拒絕', () => {
    const bad = makeThread();
    delete bad.title;
    expect(() => validateStoreRows('continuity_threads', [bad])).toThrow(/title/);
  });
});
