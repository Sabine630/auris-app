let db = null;

export function initDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('auris', 7);
    r.onupgradeneeded = (e) => {
      const d = e.target.result;
      [
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
      ].forEach(([name, idx]) => {
        if (!d.objectStoreNames.contains(name)) {
          const os = d.createObjectStore(name, { keyPath: 'id' });
          idx.forEach(([n, k]) => os.createIndex(n, k, { unique: false }));
        }
      });
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });

      // v7：messages 補建複合 index（charId + createdAt），供背景派發用 cursor 取「某角色最新 N 則」
      // 與計數查詢，取代每 5 分鐘全量 getAll。用 upgrade transaction 取 store，
      // 「全新安裝（上面 loop 剛建好）」與「v6 升 v7（既有 store）」兩條路徑皆適用；
      // IndexedDB 對既有資料加 index 會自動回填，不動既有內容、安全。
      const ms = e.target.transaction.objectStore('messages');
      if (!ms.indexNames.contains('charId_createdAt')) {
        ms.createIndex('charId_createdAt', ['charId', 'createdAt'], { unique: false });
      }
    };
    r.onsuccess = (e) => {
      db = e.target.result;
      res(db);
    };
    r.onerror = (e) => {
      console.error(e);
      rej(e);
    };
  });
}

export const dbPut = (s, v) => new Promise((r, j) => { const tx = db.transaction(s, 'readwrite'); tx.objectStore(s).put(v).onsuccess = e => r(e.target.result); tx.onerror = j; });
export const dbGet = (s, k) => new Promise((r, j) => { const tx = db.transaction(s, 'readonly'); tx.objectStore(s).get(k).onsuccess = e => r(e.target.result); tx.onerror = j; });
export const dbAll = (s) => new Promise((r, j) => { const tx = db.transaction(s, 'readonly'); tx.objectStore(s).getAll().onsuccess = e => r(e.target.result); tx.onerror = j; });
export const dbIdx = (s, i, v) => new Promise((r, j) => { const tx = db.transaction(s, 'readonly'); tx.objectStore(s).index(i).getAll(v).onsuccess = e => r(e.target.result); tx.onerror = j; });
// 用 index 計數（不撈資料本體）。背景派發判斷「訊息數 ≥ N」用它，避免全量 getAll 進記憶體。
export const dbIdxCount = (s, i, v) => new Promise((r, j) => { const tx = db.transaction(s, 'readonly'); tx.objectStore(s).index(i).count(v).onsuccess = e => r(e.target.result); tx.onerror = j; });
// 取某角色「最新 N 則」訊息（用複合 index charId_createdAt 逆向 cursor，不整包 getAll）。
// 回傳陣列以「舊 → 新」排序，與既有 sort((a,b)=>a.createdAt-b.createdAt) 的結果一致。
// 範圍用 array 前綴界定：[charId] < [charId, 任何值] < [charId, []]，
// 避免對 createdAt 上界用 Infinity（IndexedDB key 相容性較不確定）。
export const dbLatestByChar = (charId, n) => new Promise((r, j) => {
  const tx = db.transaction('messages', 'readonly');
  const idx = tx.objectStore('messages').index('charId_createdAt');
  const range = IDBKeyRange.bound([charId], [charId, []]);
  const out = [];
  idx.openCursor(range, 'prev').onsuccess = (e) => {
    const cur = e.target.result;
    if (cur && out.length < n) { out.push(cur.value); cur.continue(); }
    else r(out.reverse());
  };
  tx.onerror = j;
});
export const dbDel = (s, k) => new Promise((r, j) => { const tx = db.transaction(s, 'readwrite'); tx.objectStore(s).delete(k).onsuccess = () => r(); tx.onerror = j; });
export const dbClear = (s) => new Promise((r, j) => { const tx = db.transaction(s, 'readwrite'); tx.objectStore(s).clear().onsuccess = () => r(); tx.onerror = j; });

export const getSetting = async (k) => { const r = await dbGet('settings', k); return r ? r.value : null; };
export const setSetting = (k, v) => dbPut('settings', { key: k, value: v });

const ALL_STORES = ['characters', 'messages', 'memories', 'moments', 'diary', 'dreams', 'worlds', 'groups', 'group_messages', 'notifications', 'chat_memories', 'wishes', 'notes', 'settings'];

export async function exportAllData() {
  const data = {};
  for (const s of ALL_STORES) {
    data[s] = await dbAll(s);
  }
  // 安全：絕不把 API 金鑰寫進可下載／分享的備份檔。
  // Vertex AI 的金鑰是整包 service account JSON（含 RSA 私鑰，cloud-platform 權限），
  // 一旦隨備份外流等同把 GCP 專案憑證交出去。OpenAI/Anthropic 等字串金鑰同理。
  data.settings = (data.settings || []).filter(r => r.key !== 'api_key');
  return {
    aurisExportVersion: 1,
    exportDate: Date.now(),
    data
  };
}

export async function importAllData(jsonData) {
  if (!jsonData || jsonData.aurisExportVersion !== 1 || !jsonData.data) {
    throw new Error('無效的備份檔案格式');
  }

  // 先完整驗證整份備份，全部通過才動資料庫。
  // 舊版實作是「先清空全部 store 再逐筆還原」，若備份檔某段壞掉會在清空後才失敗，
  // 導致原本的資料全毀且無法復原。改為「驗證 → 清空 → 還原」三段式。
  const plan = [];
  for (const s of ALL_STORES) {
    const rows = jsonData.data[s];
    if (rows == null) continue;              // 該 store 不在備份內，略過（不視為錯誤）
    if (!Array.isArray(rows)) throw new Error(`備份檔「${s}」格式錯誤`);
    const keyPath = s === 'settings' ? 'key' : 'id';
    for (const rec of rows) {
      if (!rec || typeof rec !== 'object' || rec[keyPath] === undefined) {
        throw new Error(`備份檔「${s}」內含無效資料`);
      }
    }
    plan.push([s, rows]);
  }

  // 備份檔基於安全考量不含 api_key，還原後沿用本機原本的金鑰設定，
  // 使用者不需在每次還原後重新貼上金鑰。
  const preservedKey = await getSetting('api_key');

  // 驗證通過才清空現有資料
  for (const s of ALL_STORES) {
    await dbClear(s);
  }
  // 還原備份內容
  for (const [s, rows] of plan) {
    for (const record of rows) {
      await dbPut(s, record);
    }
  }

  // 若備份不含金鑰（新版備份必然如此），補回原本的金鑰
  const backupHasKey = (jsonData.data.settings || []).some(r => r && r.key === 'api_key');
  if (!backupHasKey && preservedKey != null) {
    await setSetting('api_key', preservedKey);
  }
}

// ── 單角色匯出（含聊天記錄、記憶、日記、夢境、貼文）────────────────────────
export async function exportCharacterData(charId) {
  const char = await dbGet('characters', charId);
  if (!char) throw new Error('找不到角色');
  const [messages, memories, chatMems, moments, diary, dreams, wishes, notes] = await Promise.all([
    dbIdx('messages', 'charId', charId),
    dbIdx('memories', 'charId', charId),
    dbIdx('chat_memories', 'charId', charId),
    dbIdx('moments', 'charId', charId),
    dbIdx('diary', 'charId', charId),
    dbIdx('dreams', 'charId', charId),
    dbIdx('wishes', 'charId', charId),
    dbIdx('notes', 'charId', charId),
  ]);
  return {
    aurisCharExportVersion: 1,
    exportDate: Date.now(),
    character: char,
    messages,
    memories,
    chatMems,
    moments,
    diary,
    dreams,
    wishes,
    notes,
  };
}

// ── 單角色匯入（以新 ID 寫入，不覆蓋現有角色）─────────────────────────────
export async function importCharacterData(jsonData) {
  if (!jsonData || jsonData.aurisCharExportVersion !== 1 || !jsonData.character) {
    throw new Error('無效的角色備份格式');
  }
  const base = Date.now();
  const newCharId = 'char_' + base;

  // 寫入角色（換新 ID，名稱後加「(匯入)」避免混淆）
  const char = { ...jsonData.character, id: newCharId, name: (jsonData.character.name || '未命名') + '（匯入）' };
  await dbPut('characters', char);

  // 重新對應 charId 並賦予新 ID，用 index 確保同毫秒不衝突
  const remapAndInsert = async (records, store, prefix) => {
    if (!Array.isArray(records)) return;
    for (let i = 0; i < records.length; i++) {
      await dbPut(store, { ...records[i], id: `${prefix}_${base}_${i}`, charId: newCharId });
    }
  };

  await remapAndInsert(jsonData.messages,  'messages',      'msg');
  await remapAndInsert(jsonData.memories,  'memories',      'mem');
  await remapAndInsert(jsonData.chatMems,  'chat_memories', 'cmem');
  await remapAndInsert(jsonData.moments,   'moments',       'mmt');
  await remapAndInsert(jsonData.diary,     'diary',         'diary');
  await remapAndInsert(jsonData.dreams,    'dreams',        'dream');
  await remapAndInsert(jsonData.wishes,    'wishes',        'wish');
  await remapAndInsert(jsonData.notes,     'notes',         'note');

  return newCharId;
}
