// API 連線測試的錯誤歸因——純函式，零網路、零副作用，只依賴呼叫端提供的本地訊號。
//
// P134 病灶：ApiView.testApi 過去把「HTTP 404」一律說成「自訂網址錯了」。但 Google 的
// OpenAI 相容端點在模型不存在／不可用時同樣回 404，錯誤訊息裡常見 "not found"，於是
// 連這種情況也被判成網址問題——使用者的網址明明是對的（甚至是我們內建的預設值），
// 照建議去改網址永遠不會好。
//
// 改用三個「我們自己就知道答案」的訊號來分流，不猜供應商措辭：
//   1. 回應是不是 JSON（data 是否為 null）——不是 JSON 才代表真的打到閘道頁/HTML
//   2. 錯誤訊息有沒有回述我們自己組的 modelId——有就是模型問題
//   3. 網址是誰決定的（baseKind）——沒填自訂網址、或網址根本是程式自己組的，就不可能是
//      「自訂網址打錯」
//
// baseKind 三態（P134 二輪修正：原本用 boolean usingCustomBase 表達不了「網址是程式組的」
// 這種情況——Vertex 的網址把 project_id 嵌在路徑裡，404 可能是專案 ID 錯，不是模型問題，
// 硬套 false 會把有用的原始訊息換成誤導的「找不到模型」）：
//   'custom'    使用者填了與預設不同的網址
//   'default'   留空或與預設相同
//   'app-built' 網址由程式自己組（如 Vertex）——不接受「網址打錯／模型」二選一的猜測，
//               沒點名模型就原樣回傳供應商訊息，維持改版前的行為
//
// 判斷順序刻意與改版前完全一致（401 → 429 → 404 → 403 → 其他），避免動到其他狀態的既有文案。
export function describeConnectionFailure({ status, raw, data, modelId, baseKind } = {}) {
  const text = String(raw ?? '');

  if (status === 401 || (text.includes('invalid') && text.includes('key')) || text.includes('Unauthorized')) {
    return 'API 金鑰錯誤，請確認是否填對、或帳號是否仍有效';
  }
  if (status === 429 || text.includes('rate') || text.includes('quota')) {
    return '請求次數超限或額度用完，請稍後再試或確認帳號餘額';
  }
  if (status === 404 || text.includes('doctype') || text.includes('not found')) {
    return describe404({ raw: text, data, modelId, baseKind });
  }
  if (status === 403) {
    return '金鑰無此模型的使用權限，請確認模型 ID 或帳號方案';
  }
  return text || `HTTP ${status}`;
}

function describe404({ raw, data, modelId, baseKind }) {
  const id = String(modelId ?? '').trim();
  const mentionsModel = id && raw.toLowerCase().includes(id.toLowerCase());

  // 網址是程式自己組的（Vertex）：404 可能是專案 ID 錯，不是模型問題，不接受二選一用猜的。
  // 訊息點名了模型才判定是模型問題，否則原樣回傳供應商訊息，維持改版前的行為。
  if (baseKind === 'app-built') {
    return mentionsModel ? modelNotFoundText(id) : raw;
  }

  // 回應不是 JSON：多半真的打到閘道頁或 HTML 錯誤頁，網址文案仍然成立。
  if (!data) {
    return '找不到這個 API 位址，請確認自訂網址是否正確（需包含 /v1）';
  }

  // 錯誤訊息本身回述了我們送出的 modelId，代表伺服器認得到我們的位址、只是不認得這個模型。
  if (mentionsModel) {
    return modelNotFoundText(id);
  }

  // 使用者用的是內建預設網址——「自訂網址打錯」這個解釋在邏輯上不可能成立。
  if (baseKind === 'default') {
    return modelNotFoundText(id);
  }

  // 有自訂網址、訊息裡也沒有點出模型，兩種可能都存在，如實告知不確定。
  const modelPhrase = id ? `模型「${id}」` : '指定的模型';
  return `HTTP 404：可能是${modelPhrase}不存在，也可能是自訂網址不正確。先換個模型試試，仍失敗再檢查網址。`;
}

function modelNotFoundText(id) {
  if (!id) return '找不到指定的模型';
  return `找不到模型「${id}」——可能已下架、拼錯，或這把金鑰沒有它的權限。請換一個模型再試。`;
}
