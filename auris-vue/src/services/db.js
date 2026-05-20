let db = null;

export function initDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('auris', 3);
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
      ].forEach(([name, idx]) => {
        if (!d.objectStoreNames.contains(name)) {
          const os = d.createObjectStore(name, { keyPath: 'id' });
          idx.forEach(([n, k]) => os.createIndex(n, k, { unique: false }));
        }
      });
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
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
export const dbDel = (s, k) => new Promise((r, j) => { const tx = db.transaction(s, 'readwrite'); tx.objectStore(s).delete(k).onsuccess = () => r(); tx.onerror = j; });

export const getSetting = async (k) => { const r = await dbGet('settings', k); return r ? r.value : null; };
export const setSetting = (k, v) => dbPut('settings', { key: k, value: v });
