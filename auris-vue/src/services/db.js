import { isDemo } from './demoMode.js';
import {
  isSafeRasterDataUrl,
  validateCharacterImport,
  validateImportResources,
  validateRecordBudget,
  validateStoreRows,
} from './importValidation.js';

let db = null;

export function initDB() {
  return new Promise((res, rej) => {
    // Demo/教學模式走完全獨立的資料庫，碰不到使用者真實的 'auris' 資料。
    const r = indexedDB.open(isDemo() ? 'auris-demo' : 'auris', 7);
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
// 整個 store 計數（備份提醒門檻、診斷匯出的角色/訊息數用）。
export const dbCount = (s) => new Promise((r, j) => { const tx = db.transaction(s, 'readonly'); tx.objectStore(s).count().onsuccess = e => r(e.target.result); tx.onerror = j; });
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

// v1 備份格式（aurisExportVersion: 1）自誕生起必含的 store——缺任何一個代表備份檔
// 損毀或被改過，必須拒絕匯入（否則「清空 → 還原」會把該 store 的資料靜默清光）。
// chat_memories / wishes / notes 是備份功能上線後才新增的 store，舊備份可能沒有，
// 缺少時視為空（還原＝回到備份當下的快照）。
const REQUIRED_STORES = ['characters', 'messages', 'memories', 'moments', 'diary', 'dreams', 'worlds', 'groups', 'group_messages', 'notifications', 'settings'];

// API 連線設定屬本機專屬，不隨備份移動。備份檔可被分享／竄改：若匯入時接受
// api_base，攻擊者可把端點指向自己的伺服器，本機保留的金鑰之後就會送往該端點。
const LOCAL_ONLY_SETTINGS = ['api_key', 'api_provider', 'api_base', 'api_model'];

// 訊息圖片只接受 JPEG／PNG／WebP 的 base64 data URL，並核對檔頭與解碼後大小。
// 匯入的 JSON 若夾帶外部 URL，聊天室一開啟就會對該網址發請求（追蹤像素），
// 洩漏 IP 與上線時間；SVG、偽造 MIME、非 base64 與超限圖片也一律移除。
export function stripUnsafeImage(rec) {
  if (rec && rec.image !== undefined && !isSafeRasterDataUrl(rec.image)) {
    const { image, ...rest } = rec;
    return rest;
  }
  return rec;
}

export async function exportAllData() {
  const data = {};
  for (const s of ALL_STORES) {
    data[s] = await dbAll(s);
  }
  // 安全：絕不把 API 金鑰寫進可下載／分享的備份檔。
  // Vertex AI 的金鑰是整包 service account JSON（含 RSA 私鑰，cloud-platform 權限），
  // 一旦隨備份外流等同把 GCP 專案憑證交出去。OpenAI/Anthropic 等字串金鑰同理。
  // provider/base/model 也一併排除（本機專屬設定，匯入端也會忽略）。
  data.settings = (data.settings || []).filter(r => !LOCAL_ONLY_SETTINGS.includes(r.key));
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

  // 先完整驗證整份備份的巢狀深度、文字／圖片總量與圖片真實檔頭，
  // 全部通過才動資料庫。View 另會在讀檔前擋 64 MB，避免先把超大 JSON 載入記憶體。
  validateImportResources(jsonData, 'backup');
  const plan = [];
  let totalRecords = 0;
  for (const s of ALL_STORES) {
    const rows = jsonData.data[s];
    if (rows == null) {
      if (REQUIRED_STORES.includes(s)) {
        throw new Error(`備份檔缺少「${s}」資料，檔案可能損毀或不完整`);
      }
      continue;                              // 備份功能上線後才新增的 store 允許缺席（視為空）
    }
    totalRecords += validateStoreRows(s, rows);
    let cleaned = rows;
    if (s === 'settings') cleaned = rows.filter(r => !LOCAL_ONLY_SETTINGS.includes(r.key));
    if (s === 'messages') cleaned = rows.map(stripUnsafeImage);
    plan.push([s, cleaned]);
  }
  validateRecordBudget(totalRecords, 'backup');

  // API 設定屬本機專屬：備份內的一律忽略（見 LOCAL_ONLY_SETTINGS 註解），
  // 本機原有的先讀出、在同一 transaction 內寫回，還原後不需重新貼金鑰。
  const preserved = [];
  for (const k of LOCAL_ONLY_SETTINGS) {
    const rec = await dbGet('settings', k);
    if (rec !== undefined) preserved.push(rec);
  }

  // 單一 readwrite transaction 完成「清空 → 還原 → 補回本機 API 設定」：
  // 任一筆寫入失敗（quota、I/O…）即整批 abort，IndexedDB 自動回滾，
  // 不會留下「已清空但沒還原」的半毀資料庫。
  await new Promise((resolve, reject) => {
    const tx = db.transaction(ALL_STORES, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('匯入中斷，資料已回復原狀'));
    try {
      for (const s of ALL_STORES) tx.objectStore(s).clear();
      for (const [s, rows] of plan) {
        const os = tx.objectStore(s);
        for (const rec of rows) os.put(rec);
      }
      const ss = tx.objectStore('settings');
      for (const rec of preserved) ss.put(rec);
    } catch (e) {
      // 排隊寫入時的同步錯誤（如無效 key）：主動 abort，讓已排隊的 clear 一併回滾
      try { tx.abort(); } catch { /* 可能已 abort */ }
      reject(e);
    }
  });
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
  validateCharacterImport(jsonData);
  const base = Date.now();
  const newCharId = 'char_' + base;

  // 寫入角色（換新 ID，名稱後加「(匯入)」避免混淆）
  const char = { ...jsonData.character, id: newCharId, name: (jsonData.character.name || '未命名') + '（匯入）' };
  await dbPut('characters', char);

  // 重新對應 charId 並賦予新 ID，用 index 確保同毫秒不衝突；圖片欄位過濾外部 URL
  const remapAndInsert = async (records, store, prefix) => {
    if (!Array.isArray(records)) return;
    for (let i = 0; i < records.length; i++) {
      await dbPut(store, stripUnsafeImage({ ...records[i], id: `${prefix}_${base}_${i}`, charId: newCharId }));
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
