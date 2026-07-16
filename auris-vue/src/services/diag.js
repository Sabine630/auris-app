// ── 診斷服務（P105 M3）───────────────────────────────────────────────────────
// 本地錯誤日誌（ring buffer、只存這台裝置）＋一鍵匯出診斷資訊，降低 bug 回報
// 來回成本（P103 教訓）。隱私底線：絕不含訊息內容與 API 金鑰。
// 錯誤日誌存 localStorage（同步、不依賴 IndexedDB——DB 初始化失敗也記得下來）。
import { APP_VERSION } from '../version.js';
import { getSetting, dbCount } from './db.js';

const ERR_KEY = 'auris_diag_errors';
const MAX_ERRORS = 30;
const MAX_MSG_LEN = 300;

// 記一筆錯誤（逐筆蓋當時版號）。診斷用途，自身絕不能再拋錯。
export function logError(src, msg) {
  try {
    const list = getErrors();
    list.push({
      t: new Date().toISOString(),
      v: APP_VERSION,
      src,
      msg: String(msg ?? '').slice(0, MAX_MSG_LEN),
    });
    localStorage.setItem(ERR_KEY, JSON.stringify(list.slice(-MAX_ERRORS)));
  } catch { /* 診斷不影響主流程 */ }
}

export function getErrors() {
  try {
    const raw = localStorage.getItem(ERR_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// 掛全域錯誤監聽（main.js 啟動時呼叫一次）。
export function installGlobalErrorLog() {
  window.addEventListener('error', (e) => {
    const loc = e.filename ? `（${e.filename.split('/').pop()}:${e.lineno}）` : '';
    logError('window', `${e.message || '未知錯誤'}${loc}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    logError('promise', r?.message || String(r ?? '未知原因'));
  });
}

// 組診斷資訊純文字：版本＋UA＋螢幕/dpr＋PWA standalone＋主題＋provider/模型＋
// 角色/訊息計數＋錯誤 ring buffer。各段獨立 try——某段掛了其餘照出。
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
    lines.push(`主題：${(await getSetting('theme')) || 'cream（預設）'}`);
    const provider = (await getSetting('api_provider')) || 'openai（預設）';
    const model = (await getSetting('api_model')) || '（未設定，用預設）';
    lines.push(`Provider／模型：${provider} / ${model}`);
    const [chars, msgs] = await Promise.all([dbCount('characters'), dbCount('messages')]);
    lines.push(`角色數：${chars}；訊息數：${msgs}`);
  } catch (e) {
    lines.push(`（讀取設定失敗：${e?.message || e}）`);
  }
  const errors = getErrors();
  lines.push(`── 最近錯誤（${errors.length} 筆，最多 ${MAX_ERRORS}）──`);
  if (!errors.length) lines.push('（無）');
  for (const err of errors) {
    lines.push(`[${err.t} ${err.v} ${err.src}] ${err.msg}`);
  }
  return lines.join('\n');
}
