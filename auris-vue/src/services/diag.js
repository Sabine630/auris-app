// ── 診斷服務（P105 M3／P114 信任分級）───────────────────────────────────────
// 本地錯誤日誌（ring buffer、只存這台裝置）＋一鍵匯出診斷資訊，降低 bug 回報
// 來回成本（P103 教訓）。隱私底線採「信任分級」：
//   strict（預設）——LLM／網路／來源不明（unhandledrejection、舊資料）只保存
//     錯誤分類與安全 metadata，絕不保存原始 message（供應商可能把使用者輸入
//     片段原樣放進錯誤文字）。
//   trusted-local——只有受控 call site（同源 window runtime error、DB 初始化）
//     明確指定才保留錯誤訊息，且寫入前必經「刪控制字元 → 遮蔽金鑰 → 遮蔽 URL
//     → 截斷」（先刪控制字元，被換行切開的金鑰片段才會黏合、被遮蔽到）。
// ring buffer 為 schema 2 結構化欄位；讀出時逐筆重新驗證與遮蔽（localStorage
// 可被手動竄改，不能信任既存內容）。舊版（無 schema、只有 msg 字串）一律 strict。
// 錯誤日誌存 localStorage（同步、不依賴 IndexedDB——DB 初始化失敗也記得下來）。
import { APP_VERSION } from '../version.js';
import { getSetting, dbCount } from './db.js';

const ERR_KEY = 'auris_diag_errors';
const MAX_ERRORS = 30;
const MAX_MSG_LEN = 300;
const SCHEMA_VERSION = 2;
const SAFE_CODES = new Set([
  'request_timeout', 'request_aborted', 'network_error', 'quota_error',
  'storage_error', 'parse_error', 'runtime_error', 'http_error',
  'indexeddb_init_failed', 'settings_read_failed',
]);
// 偵測用（safeLabel 拒收）與遮蔽用（實際 replace 成 [REDACTED]，g flag＋吃掉整段 key）
const SECRETISH_TEST_RE = /(?:sk-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_|AKIA[0-9A-Z]{12,}|xox[bap]-)/i;
const SECRETISH_MASK_RE = /(?:sk-[A-Za-z0-9_-]{12,}|AIza[0-9A-Za-z_-]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]*|AKIA[0-9A-Z]{12,}|xox[bap]-[0-9A-Za-z-]*)/gi;
const URL_MASK_RE = /https?:\/\/\S+/gi;

function safeLabel(value, fallback = '?', max = 80) {
  const cleaned = String(value ?? '').replace(/[^A-Za-z0-9._:/-]/g, '').slice(0, max);
  if (SECRETISH_TEST_RE.test(cleaned)) return fallback;
  return cleaned || fallback;
}

// trusted-local 訊息的淨化管線。順序固定：
// 1. 先「刪除」控制字元（不是換成空白——被換行等控制字元切開的金鑰片段會
//    因此重新黏合，才能被下一步遮蔽；換成空白會讓拆開的片段避開偵測門檻）
// 2. 遮蔽金鑰 → 3. 遮蔽 URL → 4. 收攏空白 → 5. 截斷 300 字
//   （遮蔽必在截斷前——先截斷可能把金鑰切成不完整片段、躲過 pattern）
function sanitizeLocalMessage(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F]+/g, '')
    .replace(SECRETISH_MASK_RE, '[REDACTED]')
    .replace(URL_MASK_RE, '[URL]')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, MAX_MSG_LEN);
}

// location 欄位淨化：先去掉 query/fragment（內容可能含 token——safeLabel 只會
// 拿掉符號、把值黏回輸出），再走 safeLabel 字元 allowlist。
function safeLocation(value) {
  return safeLabel(String(value ?? '').split(/[?#]/)[0], '', 100);
}

function classifyCode(raw, status, metaCode) {
  if (SAFE_CODES.has(metaCode)) return metaCode;
  if (/request_timeout/i.test(raw)) return 'request_timeout';
  if (/abort(?:ed|error)?/i.test(raw)) return 'request_aborted';
  if (/failed to fetch|networkerror|network error/i.test(raw)) return 'network_error';
  if (/quota/i.test(raw)) return 'quota_error';
  if (/indexeddb|database|transaction|idb/i.test(raw)) return 'storage_error';
  if (/json|parse|syntax/i.test(raw)) return 'parse_error';
  return Number.isInteger(status) ? 'http_error' : 'runtime_error';
}

function parseStatus(raw, metaStatus) {
  const statusMatch = String(raw).match(/\b(?:HTTP(?:\s+Error)?|status(?:\s+code)?)\D{0,3}([1-5]\d{2})\b/i);
  const status = Number(metaStatus || statusMatch?.[1]);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
}

// 記一筆錯誤（逐筆蓋當時版號）。診斷用途，自身絕不能再拋錯。
// meta：{ code, status, provider, model, location, policy }。
// policy 只接受 'trusted-local'（由受控 call site 明確指定）；其餘一律 strict。
export function logError(src, error, meta = {}) {
  try {
    const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? '');
    const status = parseStatus(raw, meta.status);
    const entry = {
      schema: SCHEMA_VERSION,
      t: new Date().toISOString(),
      v: APP_VERSION,
      src: safeLabel(src, 'unknown', 40),
      code: classifyCode(raw, status, meta.code),
    };
    if (status != null) entry.status = status;
    if (meta.provider != null) entry.provider = safeLabel(meta.provider);
    if (meta.model != null) entry.model = safeLabel(meta.model);
    if (meta.location) entry.location = safeLocation(meta.location);
    if (meta.policy === 'trusted-local') {
      const cleaned = sanitizeLocalMessage(raw);
      if (cleaned) entry.localMessage = cleaned;
    }
    const list = getErrors();
    list.push(entry);
    localStorage.setItem(ERR_KEY, JSON.stringify(list.slice(-MAX_ERRORS)));
  } catch { /* 診斷不影響主流程 */ }
}

// 讀出 ring buffer。每筆重新驗證欄位型別、allowlist 並重跑遮蔽——localStorage
// 可能被手動改過，schema 標記不代表內容可信；舊版字串資料一律 strict 重分類。
export function getErrors() {
  try {
    const raw = localStorage.getItem(ERR_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    // 竄改過的資料可能超量——讀出時同樣只取最後 MAX_ERRORS 筆
    return list.filter(item => item && typeof item === 'object').slice(-MAX_ERRORS).map((item) => {
      // timestamp 解析後重新輸出標準 ISO（只驗前綴會讓尾端夾帶換行等注入內容）
      const parsedT = new Date(String(item.t || ''));
      const base = {
        schema: SCHEMA_VERSION,
        t: Number.isFinite(parsedT.getTime()) ? parsedT.toISOString() : 'unknown-time',
        v: /^P\d+$/.test(String(item.v || '')) ? String(item.v) : '?',
        src: safeLabel(item.src, 'unknown', 40),
      };
      if (item.schema === SCHEMA_VERSION) {
        base.code = SAFE_CODES.has(item.code) ? item.code : 'runtime_error';
        const status = Number(item.status);
        if (Number.isInteger(status) && status >= 100 && status <= 599) base.status = status;
        if (typeof item.provider === 'string') base.provider = safeLabel(item.provider);
        if (typeof item.model === 'string') base.model = safeLabel(item.model);
        if (typeof item.location === 'string' && item.location) {
          const loc = safeLocation(item.location);
          if (loc) base.location = loc;
        }
        if (typeof item.localMessage === 'string') {
          const cleaned = sanitizeLocalMessage(item.localMessage);
          if (cleaned) base.localMessage = cleaned;
        }
        return base;
      }
      // 舊版（schema 1，msg 為任意字串，可能含第三方原文）：只重分類，不保留原文
      const legacyRaw = String(item.msg ?? '');
      const status = parseStatus(legacyRaw, null);
      base.code = classifyCode(legacyRaw, status, null);
      if (status != null) base.status = status;
      return base;
    });
  } catch {
    return [];
  }
}

// 結構化 entry → 人類可讀一行（只在匯出／顯示時組字串）。
// 這裡是輸出前最後一道防線：不假設 entry 來自 getErrors()，欄位一律重新
// allowlist／遮蔽——直接餵原始物件也不會把未清理內容帶進輸出。
export function formatDiagError(entry) {
  const provider = entry.provider != null ? safeLabel(entry.provider) : '';
  const model = entry.model != null ? safeLabel(entry.model) : '';
  const status = Number(entry.status);
  const code = SAFE_CODES.has(entry.code) ? entry.code : 'runtime_error';
  const loc = entry.location ? safeLocation(entry.location) : '';
  const parts = [];
  if (provider || model) parts.push(`${provider || '?'}/${model || '?'}`);
  parts.push(Number.isInteger(status) && status >= 100 && status <= 599 ? `HTTP ${status}` : code);
  if (loc) parts.push(`at ${loc}`);
  let line = parts.join(' | ');
  if (entry.localMessage != null) {
    const msg = sanitizeLocalMessage(entry.localMessage);
    if (msg) line += ` — ${msg}`;
  }
  return line;
}

// 掛全域錯誤監聽（main.js 啟動時呼叫一次）。
export function installGlobalErrorLog() {
  window.addEventListener('error', (e) => {
    // 真正驗證同源：CSP 允許 vercel.live 等第三方 script，「有 filename」不等於
    // 本地程式——只有 filename 解析後 origin 與本站相同才走 trusted-local，
    // 其餘（跨源、解析失敗、"Script error."、無 filename）一律 strict。
    // filename 先取 pathname（丟棄 query/fragment）再取 basename。
    let file = '';
    let sameOrigin = false;
    if (e.filename) {
      try {
        const u = new URL(String(e.filename), location.href);
        sameOrigin = u.origin === location.origin;
        file = u.pathname.split('/').pop() || '';
      } catch { /* 解析失敗視為不可信 */ }
    }
    const loc = file ? `${file}:${e.lineno || 0}` : '';
    const policy = sameOrigin && e.message && e.message !== 'Script error.' ? 'trusted-local' : 'strict';
    logError('window', e.error || e.message, { code: 'runtime_error', location: loc, policy });
  });
  window.addEventListener('unhandledrejection', (e) => {
    // rejection 來源無法判定（LLM 錯誤常以 unhandled rejection 浮出）→ 一律 strict
    logError('promise', e.reason);
  });
}

// 組診斷資訊純文字：版本＋UA＋螢幕/dpr＋PWA standalone＋主題＋provider/模型＋
// 角色/訊息計數＋錯誤 ring buffer。各段獨立 try——某段掛了其餘照出。
// settings 值一律過 safeLabel——api_model 等欄位是使用者自由輸入，不能原樣匯出。
export async function exportDiag() {
  const lines = ['── Auris 診斷資訊 ──'];
  lines.push(`版本：${APP_VERSION}`);
  lines.push(`匯出時間：${new Date().toISOString()}`);
  lines.push(`UA：${navigator.userAgent}`);
  try {
    lines.push(`螢幕：${screen.width}x${screen.height} @${window.devicePixelRatio}x（viewport ${window.innerWidth}x${window.innerHeight}）`);
  } catch { /* 診斷段落各自獨立 */ }
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
  lines.push(`PWA standalone：${standalone ? '是' : '否'}`);
  try {
    lines.push(`主題：${safeLabel(await getSetting('theme'), 'cream（預設）')}`);
    const provider = safeLabel(await getSetting('api_provider'), 'openai（預設）');
    const model = safeLabel(await getSetting('api_model'), '（未設定，用預設）');
    lines.push(`Provider／模型：${provider} / ${model}`);
    const [chars, msgs] = await Promise.all([dbCount('characters'), dbCount('messages')]);
    lines.push(`角色數：${chars}；訊息數：${msgs}`);
  } catch {
    lines.push('（讀取設定失敗：settings_read_failed）');
  }
  const errors = getErrors();
  lines.push(`── 最近錯誤（${errors.length} 筆，最多 ${MAX_ERRORS}）──`);
  if (!errors.length) lines.push('（無）');
  for (const err of errors) {
    lines.push(`[${err.t} ${err.v} ${err.src}] ${formatDiagError(err)}`);
  }
  return lines.join('\n');
}
