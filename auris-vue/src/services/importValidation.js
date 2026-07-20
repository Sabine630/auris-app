const MIB = 1024 * 1024;

export const IMPORT_LIMITS = Object.freeze({
  backup: Object.freeze({
    label: '完整備份',
    fileBytes: 64 * MIB,
    totalRecords: 250000,
    totalTextChars: 32 * MIB,
    totalImageBytes: 32 * MIB,
  }),
  character: Object.freeze({
    label: '角色備份',
    fileBytes: 24 * MIB,
    totalRecords: 50000,
    totalTextChars: 12 * MIB,
    totalImageBytes: 12 * MIB,
  }),
  chat: Object.freeze({
    label: '聊天備份',
    fileBytes: 32 * MIB,
    totalRecords: 100000,
    totalTextChars: 20 * MIB,
    totalImageBytes: 24 * MIB,
  }),
});

export const MAX_IMAGE_BYTES = 5 * MIB;
export const MAX_TEXT_FIELD_CHARS = 200000;
const MAX_DEPTH = 20;
const MAX_OBJECT_KEYS = 250;
const MAX_ARRAY_ITEMS = 250000;

export const STORE_RECORD_LIMITS = Object.freeze({
  messages: 100000,
  group_messages: 100000,
  notifications: 50000,
  settings: 5000,
  characters: 20000,
  memories: 20000,
  moments: 20000,
  diary: 20000,
  dreams: 20000,
  worlds: 20000,
  groups: 20000,
  chat_memories: 20000,
  wishes: 20000,
  notes: 20000,
  continuity_threads: 20000,
});

// P131 待續事件：狀態機與列舉由本地決定，匯入的值必須落在白名單內，
// 否則一筆被竄改的 status 會讓 thread 永遠選不到、也永遠清不掉。
const THREAD_KINDS = new Set(['event', 'promise', 'open_question']);
const THREAD_OWNERS = new Set(['user', 'shared']);
const THREAD_STATUSES = new Set(['planned', 'waiting_result', 'resolved', 'cancelled', 'expired']);
const THREAD_PRECISIONS = new Set(['date', 'time', 'unknown']);
const MAX_THREAD_KEYWORDS = 3;
const MAX_THREAD_KEYWORD_CHARS = 8;

// 只接受本地日曆 YYYY-MM-DD，且必須 round-trip 回同一組年月日：
// 2026-02-30 會被 Date 自動滾成 3 月 2 日，這裡要判為無效。
// 一律分開解析後用 new Date(y, m-1, d)，不得用 new Date('YYYY-MM-DD')（UTC 午夜會偏移日期）。
function isValidLocalDateString(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

function isValidLocalTimeString(value) {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

const REQUIRED_STRING_FIELDS = Object.freeze({
  characters: ['name'],
  messages: ['charId', 'role', 'content'],
  memories: ['charId', 'content'],
  moments: ['charId', 'content'],
  diary: ['charId', 'content'],
  dreams: ['charId', 'content'],
  worlds: ['name'],
  groups: ['name'],
  group_messages: ['groupId', 'charId', 'content'],
  notifications: ['text'],
  chat_memories: ['charId', 'content'],
  wishes: ['charId', 'text'],
  notes: ['charId', 'text'],
  continuity_threads: ['charId', 'title'],
});

const IMAGE_KEYS = new Set(['image', 'avatar']);
const IMAGE_ARRAY_KEYS = new Set(['images']);

function limitFor(kind) {
  const limit = IMPORT_LIMITS[kind];
  if (!limit) throw new Error('未知的匯入類型');
  return limit;
}

function formatMiB(bytes) {
  return Math.round(bytes / MIB);
}

export function assertImportFileSize(file, kind) {
  const limit = limitFor(kind);
  if (!file || !Number.isFinite(file.size)) throw new Error('無法讀取匯入檔案');
  if (file.size <= 0) throw new Error('匯入檔案是空的');
  if (file.size > limit.fileBytes) {
    throw new Error(`${limit.label}檔案不可超過 ${formatMiB(limit.fileBytes)} MB`);
  }
}

export async function readImportJsonFile(file, kind) {
  assertImportFileSize(file, kind); // 必須在 file.text() 前擋下超大檔案
  let text;
  try {
    text = await file.text();
  } catch {
    throw new Error('無法讀取匯入檔案');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('JSON 檔案格式錯誤或已損毀');
  }
}

function decodedBase64Bytes(payload) {
  if (!payload || payload.length % 4 !== 0) return -1;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return (payload.length / 4) * 3 - padding;
}

function decodeHeader(payload) {
  try {
    const headerLength = Math.min(payload.length, 24);
    const alignedLength = headerLength - (headerLength % 4);
    const raw = atob(payload.slice(0, alignedLength || payload.length));
    return Array.from(raw, ch => ch.charCodeAt(0));
  } catch {
    return null;
  }
}

function matchesMagic(mime, bytes) {
  if (!bytes) return false;
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((byte, i) => bytes[i] === byte);
  }
  if (mime === 'image/webp') {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

export function inspectRasterDataUrl(value, maxBytes = MAX_IMAGE_BYTES) {
  if (typeof value !== 'string') return { safe: false, reason: 'format', bytes: 0 };
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  if (!match) return { safe: false, reason: 'format', bytes: 0 };

  const mime = match[1].toLowerCase();
  const payload = match[2];
  const bytes = decodedBase64Bytes(payload);
  if (bytes < 0) return { safe: false, reason: 'base64', bytes: 0 };
  if (bytes > maxBytes) return { safe: false, reason: 'size', bytes };
  if (!matchesMagic(mime, decodeHeader(payload))) return { safe: false, reason: 'signature', bytes };
  return { safe: true, mime, bytes };
}

export function isSafeRasterDataUrl(value, maxBytes = MAX_IMAGE_BYTES) {
  return inspectRasterDataUrl(value, maxBytes).safe;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function addImageToBudget(value, budget, path) {
  if (typeof value !== 'string' || !value.startsWith('data:')) return false;
  const inspected = inspectRasterDataUrl(value);
  if (!inspected.safe) {
    if (inspected.reason === 'size') throw new Error(`匯入內容的圖片超過 ${formatMiB(MAX_IMAGE_BYTES)} MB 上限`);
    throw new Error(`匯入內容「${path}」含不支援或損毀的圖片（僅支援 JPEG、PNG、WebP base64）`);
  }
  budget.imageBytes += inspected.bytes;
  if (budget.imageBytes > budget.limit.totalImageBytes) {
    throw new Error(`${budget.limit.label}內嵌圖片總量不可超過 ${formatMiB(budget.limit.totalImageBytes)} MB`);
  }
  return true;
}

function walkResources(value, budget, path = 'root', depth = 0, key = '') {
  if (depth > MAX_DEPTH) throw new Error('匯入內容巢狀層級過深');
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return;

  if (typeof value === 'string') {
    const isImage = IMAGE_KEYS.has(key) && addImageToBudget(value, budget, path);
    if (!isImage) {
      if (value.length > MAX_TEXT_FIELD_CHARS) {
        throw new Error(`匯入內容「${path}」文字過長（單一欄位上限 ${MAX_TEXT_FIELD_CHARS} 字）`);
      }
      budget.textChars += value.length;
      if (budget.textChars > budget.limit.totalTextChars) {
        throw new Error(`${budget.limit.label}文字總量過大`);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) throw new Error(`匯入內容「${path}」項目過多`);
    for (let i = 0; i < value.length; i++) {
      const childPath = `${path}[${i}]`;
      if (IMAGE_ARRAY_KEYS.has(key) && typeof value[i] === 'string'
        && addImageToBudget(value[i], budget, childPath)) continue;
      walkResources(value[i], budget, childPath, depth + 1, key);
    }
    return;
  }

  if (!isPlainObject(value)) throw new Error(`匯入內容「${path}」格式錯誤`);
  const entries = Object.entries(value);
  if (entries.length > MAX_OBJECT_KEYS) throw new Error(`匯入內容「${path}」欄位過多`);
  for (const [childKey, childValue] of entries) {
    walkResources(childValue, budget, `${path}.${childKey}`, depth + 1, childKey);
  }
}

export function validateImportResources(value, kind) {
  const budget = { limit: limitFor(kind), textChars: 0, imageBytes: 0 };
  walkResources(value, budget);
  return { textChars: budget.textChars, imageBytes: budget.imageBytes };
}

function requireString(rec, store, field, index) {
  if (typeof rec[field] !== 'string') {
    throw new Error(`匯入資料「${store}」第 ${index + 1} 筆的「${field}」格式錯誤`);
  }
}

function validateThreadRow(rec, index) {
  const bad = (field) => new Error(`匯入資料「continuity_threads」第 ${index + 1} 筆的「${field}」格式錯誤`);

  if (!THREAD_KINDS.has(rec.kind)) throw bad('kind');
  if (!THREAD_OWNERS.has(rec.owner)) throw bad('owner');
  if (!THREAD_STATUSES.has(rec.status)) throw bad('status');
  if (rec.datePrecision !== undefined && !THREAD_PRECISIONS.has(rec.datePrecision)) throw bad('datePrecision');

  // 日期／時間可為 null（無日期事件），有值就必須是合法的本地日曆值。
  if (rec.eventDate != null && !isValidLocalDateString(rec.eventDate)) throw bad('eventDate');
  if (rec.eventTime != null && !isValidLocalTimeString(rec.eventTime)) throw bad('eventTime');

  for (const field of ['followUpAfter', 'lastPromptedAt', 'closedAt', 'cooldownUntil']) {
    if (rec[field] != null && !Number.isFinite(rec[field])) throw bad(field);
  }
  for (const field of ['promptedCount', 'offeredCount']) {
    if (rec[field] !== undefined && !Number.isFinite(rec[field])) throw bad(field);
  }
  for (const field of ['detail', 'sourcePreview', 'result']) {
    if (rec[field] != null && typeof rec[field] !== 'string') throw bad(field);
  }
  if (rec.sourceMsgId != null && typeof rec.sourceMsgId !== 'string') throw bad('sourceMsgId');
  if (rec.enabled !== undefined && typeof rec.enabled !== 'boolean') throw bad('enabled');

  if (rec.matchKeywords !== undefined) {
    if (!Array.isArray(rec.matchKeywords) || rec.matchKeywords.length > MAX_THREAD_KEYWORDS) throw bad('matchKeywords');
    for (const kw of rec.matchKeywords) {
      if (typeof kw !== 'string' || !kw || kw.length > MAX_THREAD_KEYWORD_CHARS) throw bad('matchKeywords');
    }
  }
}

export function validateStoreRows(store, rows) {
  if (!Array.isArray(rows)) throw new Error(`備份檔「${store}」格式錯誤`);
  const rowLimit = STORE_RECORD_LIMITS[store] || 20000;
  if (rows.length > rowLimit) throw new Error(`備份檔「${store}」筆數超過上限 ${rowLimit}`);

  const keyPath = store === 'settings' ? 'key' : 'id';
  const seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    const rec = rows[i];
    if (!isPlainObject(rec) || typeof rec[keyPath] !== 'string' || !rec[keyPath]) {
      throw new Error(`備份檔「${store}」第 ${i + 1} 筆缺少有效的「${keyPath}」`);
    }
    if (seen.has(rec[keyPath])) throw new Error(`備份檔「${store}」含重複的「${keyPath}」`);
    seen.add(rec[keyPath]);

    for (const field of REQUIRED_STRING_FIELDS[store] || []) requireString(rec, store, field, i);
    if (store === 'messages' && rec.role !== 'user' && rec.role !== 'assistant') {
      throw new Error(`匯入資料「messages」第 ${i + 1} 筆的「role」格式錯誤`);
    }
    if (rec.createdAt !== undefined && !Number.isFinite(rec.createdAt)) {
      throw new Error(`匯入資料「${store}」第 ${i + 1} 筆的「createdAt」格式錯誤`);
    }
    if (store === 'groups' && rec.charIds !== undefined
      && (!Array.isArray(rec.charIds) || rec.charIds.some(id => typeof id !== 'string'))) {
      throw new Error(`匯入資料「groups」第 ${i + 1} 筆的「charIds」格式錯誤`);
    }
    if (store === 'continuity_threads') validateThreadRow(rec, i);
  }
  return rows.length;
}

export function validateRecordBudget(rowCount, kind) {
  const limit = limitFor(kind);
  if (rowCount > limit.totalRecords) {
    throw new Error(`${limit.label}總筆數超過上限 ${limit.totalRecords}`);
  }
}

export function validateCharacterImport(jsonData) {
  if (!jsonData || jsonData.aurisCharExportVersion !== 1 || !isPlainObject(jsonData.character)) {
    throw new Error('無效的角色備份格式');
  }
  validateImportResources(jsonData, 'character');
  validateStoreRows('characters', [jsonData.character]);

  const sections = [
    ['messages', 'messages'],
    ['memories', 'memories'],
    ['chatMems', 'chat_memories'],
    ['moments', 'moments'],
    ['diary', 'diary'],
    ['dreams', 'dreams'],
    ['wishes', 'wishes'],
    ['notes', 'notes'],
    ['threads', 'continuity_threads'],
  ];
  let total = 1;
  for (const [field, store] of sections) {
    if (jsonData[field] === undefined) continue;
    total += validateStoreRows(store, jsonData[field]);
  }
  validateRecordBudget(total, 'character');
  return jsonData;
}

export function validateChatImport(jsonData) {
  if (!jsonData || jsonData.aurisChatExportVersion !== 1 || !Array.isArray(jsonData.messages)) {
    throw new Error('格式錯誤，請選擇正確的聊天記錄備份檔');
  }
  validateImportResources(jsonData, 'chat');
  const total = validateStoreRows('messages', jsonData.messages);
  validateRecordBudget(total, 'chat');
  return jsonData.messages;
}
