# Auris 健檢改進計畫書（P97–P100 + repo 整理）

> 產出日期：2026-07-03（基於 dev 分支 `64d712d`，P96）
> 本計畫書由前次健檢會談定案，供執行者（AI agent）直接施工。
> 每個任務都附：位置、原因、具體做法、驗收條件。**依批次順序執行，批次之間停下來等使用者確認。**

---

## 0. 執行者必讀（開工前）

1. **先讀 `CLAUDE.md`**（專案根目錄），所有規則以它為準，特別是：
   - 只在 `dev` 分支開發；**絕對不可推 `main`**
   - **推上任何分支前必須先問使用者是否確認推送**
   - 版更 checklist：每個 P 版更新 `SettingsView.vue` 版號＋摘要（必做）、`Auris 完整開發進度總覽.md` 新增節（必做、加在檔案最下方、遞增排列）；有架構異動才更新 `ARCHITECTURE.md`（降序、新的插最上面）；防呆三原則照做
2. **不可觸碰的東西**：
   - `App.vue` 的 `ANNOUNCEMENT_VERSION`（目前 `'P94'`）與 `AnnouncementModal.vue` —— 這是使用者發正式版時自己統一處理的，dev 階段不動
   - `archive/` 目錄（唯讀舊版）
   - 專案根目錄的 build 成品（`assets/`、`index.html`）—— 只有批次 C 的 #14 會處理它們，其他批次不碰
3. **commit 風格**：比照近期 git log —— `fix: PXX 摘要`、`feat: PXX 摘要`、`refactor: PXX 摘要`、`chore: 摘要`（不佔版號的用 chore/docs）
4. **每批次完成後**：`cd auris-vue && npm run build` 必須成功，才算完工；有測試後（批次 C 起）加跑 `npx vitest run`
5. 本專案是純前端 iOS PWA（Vue 3 + Vite + IndexedDB），無後端。使用者自帶 LLM API key，支援五種 provider：`openai` / `anthropic` / `google`（AI Studio 的 OpenAI 相容端點）/ `openrouter` / `vertex`（原生格式）
6. **明確排除、不要做**：公告版號同步（#1）、長文偵測正則調整（#13）、版號 bump 自動化腳本（#15）—— 使用者已裁定不做

---

## 批次總覽

| 批次 | 版號 | 內容 | 性質 |
|------|------|------|------|
| A | P97 | #3 falsy 預設值、#5 更新預設模型、#2 UTC 換日修正 | 小而確定的修正 |
| B | P98 | #4 去重 key 改成功後寫、#8 背景掃描效能、#12 主動訊息指令單一來源 | 背景派發強化 |
| C | 不佔版號 | #16 vitest 測試基礎、#14 刪除冗餘部署管線 | 工作流整理 |
| D | P99 | #7 provider 呼叫層收斂（含 #17 的 chatEngine 拆分） | 純重構，行為不變 |
| E | P100 | #6 prompt cache 全覆蓋、#10 群聊補人設、#9 歷史訊息截斷 | 省錢＋品質 |

**順序不可調換的原因**：C 的測試是 D 重構的安全網；D 的統一呼叫層是 E 快取全覆蓋的載體。

---

## 批次 A（P97）

### 任務 #3：api.js 的 `||` 改 `??`

- **位置**：`auris-vue/src/services/api.js`
  - L100–101（vertex 的 `generationConfig`：`max_tokens`、`temperature`）
  - L116–117（OpenAI 相容 payload：`max_tokens`、`temperature`）
  - L138–139（openai 專屬：`frequency_penalty`、`presence_penalty`）
- **原因**：`customConfig.temperature || 0.8` 在傳入 `0` 時會被靜默換成 0.8（JS falsy 陷阱）。`chatEngine.js` 已統一用 `??`，此處對齊。
- **做法**：以上六處 `||` 全改 `??`。其餘行為完全不變。
- **驗收**：grep `api.js` 內不再有 `customConfig.xxx ||` 的寫法；build 通過。

### 任務 #5：更新三家預設模型

- **位置**：`auris-vue/src/services/chatEngine.js` L41–45 的 `getDefModel()`：

  ```js
  if (provider === 'anthropic') return 'claude-3-5-sonnet-20240620';  // 已 deprecated
  if (provider === 'google') return 'gemini-1.5-flash';               // 已退役
  return 'gpt-4o-mini';                                                // 過舊
  ```

- **原因**：新用戶未手動填模型時會打到失效端點直接報錯。
- **做法**：
  1. **實作當下必須先查證**各家現行模型（不可憑記憶硬寫）：
     - Anthropic：查官方 docs（`docs.claude.com` 的 models overview 頁），選當下**中階主力**（截至計畫撰寫時的候選是 `claude-sonnet-5`；若有更新以查證結果為準）
     - Google：查 `ai.google.dev` 的 models 頁，選 flash 級現行版（候選 `gemini-2.5-flash` 或更新）
     - OpenAI：查 `platform.openai.com` 的 models 頁，選 mini 級現行版（候選 `gpt-5-mini` 或更新）
  2. 選型原則：**中低價、對話品質夠、非 preview/experimental 後綴**（預設值要穩定存活久）
  3. 同步檢查 `api.js` L78 的 fallback `'gpt-4o-mini'`，改成與 `getDefModel('openai')` 相同的值
  4. 檢查 `ApiView.vue`（API 設定頁）中若有寫死的模型清單/placeholder 舉例，一併更新
- **注意**：`getDefModel` 只是「使用者沒填模型」時的預設，不影響已填模型的既有用戶。
- **驗收**：三個預設值皆為查證過的現行模型 ID；`ApiView.vue` 無殘留舊模型名。

### 任務 #2：全站「一天」界線由 UTC 改為本地時區

- **原因**：`new Date().toISOString().slice(0, 10)` 取的是 **UTC 日期**。台灣（UTC+8）的使用者，所有「每天一次」的判定實際在**早上 8 點才換日**：早上 7 點打卡的心情 8 點就消失、每日一問/自動日記的「今天」偏移 8 小時。
- **做法**：
  1. 新增共用 helper（建議放 `auris-vue/src/services/format.js`，或新開 `date.js`）：

     ```js
     // 本地時區的日期 key（YYYY-MM-DD）。全站「每天一次」的判定一律用這個，
     // 不可用 toISOString（那是 UTC，台灣時間早上 8 點才換日）。
     export function localDateKey(d = new Date()) {
       return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
     }
     ```

  2. **必改的 4 處**（換日邏輯）：
     - `App.vue:171`（`runDailyAutoGen` 的 today）
     - `App.vue:217`（`runProactiveDispatch` 的 today —— 每日一問/想你/生理期去重）
     - `App.vue:277`（`runScheduleTriggers` 的 today —— 定時提醒去重）
     - `mood.js:18`（`moodTodayKey`）
  3. **建議順手改**：`RelationView.vue:101`（顯示相識日期，UTC 會讓 00:00–08:00 的訊息顯示成前一天）
  4. **不用改**（純檔名，無功能影響）：`CharManageView.vue:145`、`ChatRoomView.vue:1223` 的匯出檔名
- **換日副作用（可接受，寫進 commit message 提醒即可）**：部署當天，舊 key（UTC 日期）與新 key（本地日期）在 UTC+8 的 00:00–08:00 之間不同，該時段內「當天一次」的功能可能多觸發一次，僅一次性。
- **驗收**：grep `toISOString().slice(0, 10)` 在 `src/` 下只剩檔名用途的 2 處；`contentEngine.js` 內 `generateDiary` 的 `today`（L224，手組 `getFullYear/getMonth/getDate`）本來就是本地日期，改用 `localDateKey()` 統一即可。

### 批次 A 收尾

- `SettingsView.vue`：`Auris · P96` → `Auris · P97`，摘要一行（例：「P97 修正每日功能換日時區、更新預設模型、API 參數預設值修正」）
- `Auris 完整開發進度總覽.md`：檔案最下方新增 P97 節（標題含日期、功能描述、受影響檔案表格），檔頭「當前版本」改 P97 並移除舊節的「當前版本」字樣
- 詢問使用者後 push dev

---

## 批次 B（P98）

### 任務 #4：去重 key 改為「生成成功後才寫」＋當日重試上限

- **位置**：`App.vue` 的 `runProactiveDispatch`（L212–269）、`runScheduleTriggers`（L272–304）、`runDailyAutoGen`（L169–191）
- **現況問題**：目前是「先 `setSetting(去重 key)` → 再生成」，API 失敗（斷網、額度用完）時訊息當天靜默丟失，不再重試。
- **做法**（逐一）：
  1. **生理期關心**（L245–249）與**每日一問**（L252–257）：改為生成**成功後**才寫 `cycle_care_{id}` / `daily_q_{id}` 當天 key。為防「壞掉的設定每 5 分鐘打一次 API」，另加當日重試計數 key（例 `daily_q_try_{id}` 存 `{ date, count }`），**同一天最多嘗試 3 次**，達上限即視同已發（寫入去重 key）。`last_proactive_` 時間戳仍在**嘗試前**寫（維持 min-gap 防疊的語意）。
  2. **定時提醒**（L294–299）：同樣改成功後寫 `sched_sent_*` key＋當日 3 次重試上限。注意它有 ±容差視窗（-4 到 +60 分鐘），重試自然發生在後續 5 分鐘掃描內、仍受視窗限制，超窗即放棄（不寫 key 也無妨，明天 key 不同）。
  3. **想你**（L259–266）：**維持現狀不改**。「當天只擲一次骰」是刻意設計（防止偶發變必發），key 記錄的是「擲過骰」而非「發成功」，生成失敗就當作今天沒想起——符合功能個性。加一行註解說明此差異，防止未來被誤「修正」。
  4. **每日自動生成**（`runDailyAutoGen`）：`last_auto_gen_date` 同樣改為「當日全部角色跑完後寫」；個別角色失敗不擋整批（現有 try/catch 已如此），但若**整批全失敗**（count === 0 且過程有拋錯）則不寫 key，下次開 app 重試。日記已有 `diaries.some(d => d.date === today)` 天然去重、貼文無去重——為防貼文重複，貼文改為以「當日已存在該角色貼文」判斷（查 `moments` 當日筆數）或接受重複風險維持現狀，擇一並註明。
- **順手做（原健檢 #12 的清理）**：`runScheduleTriggers` 內每日順手清 7 天前的 `sched_sent_*` key（settings 表無法按前綴查詢——`dbAll('settings')` 後過濾 key 前綴＋日期後綴即可，一天跑一次）。
- **驗收**：模擬 API 失敗（填錯 key）時，每日一問會在後續掃描重試、最多 3 次；成功後當天不再發。

### 任務 #8：背景掃描不再全量載入訊息

- **位置**：`db.js`（新 helper＋DB 升版）、`chatEngine.js` 的 `hasUnrepliedProactive`（L560–566）、`App.vue` 的 `runProactiveDispatch`（L242 的 `dbIdx('messages', 'charId', c.id)`）
- **現況問題**：每 5 分鐘、每個角色把**全部**聊天記錄撈進記憶體，只為了檢查「訊息數 ≥ 3」和「最後一則是否為未回覆的主動訊息」。記錄上萬則後 iOS PWA 會有感。
- **做法**：
  1. `db.js` 新增 count helper（現有 `charId` index 直接支援）：

     ```js
     export const dbIdxCount = (s, i, v) => new Promise((r, j) => {
       const tx = db.transaction(s, 'readonly');
       tx.objectStore(s).index(i).count(v).onsuccess = e => r(e.target.result);
       tx.onerror = j;
     });
     ```

     `runProactiveDispatch` 的 `msgs.length >= 3/5` 檢查改用它。
  2. **DB 升版 v6 → v7**，`messages` 加複合 index `['charId', 'createdAt']`。注意現行 `onupgradeneeded` 只在「建 store 時」建 index，**對既有 store 加 index 必須走 upgrade transaction**：

     ```js
     const r = indexedDB.open('auris', 7);
     r.onupgradeneeded = (e) => {
       const d = e.target.result;
       // ...既有的 store 建立邏輯不動...
       // v7：對既有 messages store 補建複合 index（用 upgrade transaction 取 store）
       const tx = e.target.transaction;
       const ms = tx.objectStore('messages');
       if (!ms.indexNames.contains('charId_createdAt')) {
         ms.createIndex('charId_createdAt', ['charId', 'createdAt'], { unique: false });
       }
     };
     ```

  3. `db.js` 新增「取某角色最新 N 則」helper：對 `charId_createdAt` 開 cursor、`IDBKeyRange.bound([charId, 0], [charId, Infinity])`、direction `'prev'`，取到 N 則即 resolve。
  4. `hasUnrepliedProactive` 改用它：cursor 逆向迭代、跳過 `type === 'hv'`、取第一則真實訊息即可判定，不再 getAll＋sort。
- **風險提醒**：DB 升版動的是使用者真實資料，upgrade handler 內**不可**動既有資料內容，只加 index（IndexedDB 加 index 會自動回填，安全）。升版程式碼須容忍「全新安裝直接開 v7」與「v6 升 v7」兩種路徑。
- **驗收**：開 app 後背景掃描不再呼叫 `dbIdx('messages', ...)` 全量撈取（`runProactiveDispatch` 與 `hasUnrepliedProactive` 皆然）；既有資料升版後聊天記錄完好、主動訊息防疊行為不變。ARCHITECTURE.md 的 IndexedDB 表格補上新 index（防呆原則 3）。

### 任務 #12：主動訊息任務描述單一來源

- **位置**：`chatEngine.js` 四個主動訊息函式，每個都有「同一段任務描述手寫兩份」：
  - `generateProactiveMessageStream`（L573–579）：system prompt 尾段 vs `buildProactiveHistory` 的 task 參數
  - `generateCycleCareMessage`（L768–773）：`careGoal` 已抽出但兩處注入文字仍有各自加料
  - `generateScheduleMessage`（L806–809）：`goal` vs task 參數
  - `generateMissYouMessage`（L1097–1103）、`generateDailyQuestion`（L1138–1140）：同樣 pattern
- **原因**：兩份手打文字已有些微 drift，未來改措辭易漏改一邊。**雙重注入本身是刻意設計（保留）**，只是要共用同一份文字。
- **做法**：每個函式把任務核心描述抽成一個 `const task = '...'`，system prompt 尾段與 `buildProactiveHistory(history, task, active)` 引用同一變數。組裝時允許各位置加不同的「框」（如 system 端的【主動訊息】標頭、history 端的「這不是對方傳來的訊息…」包裝——那些框已在 `buildProactiveHistory` 內統一），但**任務內容本體只能有一份**。
- **重要約束**：重構後實際送出的 prompt 內容應與現況**語意等價**（措辭微調可接受，語意不可變）。改完把四個函式現況與新版的最終 prompt 各印一次對照確認。
- **驗收**：四個函式中不存在重複手寫的任務描述；主動訊息實測（可用「立即傳一則」的開發路徑或手動觸發）行為正常。

### 批次 B 收尾

- SettingsView → P98＋摘要；進度總覽補 P98 節；ARCHITECTURE.md 因 DB 升版**必須**更新（版本紀錄插最上方＋IndexedDB 表格）
- 詢問使用者後 push dev

---

## 批次 C（不佔版號）

### 任務 #16：建立 vitest 測試基礎

- **做法**：
  1. `cd auris-vue && npm i -D vitest`，`package.json` scripts 加 `"test": "vitest run"`
  2. 建 `auris-vue/src/services/__tests__/`，優先覆蓋以下**純函式**（全部無依賴、不需 mock IndexedDB）：

     | 對象 | 重點案例 |
     |------|---------|
     | `format.js` `formatContent` | **XSS 防線**：`<script>`、`&`、`>` 被 escape；`enableRich` 星號→`<em>`、「」→`<span>`；富文本不引入未 escape 內容 |
     | `format.js` `splitReply` | 空行切段、`maxSegments` 尾段合併、無空行單段、空字串回 `[]`、引號泡泡切分（`」` 接 `「`、夾 `*動作*` 的交界） |
     | `tokens.js` `estimateTokens` | CJK/英數混排、空字串 |
     | `chatEngine.js` `shouldBusyRead` | 深夜（23–8 點）必 false、`busyRead` 關閉必 false、workTime 解析（`9:00-18:00`、`09:30～18:30`、跨夜 `22:00-06:00`、無法解析的自由文字）——用注入的 `now` 參數測，機率部分以 `Math.random` mock 驗證 0.15/0.4 分界 |
     | `chatEngine.js` `dayPeriod`、`timeAnchorLine` | 各時段分界值（4:59/5:00、22:59/23:00） |
     | `mood.js` `moodContext` | 有/無 note、未知 mood key 回空字串 |
     | `cycle.js` `getCyclePhase` | 經期第 1 天、經期前 2 天、無設定回 null（讀函式簽名後補案例） |
     | 批次 A 的 `localDateKey` | 固定 Date 輸入的輸出格式 |

  3. 注意：`chatEngine.js` 頂部 import 了 `db.js` 等含 IndexedDB 的模組，Node 環境下 import 整個檔案可能失敗。若無法直接 import，**允許把被測純函式搬到獨立小模組**（如 `shouldBusyRead`、`dayPeriod` 移入新檔 `services/busyRead.js` / 併入 `format.js`），chatEngine 改為 re-export，維持對外 API 不變——這同時是 #17 拆檔的第一小步。
  4. 加 GitHub Actions（可選，若使用者同意）：在 dev push 時跑 `npm run build && npx vitest run`。**先問使用者要不要**，不要擅自加。
- **驗收**：`npx vitest run` 全綠；至少 25 個測試案例；`npm run build` 不受影響。

### 任務 #14：刪除冗餘部署管線（根目錄成品）

- **背景（已查證，2026-07-03）**：GitHub Pages 自 **2026-05-20** 起改由 `.github/workflows/deploy.yml` 自動 build（來源 `auris-vue/dist`）部署；根目錄的 `assets/`、`index.html` 從那天起**不再被正式版使用**。舊管線（pages-build-deployment，吃分支根目錄）最後一次執行是 2026-05-20；新管線最近一次 2026-06-30 執行成功。
- **做法**：
  1. **先驗證**（不可跳過）：`npm run build` 後檢查 `auris-vue/dist/` 內容包含 `index.html`、`404.html`、`favicon.svg`、`icons.svg` 等正式版需要的檔案（來源應為 `auris-vue/public/`）。若 `404.html` 等只存在於專案根目錄而不在 `public/`，先把它們**搬進 `auris-vue/public/`** 再繼續。
  2. `git rm` 專案根目錄的 build 成品：`assets/` 整個目錄、根目錄 `index.html`。逐一確認 `404.html`、`favicon.svg`、`icons.svg`：已搬入 `public/` 或 dist 已含等價物者一併移除。**`vercel.json` 保留**（Vercel 測試版部署仍需要——先打開看它的設定指向哪裡：若它指定 build `auris-vue`，不受影響；若它直接 serve 根目錄靜態檔，**停下來回報使用者**，Vercel 測試版可能依賴根目錄成品，此時需先改 Vercel 設定再刪）。
  3. 更新 `CLAUDE.md` 的「Build & Deploy 流程」：發布正式版簡化為「使用者確認 → merge dev 進 main → push origin main（GitHub Actions 自動 build＋部署）」，刪除手動 build/copy/清舊 hash 的段落；「專案架構速查」中「Build 輸出：直接 copy 到專案根目錄」一行同步修正。
  4. ARCHITECTURE.md 若有描述部署方式的章節，同步更新。
- **⚠️ 最重要的一步**：這批改動推上 dev 後**不會**影響正式版（workflow 只看 main）；但**下次使用者要發正式版時**，merge 進 main 前務必再次向使用者說明「這次 main 上的根目錄成品會消失、由 Actions 自動 build 取代」，取得明確同意。
- **驗收**：dev 上 `npm run build` 成功且 dist 內容完整；Vercel 測試版部署後 app 正常開啟（等 Vercel 自動部署後請使用者確認）；CLAUDE.md 新流程描述與現實一致。

### 批次 C 收尾

- commit 用 `chore:` / `test:` / `docs:` 前綴，不佔 P 版號、不動 SettingsView
- 詢問使用者後 push dev

---

## 批次 D（P99）：provider 呼叫層收斂（#7，含 #17 的 chatEngine 部分）

### 現況

vertex / anthropic / openai-相容 的三叉分支**複製了 5 份**：

| 呼叫點 | 位置 | 特有需求 |
|--------|------|---------|
| `generateAIResponseStream` | chatEngine.js L379–465 | 串流、圖片多模態、**anthropic cache blocks**、動態 max_tokens |
| `generateProactiveMessageStream` | L569–627 | 串流、`signal`（可中斷） |
| `streamWithSystem` | L631–669 | 串流（touch/busy 已共用此函式） |
| `generateGroupAIResponseStream` | L995–1053 | 串流、`onStart` 回呼 |
| `api.js` `sendLLMRequest` | api.js L74–159 | 非串流、openai 專屬 penalties |

新增 provider 或改 header 要改 5 處，是 bug 溫床，也擋住批次 E 的快取全覆蓋。

### 目標設計

新檔 `auris-vue/src/services/llm.js`，單一入口：

```js
// 統一 LLM 呼叫層。所有 provider 分支只存在於這個檔案。
// opts: {
//   system,          // string 或 blocks 陣列 [{ text, cache?: true }, ...]（cache 只對 anthropic 生效，其他 provider 串接成純字串）
//   messages,        // [{ role, content }]，content 可為多模態陣列（由本層轉各家格式）
//   maxTokens, temperature,
//   stream,          // true 走 SSE（vertex 不支援串流 → 一次回，onChunk 收整段，行為與現況一致）
//   onChunk, onStart, signal,
//   image,           // base64 data URL，附加到最後一則 user 訊息（轉各家多模態格式）
//   extra,           // { frequency_penalty, presence_penalty }：僅 provider === 'openai' 時帶上（沿用現況語意）
// }
// 回傳 { fullText, truncated }
export async function callLLM(opts) { ... }
```

實作要點：

1. provider/model/base/apiKey 的解析（現況散在 `buildAIChatSetup`、`buildGroupChatSetup`、`sendLLMRequest` 三處，邏輯相同）收斂成 `llm.js` 內部的 `resolveLLMConfig()`，讀 settings 並套 `getDefModel`/`getDefBase`（這兩個函式搬進 `llm.js`）
2. `parseSSEStream`、`fetchWithTimeout`、`getVertexToken` 搬入或由 `llm.js` 引用；90 秒 timeout、各家 headers（含 `anthropic-dangerous-direct-browser-access`、`anthropic-version`、prompt-caching beta header）、錯誤訊息抽取（`e.error?.message || HTTP xxx`）**逐字保留現況行為**
3. anthropic 的 system blocks：`system` 傳陣列時轉成 `[{ type:'text', text, cache_control: {type:'ephemeral'} (若 cache:true) }, ...]`；其他 provider 把陣列 join 成單一字串塞 system role（vertex 塞 `systemInstruction`）
4. 多模態：圖片轉換邏輯（anthropic `image/source`、openai `image_url`、vertex `inlineData`）從 `generateAIResponseStream` 的 `buildImgHistory` 移入
5. **遷移五個呼叫點**逐一改用 `callLLM`，刪除原地的三叉分支。`sendLLMRequest` 保留為薄包裝（`callLLM({ stream:false, ... })`）以免動到 `contentEngine.js` 的四個呼叫點與心聲/摘要，或干脆全部改喊 `callLLM`——擇一，以 diff 小者為準
6. 本批次**只搬運、不改行為**：送出的 request body（除欄位順序外）應與現況等價。特別注意保留：
   - 一般聊天 anthropic 的 cache blocks（現有行為）
   - proactive 的 `signal` 傳遞
   - 群聊的 `onStart` 時機（HTTP OK 之後、開始讀串流之前）
   - vertex 非串流「整段一次 onChunk」
7. #17 順帶完成的部分：`chatEngine.js` 應因此瘦身（三叉分支全數移除）。**不要**進一步拆 heartVoice/proactive 到別的檔案（那是未來的事，本批次控制 diff 範圍）

### 驗證（本批次最重要）

- vitest 全綠（批次 C 建立的測試不可壞）
- 手動冒煙測試（請使用者配合，至少用其常用 provider）：一般聊天串流、帶圖傳訊、重新生成、主動訊息（聊天室內觸發）、輕觸互動、群聊回覆、寫日記/發貼文（走 sendLLMRequest 路徑）
- ARCHITECTURE.md：新增 `llm.js` 的 service 說明、目錄結構、版本紀錄（降序插最上）

### 批次 D 收尾

- SettingsView → P99；進度總覽 P99 節；ARCHITECTURE 必更
- 詢問使用者後 push dev

---

## 批次 E（P100）

### 任務 #6：prompt cache 全覆蓋（anthropic）

- **前提**：批次 D 完成，所有呼叫走 `callLLM`。
- **現況**：只有一般聊天（`generateAIResponseStream`）把 system 拆成「穩定段（cache_control）＋易變段」。主動訊息、touch、busy、cycleCare、schedule、missYou、dailyQuestion 全都把 `finalSystemPrompt` 當一整條字串送，**無法命中快取**——而它們的穩定段前綴與一般聊天完全相同。
- **做法**：
  1. `buildAIChatSetup` 已回傳 `systemStable` / `systemVolatile`——所有基於它的呼叫點改傳 blocks：`[{ text: systemStable, cache: true }, { text: systemVolatile + 任務尾段 }]`。任務尾段（【主動訊息】【親暱動作】【已讀後補回】等）**必須放在易變 block**，絕不可拼進穩定段（會打破快取）
  2. 涉及函式：`generateProactiveMessageStream`、`generateTouchResponseStream`、`generateBusyReplyStream`、`generateCycleCareMessage`、`generateScheduleMessage`、`generateMissYouMessage`、`generateDailyQuestion`
  3. `contentEngine.js`（貼文/日記/夢境/留言）prompt 結構不同、每次全變，**不改**（快取無利可圖）
  4. 非 anthropic provider 行為不變（blocks 由 `callLLM` 自動 join）
- **驗收**：以 anthropic key 實測——先聊一句、再觸發一則主動訊息，第二次呼叫的 response usage 應出現 `cache_read_input_tokens > 0`（可在 Network 面板看回應，或暫時 console.log usage 驗完移除）。

### 任務 #10：群聊補人設與時間感

- **位置**：`chatEngine.js` `buildGroupChatSetup`（L919–973）的 `systemPrompt`
- **現況**：只注入 persona＋style，角色在群聊裡「失憶」。
- **做法**：在群聊 system prompt 中加入（比照單聊的組法，token 保持克制）：
  - `storyCtx`（背景故事，L293 同款組法）
  - `c.status`（近況）、`c.hobby`（喜好）——各一行，有才加
  - 時間錨：`c.timeAware` 開啟時加一行 `現在時間：${timeAnchorLine()}`
  - **不加**：長期記憶、世界書、天氣、作息（群聊 token 成本 × 人數，維持輕量；註解註明是刻意取捨）
- **驗收**：群聊中角色能自然提及自己的背景設定；多人群組回覆速度無明顯劣化。

### 任務 #9：歷史訊息單則長度上限

- **位置**：`chatEngine.js` `buildAIChatSetup` 的 history 組裝（L351）
- **現況**：`allMsgs.slice(-(c.memory || 20))` 整則原文送出——歷史裡一篇 2000 字故事會在之後每一輪重複計費。
- **做法**：

  ```js
  // 歷史單則截斷：最近 KEEP_FULL 則保留全文（接續剛寫的長文不受影響），
  // 更早的單則超過 HIST_MSG_CAP 字元則截頭並加省略號——省 token，
  // 長篇舊內容的細節交給長期記憶摘要補位。
  const HIST_MSG_CAP = 600;
  const KEEP_FULL = 4;
  const recent = allMsgs.slice(-(c.memory || 20));
  const history = recent.map((m, i) => {
    let content = m.content;
    if (i < recent.length - KEEP_FULL && content.length > HIST_MSG_CAP) {
      content = content.slice(0, HIST_MSG_CAP) + '…（後略）';
    }
    return { role: m.role === 'user' ? 'user' : 'assistant', content };
  });
  ```

- **品質保護（已與使用者確認的邊界）**：最後 4 則永不截斷；截斷只影響「五輪之前的單則長文」的尾部細節。
- **注意**：群聊 history（`buildGroupChatSetup`）本來就 slice(-12) 且群聊訊息短，不用動。
- **驗收**：正常對話體感無變化；歷史含長文時，後續輪次的 input token 明顯下降（可由 anthropic usage 或 openai usage 欄位抽查）。

### 批次 E 收尾

- SettingsView → P100；進度總覽 P100 節；ARCHITECTURE 視情況（prompt 組裝邏輯變更建議記一筆）
- 詢問使用者後 push dev

---

## 附錄：健檢時已查證的事實（免重查）

- GitHub Pages 部署來源已是 GitHub Actions（`deploy.yml`，來源 `auris-vue/dist`）；分支式舊管線最後執行 2026-05-20；根目錄成品自那之後未被正式版使用
- `ANNOUNCEMENT_VERSION`（App.vue）= `'P94'`、公告內容 = P95、app = P96 —— **使用者已知悉，正式版時自行統一，不要動**
- `chatEngine.js` 內 `c.temperature ?? 0.8` 的 `??` 用法是正確範本；api.js 的 `||` 是要修的對象
- 心聲（heart voice）存 `memories` 表、訊息表中 `type === 'hv'` 為過濾慣例；主動訊息 kind 集合見 `PROACTIVE_KINDS`（chatEngine.js L556）
- 使用者的既定裁決：#1 不管、#13 不改、#15 不做、#9 可截斷（不玩長故事接續也有 KEEP_FULL=4 保護）、#16 同意、#14 同意
