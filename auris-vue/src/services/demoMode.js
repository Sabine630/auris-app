// ── Demo / 教學模式旗標 ───────────────────────────────────────────────────────
// 進入方式：網址帶 ?demo=1（或 #demo）。因為 vue-router 導頁常會把 query 掉，
// 首次偵測到就寫進 sessionStorage，之後整個分頁（含跨路由）都黏著，直到關閉分頁或離開。
//
// 這個旗標是整套 demo 模式的唯一開關：
//   - db.js 依它切到隔離的 'auris-demo' 資料庫（碰不到使用者真實資料）
//   - llm.js 的 callLLM 依它回傳假腳本（不呼叫真 API、免金鑰）
//   - main.js 依它 seed 示範資料並掛載教學面板
// 旗標為 false（正常網址）時，以上全部不觸發，正式 App 行為完全不變。

const KEY = 'auris_demo_mode';

let cached = null;

export function isDemo() {
  if (cached !== null) return cached;
  try {
    // 首次載入：網址若指定 demo，寫入 sessionStorage 讓它黏著整個分頁。
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('demo') === '1';
    const fromHash = /(?:^|[?&#])demo=1(?:&|$)/.test(url.hash);
    if (fromQuery || fromHash) sessionStorage.setItem(KEY, '1');
    cached = sessionStorage.getItem(KEY) === '1';
  } catch {
    cached = false;
  }
  return cached;
}

// 產生進入 demo 的網址（保留目前 base path，例如 /auris-app/）。
export function demoEntryUrl() {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}?demo=1`;
}

// 離開 demo：清旗標並回到正式 App 首頁。
export function exitDemo() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  window.location.href = import.meta.env.BASE_URL || '/';
}
