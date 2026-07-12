# 🎨 Auris 完整開發進度總覽

**最後更新**：2026-07-12
**當前版本**：P108（朗讀功能暫時下架——iOS 系統音不符體驗標準，引擎保留待高品質 TTS）
**狀態**：上線後持續優化中

---

## 📌 專案資訊

- **專案名稱**：Auris（你說，他在聽）
- **專案起始**：2026-05-04（GitHub repo 建立日；更早的 HTML 單檔原型未進版控）
- **類型**：AI 角色聊天 PWA 應用
- **技術棧**：Vue 3 + Vite + Vue Router 4 + IndexedDB + CSS Variables（P37 起為正式架構）
- **部署**：GitHub Pages（正式 `main`）／ Vercel（測試 `dev`）

### 🔗 重要連結

| 項目 | 網址 | 說明 |
|------|------|------|
| 正式版 | https://sabine630.github.io/auris-app/ | Production，`main` 分支，對外公開 |
| 測試版 | https://auris-app-git-dev-sabine630-6243s-projects.vercel.app | Staging，`dev` 分支，自動部署 |
| GitHub | https://github.com/sabine630/auris-app | 原始碼 |
| 登入密碼 | `auris2025` | 密碼鎖 |

> 文件分工：本檔記錄「做了什麼、何時做、為什麼」；技術結構（資料表、服務層、路由、CSS）詳見 `auris-vue/ARCHITECTURE.md`。

---

## 🚀 產品藍圖（下一步）

### 🔵 階段 B：關係深化與互動擴展（進行中）

#### 體驗強化
- 🟢 **聊天訊息全文搜尋** — 聊天室內搜尋關鍵字，跳到那則訊息
- 🟢 **語音輸入** — Web Speech API，用說的傳訊息
- 🟢 **首頁動態化＋alert 換 modal** — 日記／夢境磚塊狀態動態顯示；系統 alert 改為自訂 modal

#### 資料管理
- 🟢 **單角色匯出＋匯入** — `.json` 格式，含設定＋記憶，方便備份與分享
- 🟢 **對話匯出改 JSON＋匯入** — 統一格式，對話記錄可完整還原

#### 情感連結
- 🟢 **生日＋紀念日系統** — 角色與使用者雙方皆有，到日期角色有特別互動
- 🟢 **節日／季節感知** — 角色知道今天是什麼節日／季節，自然帶入對話
- 🟢 **角色主動問你問題** — 角色主動發出問題，製造雙向互動感
- 🔄 **角色偶爾傳圖** — 角色偶爾「傳一張照片」給你（預設圖或 AI 生成）（尚未實作）

#### 伴侶互動（模擬真實手機關係體驗）
- 🟢 **關係主頁** — 認識幾天、對話則數、第一次聊天日期等關係紀錄
- 🟢 **在一起幾天計數器** — 關係開始後的天數，含里程碑
- 🟢 **倒數計時** — 下一個重要日子還有幾天
- 🟢 **每日一問** — 角色每天問你一個問題，建立雙向了解
- 🟢 **「我想你」輕觸** — 角色傳一個「想到你了」的小動作
- 🟢 **共同願望清單** — 你們想一起做的事情清單
- 🟢 **共同備忘錄** — 共用筆記本，記約定、計畫、待辦

#### 待定
- 🔄 **關係階段系統** — 使用者自定義多個關係階段，每階段設定角色行為變化，手動推進（攻略感）

#### 暫緩（先不做，無清晰使用情境）
- ⏸ 劇本體驗／小說／線下模式
- ⏸ 寵物屋
- ⏸ 任務系統
- ⏸ PWA 系統推播（iOS 技術限制，需後端，與純前端設計衝突）

#### 已完成（原階段 B 項目）
- ✅ **世界觀設定書 World Book** — 已完成（P65）
- ✅ **角色與玩家作息設定** — 已完成（P62／P63）
- ✅ **自動總結記憶** — 已完成（P62）
- ✅ **玩家自訂大頭貼** — 已完成（P62）
- ✅ **圖片傳送與 AI 識別** — 已完成（P65）

### 🟣 階段 C：系統底層重構（長期）

- 🔵 **多世界系統 🌍** — IndexedDB 全域加入 `worldId` 隔離資料（`worlds` 表與 `characters.worldId` 索引已預留）；支援不同世界觀完全隔離、`me_settings` 各自獨立
- 🔵 **完整 PWA 離線體驗** — Service Worker 快取，評估封裝上架 App Store / Google Play

---

## ⏳ 開發階段總覽（Phase History）

> Auris 經歷兩個時代：**P1–P36 為 HTML 單檔時代**（`auris-pXX-*.html`，最終態 `auris-p36-bugfix.html`，5,489 行），**P37 起遷移至 Vue 3** 並成為正式架構。以下依時序記錄。

---

## ✅ Phase 1：核心功能（P1–P9，HTML 單檔時代）

### P1 基礎架構（2025 年底）
- 手機 UI 框架（390×844 桌面預覽）、密碼鎖、SPA 導航、IndexedDB
- 六大主題：奶白 cream／暖米 warm／深夜 dark／霧灰 gray／海霧 ocean／抹茶 matcha
- 初版資料表：characters / messages / memories / moments / diary / dreams / groups / group_messages / settings

### P2 角色系統（2026-01）
- 角色 CRUD，5 Tab 設定（基本資訊／個性背景／說話方式／關係規範／回覆設定）
- 頭像（Emoji + 圖片）、背景故事章節系統、全局「我的設定」
- AI 參數：記憶條數 5–100（預設 20）、溫度 0–2（預設 0.8）、回覆延遲、回覆條數 1–8
- 自動功能開關：時間感（預設開）、Heart Voice／自動日記／自動貼文（預設關）

### P3–P4 聊天系統（2026-02）
- 單人聊天室、群組聊天（2+ 角色）、連續訊息縮排、打字動畫
- 三種回覆模式：手動／自動／自動可打斷

### P5 API 整合（2026-02）
- 支援 OpenAI、Anthropic、Google 三家，OpenAI 相容格式
- 自訂 API 位址（代理）、模型選擇器、連線測試

### P6 社群功能（2026-03）
- AI 自動生成貼文（含標籤）、按讚、用戶留言 + AI 回覆留言、角色篩選

### P7 生活記錄（2026-03）
- 日記（每日一篇、心情標記）、夢境（詩意感官細節）
- 黑盒子 Heart Voice：每 5 輪強制 + 情緒關鍵字觸發，聊天室內即時淡入卡片
- 通知中心：貼文／日記／夢境／心聲整合，已讀未讀

### P8 進階功能（2026-04）
- 多角色篩選統一體驗、時間感系統、記憶條數調整、AI 參數完整化

### P9 資料管理（2026-04）
- JSON 匯出／匯入（含版本號）、PWA 可加入主畫面、Canvas 動態 Icon、Manifest

---

## 🔧 Phase 2：Bug 修復與優化（P10–P36，HTML 單檔時代）

### P10 Splash z-index 修復（2026-04-20）
啟動畫面壓在密碼鎖上方 → 調整 `#splash`/`#lock` z-index 層級。

### P11 聊天列表完整優化（2026-04-25）
搜尋、Tab 篩選（全部／未讀）、三種排序、左滑操作（置頂／清空／刪除）、批量管理、標記全部已讀。同時修復 Tab 位置、PWA Icon、viewport-fit、時間格式、未讀邏輯等十餘項。

### P12 未讀計數精確化（2026-05-01）
布林 `hasUnread` → 精確 `unreadCount`；首頁 badge 顯示總未讀數（>99 顯示 99+）；新增 `document.body.dataset.page` 頁面追蹤，AI 回覆時判斷用戶是否在該聊天室才累加未讀。

<details>
<summary><b>P12-bugfix：10 個 Bug + Heart Voice 重設計 + Prompt 升級（2026-05-10）</b></summary>

**嚴重（4）**：`deleteChar` 空殼覆蓋實版導致刪不掉角色；`markAllRead` 命名衝突；進聊天室未清零 `unreadCount`；首頁 badge 顯示角色數而非訊息數。
**中等（5）**：離開聊天室 typing 狀態殘留致按鈕鎖死；swipe 監聽器重複綁定（改 Event Delegation）；群組無 finally 清 typing；刪角色/清空未清關聯資料（messages/memories/diary/dreams/moments）；群組頭像 XSS（補 `esc()`）。
**小（1）**：首頁黑盒子計數含已刪角色孤立資料（交叉比對過濾）。

**Heart Voice 重設計**：從「每次回覆都觸發」改為智慧觸發——每 5 輪強制一次，或 35 個情緒關鍵字命中提早觸發；心聲生成後若用戶仍在該聊天室，直接 inline 淡入顯示。
**Prompt 升級**：貼文 80→100–180 字、日記 150→200–300 字、夢境 120→150–220 字，max_tokens 統一拉到 800，禁止空洞模板。
</details>

### P13 UI 細節修復（2026-05-02）
設定頁標題置中（補 `ph-act` 佔位）、Gemini 端點確認無誤、導覽列高度 80→68px。

<details>
<summary><b>P14–P18：iPhone PWA 底部空隙除錯（2026-05-03~06，多輪未果 → P28 解決）</b></summary>

PWA standalone 模式下導覽列與螢幕底部有 40–50px 空隙。依序嘗試：雙層 safe-area-inset（累加更糟）→ 只在 nav 處理 + calc()（無效）→ height:auto + min-height（無效）→ 修 flex 佈局（無效）→ position:fixed 貼底（仍有空隙）。
**教訓**：env(safe-area-inset-bottom) 在 PWA 模式行為不穩，硬編碼與 calc 都不可靠，最終於 P28 以 CSS 變數動態驅動解決。
</details>

### P19–P27 中間版本（2026-05-07~14，未詳細記錄）
PWA 底部空隙多輪嘗試、鍵盤遮蔽處理、UI 與 prompt 微調。可從版本檔名後綴回溯主題。

### P28 PWA 底部空隙最終解決（2026-05-15，`auris-p28-pad-vars.html`）
以動態 CSS 變數 `--kb-offset` 配合 `safe-area-inset-bottom` 驅動 `.phone` 的 padding-bottom；`setupViewportTracking()` 監聽 `visualViewport` 即時更新，徹底告別硬編碼空隙。困擾 P14–P18 多輪的問題收尾。

### P29–P31 中間版本（2026-05-16~17，未詳細記錄）

### P32 鍵盤再修 + 複製同步 + 長篇放寬 + 貼文按鈕重構（2026-05-17）
`.phone` 加 `padding-bottom:var(--kb-offset)`＋transition；複製改同步觸發（避 iOS 拒絕）；sendMsg 動態 max_tokens（長篇 8000／一般 2000）並偵測截斷；貼文 `needPick` 多角色選擇器。**殘留**：長篇 regex 不認中文數字、HV max_tokens 太寬、生成按鈕無反應 → P33。

### P33 三 Bug 修復 + Gemini 相容性（2026-05-18~19）
- **長篇被截斷**：regex 只認「寫＋阿拉伯數字」，「說個五百字的故事」漏判。擴充中文數字與口語動詞（說/講/來/編/想/聽…＋故事/小說/劇本…），16 測試案例全過。
- **HV 變續寫故事**：max_tokens 400→80、prompt「50 字」→「30 字」、情境只留 user/AI 最後一句、後處理改找最後一個句尾標點截斷。
- **生成按鈕無反應（真因）**：Gemini OpenAI 相容端點不支援 `frequency_penalty`/`presence_penalty`，回 HTTP 400 被吞。改為**只在 OpenAI 才加 penalty**。
- **教訓**：靜默失敗類 bug 第一步是抓網路請求，不是讀 code——此根因無法從程式碼推測，是瀏覽器版 Claude 在 Network panel 抓到 400 才確認。

### P34 群組點名 + 留言區佈局（2026-05-19）
點名角色卻沉默：sysPrompt 未告知被點名 → 偵測點名、被點名優先排序且必回、prompt 塞點名提示。貼文留言框下方空白：sticky 改 flex 直欄、input 換 textarea。

### P35 鍵盤隱藏 nav + 群組越界（2026-05-20 上午）
鍵盤拉起直接隱藏底部 tab（`.nav.kb-hidden`，LINE/IG 做法）；群組角色幫使用者說話 → 改寫歷史格式 + prompt 禁令 + 輸出清洗。**踩坑**：清洗太兇誤殺合法對話 → P36。

### P36 群組清洗過度誤殺修復（2026-05-20 下午）
P35 把含「角色名：」的輸出全截成空字串。改保守版：只砍開頭自己名字前綴、只在「換行＋他角色名：」才截斷、清洗後為空則 fallback 回原文。**教訓**：規則寧可漏異常不誤殺、必須有保險絲、本機要先測正常案例。

---

## ✅ Phase 3：Vue 3 架構重構（P37–P38）

> HTML 單檔（P36，5,489 行）功能完整但維護成本暴增，P37 起遷移至 Vue 3 + Vite 元件化開發，成為正式架構。

### P37 Vue 3 全面重構（2026-05-20）
- Vanilla JS 單 HTML → Vue 3 + Vite，21 個 View 元件，Vue Router 4 取代 `nav_()`
- 自製 `globalStore`（reactive，不依賴 Pinia）、IndexedDB 服務層抽離（db / api / contentEngine）
- 新增（HTML 版沒有）：Onboarding 4 步驟引導、底部 nav 智能高亮、LockView 開發佔位

### P38 Vue 版 UI 首次全面比對修復（2026-05-20）
補齊 modal CSS（modal-overlay/box/btn）；空狀態按鈕 `btn-primary`→`empty-cta`；日記/貼文/夢境空狀態條件修正；底部「對話」tab 由 `/chat` 改連 `/chat-list` 並重寫 active 判斷；API 模型清單更新、選擇 UI 改 radio 列表。

---

## ✅ Phase 4：Vue 版持續迭代（P39–P100）

### P39 7 大 Bug 修復 + PWA 動態圖示（2026-05-21）
Canvas 依主題動態產生「A」字 PWA 圖示與 Favicon。修復：GitHub Pages 重載 404（`public/404.html` SPA redirect）、內容太短（提高字數與 max_tokens）、群組 typing 無訊息（Regex escape + 重試）、貼文回覆失效（Anthropic system 分離）、不能刪角色（管理頁加刪除 + 關聯清理）、群組不能改名/成員、聊天 `...` 按鈕改底部選單。

### P40 群組第三方 Proxy 偵錯與防護（2026-05-22）
群組在特定 Proxy 下靜默回空。改將底層 Exception/空字串封裝為 `【系統偵錯】` 訊息寫入 DB 並渲染；支援陣列錯誤格式 `[{"error":...}]`；max_tokens 800→4000 規避非官方節點強制截斷。

### P41 UI Bug 修復（2026-05-22，v1.0.42）
- 夢境雙月亮：移除空狀態重複月亮，只留頁首裝飾。
- 鍵盤白色空白：`.phone` 由 `min-height:100dvh` 改 `height:100dvh; box-sizing:border-box`，讓 `paddingBottom:keyboardOffset` 正確縮短 `.screen`。
- 群組只單人回覆：改為無 @點名時全員依隨機順序依序回覆（間隔 800–2000ms），有 @點名只被點名者回。

### P42 月亮位置 + iOS 鍵盤根治 + 留言回覆（2026-05-22，v0.43）
夢境月亮移入空狀態 `bb-empty-ic`；**iOS 鍵盤根治**：PWA `body` 加 `position:fixed; width:100%` 阻止 iOS 偷捲 visualViewport，移除 `.phone` 的 paddingBottom inline style，`focusin` 後 scrollIntoView；`generateCommentReply` 改用 `sendLLMRequest`、修正預設 model `gpt-5.4-mini`→`gpt-4o-mini`。

### P43 API 模型列表更新 + 自訂模型 ID（2026-05-22，v0.44）
依官方查證更新三家模型清單；模型列表底部加「自訂模型」選項，`onMounted` 若已存 model 不在清單則自動進自訂模式，空值阻止儲存。

### P44 根治貼文留言回覆無法生成（2026-05-22，v0.45）
真因：`generateCommentReply` 是唯一用 `sendLLMRequest` 包裝層的函式，該層①不處理 Proxy 陣列錯誤格式 ②嚴格屬性存取無 optional chaining，Proxy 回非預期格式即崩。修法：移除 `sendLLMRequest`，改與其他生成函式一致的 `fetchWithTimeout` 直呼，加陣列錯誤偵測與 optional chaining。

### P45 架構統一與核心體驗修復（2026-05-23，v0.46）
反轉 P44 結論：重做 `sendLLMRequest`，加入 `Array.isArray` 與 optional chaining 容錯，使其能應付所有 Proxy，**所有內容引擎統一改用 `sendLLMRequest`**，徹底解決 503 與架構破碎；iOS PWA 鍵盤白邊依 CLAUDE.md 原則徹底修復；Onboarding 第一步加模型選擇下拉。

### P46 對話長按選單復刻 + UX（2026-05-23，v0.47）
`ChatRoomView` 加長按（觸控＋滑鼠）選單：複製／編輯並重傳／重新生成；HV 保底間隔 5→15 句、情緒關鍵字觸發降為 30% 機率省 token；貼文按鈕帶入角色名；修正 HV 洩漏底層 prompt 幻覺。

### P47 聊天室 Streaming 串流輸出（2026-05-24，v0.48）
- `parseSSEStream` 共用工具，相容 Anthropic（`content_block_delta`）與 OpenAI/Gemini（`data:[DONE]`），支援截斷偵測。
- 抽出 `buildAIChatSetup` / `buildGroupChatSetup` 共用設定組裝，新增 `generateAIResponseStream` 與 `generateGroupAIResponseStream`（`onStart` 在 HTTP 回應到達即切換動畫、`onChunk` 逐字、結束才存 DB 並觸發 HV）。
- ChatRoom/GroupRoom UI：首 token 前保留三點、到達後切換帶 `▍` 游標的逐字 bubble，僅貼底時自動捲動。

### P48 長期記憶與總結助手（記憶抽屜）（2026-05-24，v0.49）
IndexedDB 升 **v5**，新增 `chat_memories` 表（索引 charId）；`summarizeToMemory` 將近 N 則對話濃縮成 100–200 字摘要；`buildAIChatSetup` 以 `【長期記憶】` 區塊注入已啟用條目；標題列腦波抽屜 UI（總結按鈕、toggle、編輯、刪除、token 估算）。

### P49 動態回覆模式（2026-05-25，v0.51）
`generateProactiveMessageStream` 主動訊息串流（附【主動訊息】context、確保 history 末為 user、支援 AbortSignal）；`scheduleProactive` 依 `care` 設定（rarely 12–25／sometimes 4–10／often 1–4 分）計時；`auto-interrupt` 模式打字時 `abort()` 中止生成。

### P50 自動生成觸發引擎（2026-05-25）
`App.vue` `runDailyAutoGen()`：每日首開比對 `last_auto_gen_date`，對 `autoDiary`/`autoPost` 角色背景靜默生成（日記先查重），不 await、不阻塞 UI，失敗只 console.warn。

### P51 Bug 修復與 UX 優化（2026-05-25，v0.52）
七頁 `timeAgo()` 回傳 `3時`→`3小時前` 避免與「幾點鐘」混淆；記憶抽屜每筆加鉛筆 inline 編輯；`App.vue` 攔截 iOS Safari 邊緣 swipe-back（`clientX<20` 或 `>innerWidth-20` 時 preventDefault）。

### P52 通知修復 + Onboarding 防重複 + 記憶手動新增（2026-05-25，v0.53）
`generatePost/Diary/Dream` 與 `generateHeartVoice` 成功後補寫 `notifications`（原本永遠為空的結構性遺漏）；`onboarding_done` 未設時改查 `dbAll('characters')`，有角色即補設跳過（解決還原備份後每次重進引導）；記憶抽屜「+」手動新增表單（標題選填、空則截前 20 字）。

### P53 更新公告系統（2026-05-25，v0.54）
新增 `components/AnnouncementModal.vue`（三頁式分頁：新功能／介面修復／更新指引，`window.openAnnouncement_()` 入口）；`App.vue` 掛載比對 `last_seen_announcement`，首見延遲顯示、關閉寫版本；`HomeView` h-top 加 `.h-ann-btn` 隨時重開。

### P54 + P54b Google Vertex AI 支援與全站修復（2026-05-28~29）
- `ApiView`：新增「Google（Vertex AI）」provider，key 改 textarea 收 service account JSON、Vertex 專屬模型清單（2.x 系列）、儲存驗證 JSON。
- `api.js`：`getVertexToken(sa)` 用 Web Crypto（RSASSA-PKCS1-v1_5/SHA-256）在瀏覽器端從 SA JSON 產 JWT，換 OAuth2 token（快取 55 分）；`sendLLMRequest` 加 vertex 分支走原生 `generateContent` 格式。
- **P54b 全站修復**：`contentEngine`（generatePost/Diary/Dream）與 `chatEngine` 五個函式原本直接拿 api_key 當 Bearer，統一改走 `sendLLMRequest`/`getVertexToken`，御三家行為不受影響。

### P55 資安強化（防禦縱深）（2026-05-29）
- 新增 `services/format.js`，抽出共用 `formatContent`（escape 後 `\n`→`<br>`），全站六個 v-html 渲染點統一引用，消除重複手刻 escape。
- 備份不含金鑰：`exportAllData` 過濾 `settings.api_key`（含 Vertex SA 私鑰）；匯入改「驗證→清空→還原」三段式，避免壞檔清空後失敗致全毀。
- `ApiView` Vertex 輸入區加紅字安全提示；`index.html` 加入 Content-Security-Policy。

### P56 上線一週用戶反饋修復（2026-05-31）
- 群組玩家名字 key `my_profile`→`me_settings`（原先群組 prompt 玩家名永遠空）。
- `formatContent` 清洗中文字間孤立 `\n`、合併多餘換行。
- 首頁通知 tile 改動態未讀數 + 玫瑰 badge。
- `generatePost` 加最近 6 則聊天 context、`generateDream` 改結構化對話（最近 8 則）。
- 新增 OpenRouter 服務商（`https://openrouter.ai/api/v1`，OpenAI 相容）。
- 設定頁加防盜與資安聲明；主動訊息落地寫 `notifications`（`type:'chat'`）。

### P57 上線後連續修復（2026-05-31）
- Anthropic CORS：所有呼叫加 `anthropic-dangerous-direct-browser-access: true`。
- IndexedDB 競態：`initDB()` 移至 `main.js` mount 前 await。
- CSP 補 `https://vercel.live`（script-src/frame-src）解 staging 預覽。
- `generatePost` 補 `dbIdx` 靜態 import；`ApiView` testApi 正確解析 `__custom__` 自訂模型；401/403/404/429/逾時友善中文錯誤訊息。

### P58 防誤刪角色 + 清空對話範圍可選（2026-06-01）
有使用者左划把「刪除」當成刪對話串，誤殺角色連同日記/夢境/貼文。前提：本 app「一角色＝一對話」，內容全綁 `charId`。
- 左划只剩「置頂／清空」，移除 `deleteChar`，刪角色統一走「設定→角色管理」（已有確認 modal）。
- 「清空」改自訂確認 modal，明示「角色不會被刪除」，勾選框「同時清除日記、夢境、貼文」**預設不勾**（只清 messages/memories）。
- 通知連動：`hv` 內容存於 memories，基本清空必刪，故 `hv` 通知永遠一併清除避免死連結；`post/diary/dream` 通知僅勾選連帶清除時清。

### P59 生理期關心（2026-06-01）
本地週期追蹤 + 角色主動關心，完全本地計算、逐角色授權。
- 新檔 `services/cycle.js`：`getCyclePhase(me)` 依開始日＋週期長度（預設28）＋經期天數（預設5）推算 period/pms/ovulation/normal，另 `cycleCareContext()` 組 prompt、`cyclePhaseLabel()` 供 UI 預覽。
- 資料存 `me_settings`（cycleEnabled/lastPeriodStart/cycleLength/periodLength），不上傳；每角色 `char.cycleCare`（預設 false）決定是否知情。
- 被動體貼：`buildAIChatSetup` 於 period/pms 注入 system prompt（其餘階段空字串，避免一直繞話題）。
- 主動關心：`generateCycleCareMessage` 非串流生成 → 存 assistant 訊息 + unreadCount++ + `type:'chat'` 通知；`App.vue` `runCycleCare()` 於「預測經期開始日」與「經期前 2 天」觸發，per-char setting `cycle_care_<id>` 去重。

### P60 代碼整理 + 串流空回應錯誤提示（2026-06-01）
- 全專案資安掃描（無高風險）。清理：刪未用 `HelloWorld.vue`、移除 `store.reloadCharacters()` 空殼、`summarizeToMemory` 三個死變數、`generateDiary` 多餘動態 import；修 `buildGroupChatSetup` model fallback 寫死 `'gpt-5.4-mini'`→`getDefModel(provider)`（Anthropic 用戶會選錯模型）；提取 `buildRecentChat()` 取代 contentEngine 三處重複。
- `sendMsg`/`doRegenerate`：串流回應為空（代理回空串流）原本靜默消失，改為明確 toast 提示確認代理設定。

### P61 連線測試強化（2026-06-02）
**背景**：使用者把自訂位址 `…/v1` 誤打成 `…/v.1`，閘道對不存在的路徑回了自己的 HTML 網頁＋HTTP 200。而 `testApi` 原本**只看狀態碼**，於是誤報「連線成功」，但實際聊天時 `parseSSEStream` 在 HTML 裡找不到 `data:` → 空回應。假成功害使用者卡了很久。
- `ApiView.testApi`：改為**讀取回應內容並驗證**——新增 `looksLikeChatResponse()`（檢查是否含非空的 `choices`/`content`/`candidates` 陣列）與 `describeBadOkBody()`。`res.ok` 但內容不是合法聊天回應（回了網頁／error 物件／空殼）時，明確報「位址或端點不正確…別打成 /v.1」而非假成功。御三家＋Vertex 路徑統一套用。
- 測試請求 `max_tokens` 10→16，避免 reasoning 模型把額度用在思考、回空內容造成誤判。

### P62 批次更新：自動總結記憶＋玩家頭像＋角色作息＋訊息表情（2026-06-02）
**背景**：一次推進階段 B 多個使用者反饋待辦，集中成一版發布（不再一功能一版）。

**① 自動總結記憶**
- `CharEditView`：角色「自動功能」區新增**自動總結記憶**開關 `autoSummarize`，開啟後顯示「每幾則自動總結」滑桿 `autoSumEvery`（10～80，預設 30）。
- `ChatRoomView`：回覆完成後（玩家送訊息 `sendMsg`＋角色主動訊息流程，兩處 finally）背景呼叫 `maybeAutoSummarize()`——以角色上的 `lastAutoSumAt` 時間戳為界，統計新增非 hv 訊息數，達門檻就背景觸發既有 `summarizeToMemory()`、存入記憶並更新時間戳，完成 toast「已自動總結記憶」。失敗只記 console 不打擾、下次達標再試；`isAutoSumming` 旗標防併發。

**② 玩家自訂大頭貼**
- `MeView`：新增頭像區（沿用全域 `av-hero`/`av-circle`/`av-menu`/`emoji-picker` 樣式與角色頭像同款上傳邏輯，200×200 置中裁切存 base64），可上傳圖片或選 Emoji，預設 `🙂`，存於 `me_settings.avatar`。
- `ChatRoomView`：玩家訊息改為與 AI 對稱的帶頭像列（頭像靠右、連續訊息用 `msg-av-spacer` 佔位），讀 `me_settings.avatar` 顯示。

**③ 角色作息設定**
- `CharEditView`：「近況」下新增**作息 / 行程**區——`workTime`（上班/上課時間）、`workPlace`（地點）、`restTime`（作息習慣）三欄。
- `chatEngine.buildAIChatSetup`：組 `scheduleCtx` 注入 system prompt（位於 `timeCtx` 之後），請角色依現在時間推測自身狀態（上班/通勤/睡覺），讓對話與主動訊息有情境感。因走共用 setup，聊天／主動訊息／生理期關心三條路徑皆受惠。

**④ 訊息表情反應**
- `ChatRoomView`：長按訊息的 action sheet 頂部新增表情列（`❤️😂👍😮😢🙏`），點選即在該訊息泡泡掛上徽章並存進 `messages.reaction`；點同表情或點徽章可取消。使用者與 AI 訊息皆適用。

| 檔案 | 變更 |
|------|------|
| `views/CharEditView.vue` | 新增 `autoSummarize`/`autoSumEvery` 與作息 `workTime`/`workPlace`/`restTime` 欄位與 UI |
| `views/ChatRoomView.vue` | `maybeAutoSummarize()`＋玩家頭像列＋表情反應（`setReaction`/`removeReaction`、`REACTIONS`） |
| `views/MeView.vue` | 玩家頭像上傳/Emoji 區、`me.avatar` |
| `services/chatEngine.js` | `scheduleCtx` 作息注入 |
| `assets/main.css` | `.me-side` 玩家頭像列、`.msg-reaction`、`.msg-react-bar/-opt` |

> 無 IndexedDB 結構異動：`characters` 新增軟欄位 `lastAutoSumAt`/`workTime`/`workPlace`/`restTime`，`messages` 新增 `reaction`，`me_settings` 新增 `avatar`，皆免升版本。

---

### P63 補玩家作息設定：角色感知你的上班時間（2026-06-02）
**背景**：P62 的「角色與玩家作息設定」只做了角色側，玩家側漏掉了。本版補齊玩家作息欄位，讓角色真正知道對方現在在幹嘛，主動訊息才能有情境感（例如上班時輕輕打擾而不是高能互動）。

| 檔案 | 變更 |
|------|------|
| `views/MeView.vue` | 新增「作息 / 行程」區：`workTime`/`workPlace`/`restTime` 欄位，存於 `me_settings` |
| `services/chatEngine.js` | `buildAIChatSetup` 新增 `playerScheduleCtx`，讀玩家作息注入 system prompt，位於角色作息之後 |

> 無 IndexedDB 結構異動：`me_settings` 新增軟欄位 `workTime`/`workPlace`/`restTime`，免升版本。

---

### P64 UX 修正：返回鍵・未讀清除・儲存提示（2026-06-02）

| 問題 | 修法 |
|------|------|
| 聊天室返回鍵跳回首頁 | `chat-hd-back` 改 `router.push('/chat-list')` |
| 進入聊天後未讀標示不消失 | `ChatRoomView` `onMounted` 進場即清除 `unreadCount`/`hasUnread` 並寫回 DB |
| 儲存角色／我的設定無提示直接跳頁 | `CharEditView.saveChar` 與 `MeView.saveMe` 儲存後加 `window.toast_` 再導頁 |

| 檔案 | 變更 |
|------|------|
| `views/ChatRoomView.vue` | 返回路徑修正；`onMounted` 清除未讀 |
| `views/CharEditView.vue` | `saveChar` 加 `window.toast_('角色已儲存')` |
| `views/MeView.vue` | `saveMe` 加 `window.toast_('已儲存')` |

---

### P65 世界書 + 圖片傳送與 AI 識別（2026-06-02）

**① 世界觀設定書 World Book**
與角色脫鉤的全域詞條庫，供 AI 在對話中自動參考。每筆詞條含：名稱（觸發關鍵字）、別名、分類（地點/人物/規則/物件/歷史）、詞條內容、適用角色（全部或指定）、啟用開關。

- 觸發機制：`buildAIChatSetup` 掃描近 10 則訊息，命中詞條名稱或別名才把對應詞條注入 system prompt，不觸發不佔 token。
- 入口：設定頁「世界書」→ 詞條列表，右上角「＋ 新增」進編輯頁。

**② 圖片傳送與 AI 識別**
聊天室支援傳圖，AI 可描述、評論圖片內容。

- 選圖後 canvas 壓縮至 512px JPEG Q0.8（約 50–150 KB），同版本存 DB 與送 API。
- 三家 API 格式各自轉換：Anthropic `image+text` content block；OpenAI 相容 `image_url+text` array；Vertex `inlineData+text` parts。
- UI：輸入框左側相機按鈕 → 選圖後顯示預覽列（可取消）→ 送出後圖片顯示在泡泡上方，點擊全螢幕預覽。

| 檔案 | 變更 |
|------|------|
| `views/WorldsView.vue` | 新建：詞條列表，分類篩選，啟用 toggle |
| `views/WorldEditView.vue` | 新建：詞條編輯頁 |
| `router/index.js` | 新增 `/worlds`、`/worlds/edit/:id?`，共 23 條路由 |
| `services/chatEngine.js` | `buildAIChatSetup` 加 `worldCtx`；`sendUserMessage` 加 `image` 參數；`generateAIResponseStream` 加 `imageBase64` 參數與 `buildImgHistory()` |
| `views/ChatRoomView.vue` | 相機按鈕、`compressImage()`、預覽列、泡泡圖片渲染、`viewImage()` overlay |
| `views/SettingsView.vue` | 世界書入口改為實際路由跳轉 |

> 無 IndexedDB 結構異動：`messages` 新增軟欄位 `image`（base64），`worlds` store 已在 v5 預留，免升版本。

---

### P66 Bug 修正 + 作息主動訊息 + 時間流逝感知（2026-06-03）

**① 貼文回覆頭像修正**
使用者在貼文留言時，頭像從硬寫的 🙂 改為讀取 `me_settings` 的自訂頭像（支援 emoji 與圖片）。

**② 角色冠夫姓修正**
system prompt 中明確區分暱稱（`c.call`）與本名（`youName`），加入禁止語「無論關係為何，不可幫對方冠夫姓、改姓或更改名字」，解決夫妻關係設定下 AI 自作主張改名的問題。

**③ 跨天時間流逝感知**
開啟「時間感」的角色，若距上一則訊息超過 3 小時，自動在 system prompt 注入「距上次對話已過約 X 小時（上次時間戳 → 現在）」，讓角色能自然感知對話中斷、不再接著舊話題繼續說。

**④ 作息主動訊息時段**
角色設定「作息/行程」區塊新增自訂時段清單，每筆設定一個時間點與情境描述（例：「12:00，提醒我吃午餐」），App.vue 每 5 分鐘掃一次，命中時段且當天尚未發過才觸發。每個時段可單獨開關，不受固定範本限制。

| 檔案 | 變更 |
|------|------|
| `views/PostDetailView.vue` | 留言頭像改讀 `me_settings.avatar` |
| `services/chatEngine.js` | `c.call` prompt 加暱稱禁改說明；`youName` prompt 加冠姓禁止語；`buildAIChatSetup` 加時間流逝注入邏輯；新增 `generateScheduleMessage()` |
| `views/CharEditView.vue` | 作息區塊新增 `scheduleTriggers` 自訂時段清單 UI |
| `App.vue` | 新增 `runScheduleTriggers()`，`onMounted` 啟動，`setInterval` 每 5 分鐘執行 |
| `views/SettingsView.vue` | 版號 P65 → P66 |

---

### P67 時間感知 Bug 修正・聊天日期分隔線・卡片間距（2026-06-05）

**① 時間感知 bug 修正**
`buildAIChatSetup` 在計算「距上次對話間隔」時，`allMsgs` 最後一則已是剛送出的使用者訊息（時間差幾乎為 0），導致永遠偵測不到跨天/長時間間隔。改為取 `allMsgs[length - 2]`（倒數第二則）作為基準，正確偵測前一輪對話的時間點。

**② 聊天室加入日期分隔線**
ChatRoomView 新增 `showDateSep()` / `fmtDateSep()` 函式：每當相鄰訊息跨越不同日期，就在訊息前插入「M 月 D 日　星期X」分隔標籤，讓使用者滑動查看歷史時清楚辨別日期邊界。

**③ 日記／夢境卡片間距修正**
DiaryView 與 DreamView 的卡片列表因外層 `<div v-else>` 包層導致 `gap` 無法作用在卡片之間。在 wrapper div 補上 `display:flex;flex-direction:column;gap:Npx`，使間距正確套用。

| 檔案 | 變更 |
|------|------|
| `services/chatEngine.js` | `lastMsg` 改用 `allMsgs[length-2]` 修時間間隔計算 bug |
| `views/ChatRoomView.vue` | 新增 `showDateSep()` / `fmtDateSep()` + 日期分隔 template + `.chat-date-sep` CSS |
| `views/DiaryView.vue` | v-else wrapper 加 `flex gap:12px` |
| `views/DreamView.vue` | v-else wrapper 加 `flex gap:10px` |
| `views/SettingsView.vue` | 版號 P66 → P67 |

---

### P68 節日季節感知・首頁動態磚塊・自訂 confirm modal・語音輸入（2026-06-06）

**① 節日/季節感知**
新增 `getHolidaySeasonCtx()` 函式注入 system prompt：依當天日期自動計算季節（春/夏/秋/冬）、偵測固定西方節日（情人節、聖誕、跨年等）與農曆節日（除夕、春節、元宵、端午、七夕、中秋、重陽、冬至等，硬編碼 2025–2027），在「時間感知」開啟時一併注入讓角色知道今天是什麼節日與季節。

**② 首頁磚塊動態化**
HomeView 日記與夢境磚塊的副標題從靜態字串改為即時查詢 IndexedDB：今日已生成則顯示「今日已生成 N 則」，尚未生成則顯示「今日未生成」/「點擊生成」。

**③ 自訂 confirm modal**
App.vue 加入全域 `window.confirm_()` Promise 系統（參考 toast 模式），在頁面內彈出統一風格的確認 modal，取代瀏覽器原生 `confirm()` 的 4 處呼叫（刪除群組、刪除角色章節、批次刪除角色、匯入備份警告）。

**④ 語音輸入**
ChatRoomView 輸入列加入麥克風按鈕，使用 Web Speech API（`SpeechRecognition`）辨識語音並附加至輸入框；錄音中按鈕以玫瑰色脈衝動畫提示；瀏覽器不支援時顯示 toast 提示。

| 檔案 | 變更 |
|------|------|
| `services/chatEngine.js` | 新增 `getHolidaySeasonCtx()` + 注入 timeCtx |
| `views/HomeView.vue` | 日記／夢境磚塊副標題動態化 |
| `App.vue` | 全域 confirm modal + CSS；版號常數 P68 |
| `views/GroupListView.vue` | `confirm()` → `window.confirm_()` |
| `views/CharEditView.vue` | `confirm()` → `window.confirm_()` |
| `views/ChatListView.vue` | `confirm()` → `window.confirm_()` |
| `views/SettingsView.vue` | `confirm()` → `window.confirm_()`；版號 P67 → P68 |
| `views/ChatRoomView.vue` | 麥克風按鈕 + `toggleVoice()` + 錄音動畫 CSS |

---

### P69 生日紀念日系統・關係主頁・在一起計數器・倒數重要日子（2026-06-06）

**① 生日/紀念日欄位**
CharEditView「關係與規範」新增「紀念日」區段：角色生日（`birthday`）、相識日（`meetDate`）、在一起的日期（`togetherDate`），皆為 `YYYY-MM-DD` 格式 date picker。MeView 加玩家生日欄位（`birthday`）。

**② chatEngine 個人日期感知**
新增 `getPersonalDateCtx(char, me)` 函式：比對 MM-DD，若今天是角色生日、玩家生日、相識紀念日、在一起紀念日，自動注入對應提示至 system prompt（不依賴 timeAware，只要有設定就生效）。

**③ 關係主頁（RelationView）**
新路由 `/relation/:id`，從聊天室「…」選單進入。頁面顯示：
- 在一起天數（大型主視覺卡，玫瑰色）
- 相識天數卡 + 對話則數卡（雙欄）
- 「即將到來」區塊：90 天內的生日/紀念日倒數

| 檔案 | 變更 |
|------|------|
| `views/CharEditView.vue` | 新增「紀念日」區段（角色生日、相識日、在一起日）|
| `views/MeView.vue` | 新增玩家生日欄位 |
| `services/chatEngine.js` | 新增 `getPersonalDateCtx()` + 注入 systemPrompt |
| `views/RelationView.vue` | 新建關係主頁 |
| `router/index.js` | 新增 `/relation/:id` 路由 |
| `App.vue` | `hiddenRoutes` 加 `relation` |
| `views/ChatRoomView.vue` | 選單加「關係主頁」入口 + `goRelation()` |
| `views/SettingsView.vue` | 版號 P68 → P69 |

---

### P70 首頁改版・黑盒子改名心聲・世界書 & 我的設定入口（2026-06-06）

**① 首頁重整**
移除「劇情創作」整個區塊（劇本、小說、線下模式全部暫緩），「養成 & 系統」更名為「設定」並移除寵物屋/任務死連結，改放「我的設定」與「系統設定」兩個真實入口。「角色生活」區的定位磚塊替換為「世界書」（World Book），補上 P65 起即上線但無首頁入口的功能。

**② 黑盒子改名為心聲**
HomeView 磚塊名稱 `黑盒子` → `心聲`，副標題 `內心活動` → `那些說不出口的`；圖示換為愛心；BlackboxView 頁面標題同步更新。

| 檔案 | 變更 |
|------|------|
| `views/HomeView.vue` | 移除劇情創作區；定位→世界書；寵物屋/任務→我的設定/系統設定；黑盒子→心聲 |
| `views/BlackboxView.vue` | 頁面標題改為「心聲」 |
| `views/SettingsView.vue` | 版號 P69 → P70 |

---

### P71 導航重構・全域返回上一頁・儲存留原頁・設定頁顯示個人資訊（2026-06-06）

**① 全域導航重構**
全部頁面的返回按鈕從硬編碼固定路由改為 `$router.back()`，實現「從哪來回哪去」的正確行為。共修改 20+ 個 view 的 back 按鈕，以及 ChatRoom、GroupRoom 的返回按鈕。

**② 儲存後留原頁**
CharEditView（角色設定）、MeView（我的設定）、WorldEditView（世界書詞條）儲存後不再跳頁，顯示 toast 提示並留在當前頁。新建項目首次儲存後以 `router.replace` 更新路由（避免重複建立記錄、讓刪除按鈕出現、頁面標題轉為「編輯」模式）。

**③ 首頁清理**
移除首頁「設定」區塊（我的設定＋系統設定磚塊），因底部導航「設定」tab 已提供相同入口。首頁「新增角色」按鈕直連 `/char-edit`（原為 `/settings`）。

**④ 設定頁重整**
頂部從靜態 Auris logo 改為動態個人資訊卡（顯示使用者頭像＋名稱，點擊進入我的設定）。角色管理圖示改為「多人」圖示，與「我的設定」單人圖示區分。移除清單中的「我的設定」列（由頂部卡片取代）。

**⑤ BottomNav 優化**
「我的」改為「設定」與頁面標題一致；在 `/me`、`/worlds`、`/worlds-edit` 上正確高亮設定 tab（原本無 tab 高亮）。

| 檔案 | 變更 |
|------|------|
| `views/HomeView.vue` | 移除設定區塊；新增角色→/char-edit；角色生活區加底部 margin |
| `views/MeView.vue` | 返回 back()；儲存留原頁 |
| `views/CharEditView.vue` | 返回 back()；儲存留原頁＋router.replace；createdAt bug 修正 |
| `views/CharManageView.vue` | 返回 back() |
| `views/SettingsView.vue` | 返回 back()；頂部個人資訊卡；角色管理換圖示；P70→P71 |
| `views/ChatRoomView.vue` | 返回 back() |
| `views/ChatListView.vue` | 返回 back() |
| `views/WorldsView.vue` | 返回 back() |
| `views/WorldEditView.vue` | 返回 back()；儲存留原頁＋router.replace；ID bug 修正 |
| `views/ApiView.vue` | 返回 back() |
| `views/BlackboxView.vue` | 返回 back() |
| `views/DiaryView.vue` | 返回 back() |
| `views/DiaryDetailView.vue` | 返回 back() |
| `views/DreamView.vue` | 返回 back() |
| `views/DreamDetailView.vue` | 返回 back() |
| `views/GroupListView.vue` | 返回 back() |
| `views/GroupCreateView.vue` | 返回 back() |
| `views/GroupRoomView.vue` | 返回 back() |
| `views/NotificationsView.vue` | 返回 back() |
| `views/MomentsView.vue` | 返回 back() |
| `views/PostDetailView.vue` | 返回 back() |
| `components/BottomNav.vue` | 我的→設定；settings tab 高亮範圍擴大至 me/worlds |

---

### P72 角色設定重整・自訂紀念日・MeView 分組・關係主頁多入口（2026-06-06）

**① CharEditView Tab 重整**
Tab 3「關係與規範」→「關係設定」；Tab 4「回覆設定」→「進階設定」。Tab 3 頂部加入「查看關係主頁 →」快捷連結（僅編輯模式顯示）。行為規範（isAI、禁止話題、補充指令）從 Tab 3 移至 Tab 4，與 AI 相關設定集中管理。主動訊息時段（scheduleTriggers）從 Tab 1「個性背景」移至 Tab 4，歸入系統行為設定區塊。

**② 自訂紀念日系統**
Tab 3「紀念日」區塊新增「自訂紀念日」清單（動態增刪），使用者可自由記錄認識、訂婚、結婚等任意紀念日（label + date）。固定欄位 meetDate 從 UI 移除，改以 anniversaries 陣列儲存，舊資料在載入時自動遷移。RelationView「即將到來」區塊同步顯示所有自訂紀念日。

**③ MeView 分組重構**
從單一長表單改為有語意分組的結構：「基本資訊」（名字/年齡/職業）→「個性描述」（persona 長期 / note 彈性備忘）→「生日」→「作息 / 行程」→「生理期追蹤」。persona 與 note 標籤釐清為長期 vs. 彈性用途；cycleCare 提示更新，明確指引使用者到「進階設定 Tab」開啟。

**④ 關係主頁多入口**
原本只能從聊天視窗更多選單進入，新增兩個入口：CharEditView Tab 3 頂部連結、CharManageView 角色卡「關係」按鈕。

| 檔案 | 變更 |
|------|------|
| `views/CharEditView.vue` | Tab 3/4 改名；Tab 3 加入關係主頁連結；紀念日重構（移除 meetDate UI，新增 anniversaries 陣列）；行為規範移至 Tab 4；scheduleTriggers 移至 Tab 4；script 新增 anniversaries 預設值、addAnniversary、removeAnniversary、meetDate 遷移邏輯 |
| `views/CharManageView.vue` | 角色卡新增「關係」按鈕（玫瑰色邊框） |
| `views/RelationView.vue` | upcoming computed 加入 char.anniversaries 陣列的自訂紀念日 |
| `views/MeView.vue` | 分組重構；persona/note 標籤與說明更新；cycleCare 提示更新 |
| `views/HomeView.vue` | 更新公告版號 P65–P67 → P72 |
| `views/SettingsView.vue` | P71 → P72；更新版本描述 |

### P73 心聲管理刪除・角色卡 UI 重設計・首頁副標題簡化（2026-06-08）

**① 心聲管理刪除**
BlackboxView 新增管理模式：Header 右側顯示「管理」按鈕（有心聲時才顯示），進入後可勾選單則或批量選取，底部浮出操作列顯示選中數與刪除按鈕。刪除前以 `window.confirm_` 確認，確認後逐筆呼叫 `dbDel('memories', id)` 刪除，完成後顯示 toast 提示。

**② 角色卡 UI 重設計**
CharManageView 角色卡從「主資訊＋右側四顆垂直按鈕」改為上下兩層：上層橫排（頭像＋名稱介紹＋主要「聊天」CTA），細分隔線後下層輕量操作列（關係・編輯・刪除，各含 icon，以分隔符區隔）。刪除按鈕顯示為紅色，其他為中性色。

**③ 首頁日記 / 夢境副標題簡化**
日記磚副標題由動態「今日已生成 N 則 / 今日未生成」改為靜態「查看日記」；夢境磚由動態「今日已生成 N 則 / 點擊生成」改為靜態「查看夢境」。對應移除 HomeView 的 diary/dream 資料載入邏輯。

| 檔案 | 變更 |
|------|------|
| `views/BlackboxView.vue` | 管理模式：選取 / 全選 / 批量刪除；引入 `dbDel` |
| `views/CharManageView.vue` | 角色卡重構為上下兩層；移除 scoped `.char-rel-btn` / `.char-del-btn` |
| `views/HomeView.vue` | 日記 / 夢境副標題改靜態；移除 diarySub / dreamSub ref 與 diary/dream dbAll 載入 |
| `views/SettingsView.vue` | P72 → P73；更新版本描述 |
| `assets/main.css` | `.char-card` 改 column；新增 `.char-card-top` / `.char-card-divider` / `.char-card-actions` / `.char-act-btn` / `.char-act-sep`；新增 `.bb-entry-sel` / `.bb-checkbox` / `.bb-manage-bar` / `.bb-del-btn` |


### P74 角色匯出匯入・聊天記錄 JSON・我想你・每日一問（2026-06-12）

**① 單角色匯出 / 匯入**
db.js 新增 （匯出角色＋messages＋memories＋chat_memories＋moments＋diary＋dreams）與 （以新 ID 寫入，所有關聯記錄同步換 charId，角色名稱加「（匯入）」區分）。CharManageView 頁頭新增「匯入」按鈕，每張角色卡操作列加「匯出」按鈕。

**② 聊天記錄 JSON 匯出 + 匯入**
ChatRoomView  由 .txt 改為 .json（，含完整 messages 陣列）；新增  函式，讀取 JSON 備份後逐筆以新 ID 寫入 messages，合併進現有聊天記錄。聊天室選單同步新增「匯入聊天記錄」入口。

**③ 「我想你」輕觸**
chatEngine.js 新增 ：短訊息 prompt（max_tokens 120），寫入訊息＋通知＋未讀。App.vue 新增 ，開 app 時對啟用  的角色以 40% 機率觸發（需 ≥ 5 則對話，每天最多一次，以  setting 去重）。CharEditView 新增「我想你」開關（預設 false）。

**④ 每日一問**
chatEngine.js 新增 ：問問題 prompt（max_tokens 200）。App.vue 新增 ，開 app 時對啟用  的角色每天觸發一次（需 ≥ 3 則對話，以  setting 去重）。CharEditView 新增「每日一問」開關（預設 false）。

| 檔案 | 變更 |
|------|------|
|  | 新增  /  |
|  | 新增  /  |
|  |  改 JSON；新增  / ；新增隱藏 file input |
|  | 頁頭加「匯入」；角色卡加「匯出」按鈕；引入  /  |
|  | 新增  /  開關與預設值 |
|  | 引入兩個新函式；新增  / ；onMounted 加入呼叫； → P74 |
|  | P73 → P74；更新版本描述 |
|  | 更新公告內容至 P74，說明四項新功能 |


### P75 首頁 Widget 化（2026-06-12）

**設計理念**：首頁從「按鈕牆」改為「會呼吸的手機桌面」——磁磚保留（維持手機桌面隱喻），但內容變成活的（像 iOS widget），打開 app 第一眼看到「他們正在發生什麼」而不是功能清單。

**① 最近對話 widget**
原「對話」區的 4 格磁磚（聊天/貼文/日記/夢境）改為一張最近對話卡片：顯示最近 3 個有對話的角色（頭像、名字、最後一句訊息、相對時間、未讀紅點），點任一列直接進該聊天室。區段標題列加「全部 ›」捷徑連到聊天列表。無角色 / 無對話各有引導文案。

**② 每日一問 widget**
當天有未回答的每日一問（id 以 `_dq` 結尾且今天產生、其後無使用者訊息）時，顯示問題卡片（問題內容節錄 + 「○○ 在等你的回答 ›」），點擊進入該聊天室；回答後或無提問時自動隱藏。

**③ 角色生活活磁磚**
心聲/日記/夢境/通知 4 格磁磚保留，但顯示活內容：心聲顯示最新一句節錄＋角色名＋時間；日記顯示「○○ 寫了『標題』」＋總篇數；夢境顯示「○○ 夢見『…』」＋總數；通知顯示最新未讀一則＋未讀數角標。各有空狀態文案。

**④ 其他**
- 角色列依最後對話時間排序（常聊的在前），「新增角色」從列首移到列尾
- 貼文/群組/世界書降為「更多」小捷徑列（橫向三顆）
- 問候語（Good morning/afternoon/evening/night）改為依時段動態顯示（原為寫死的 Good evening）
- 公告按鈕維持不動（開發階段更新頻繁，後續再改動態）

| 檔案 | 變更 |
|------|------|
| `views/HomeView.vue` | 全面改寫：新增 recentChats / dailyQ / latestHv / latestDiary / latestDream / latestNotif 載入邏輯與 widget 模板；角色列排序；問候語 computed |
| `assets/main.css` | 新增「首頁 Widget（P75）」區：`.h-sec-row` / `.h-sec-more` / `.wg` / `.wc-*` / `.wq-*` / `.t-hd` / `.t-live` / `.t-meta` / `.sc-row` / `.sc`；深色主題 avatar 修正加入 `.wc-av`；≤374px 加 `.wg` / `.sc-row` 調整 |
| `views/SettingsView.vue` | P74 → P75；更新版本描述 |


### P76 操作簡化（2026-06-12）

**設計理念**：降低導航深度——「在聊天室想看他的日記要繞回首頁」的摩擦就地解決；低頻危險操作（清除/匯出/匯入）收進二層選單，主選單留高頻 RP 動作。

**① 聊天室選單加「他的日記」「他的夢境」捷徑**
ChatRoomView ⋯ 選單新增兩項，以 `?char=角色ID` 跳轉日記/夢境頁並自動預選該角色。DiaryView 讀取 `route.query.char` 預選篩選 chip（生成按鈕也會指向該角色）；DreamView 同步預選篩選與生成對象。

**② 聊天室選單瘦身（二層化）**
原本平鋪的「清除/匯出/匯入聊天記錄」收進「聊天記錄管理 ›」二層 bottom-menu；清除項改紅色標示。主選單變成：角色資訊・關係主頁・他的日記・他的夢境・聊天記錄管理。

**③ 夢境頁角色篩選列**
DreamView 新增與日記頁一致的角色篩選 chips（沿用 `.diary-filter` / `.diary-chip` 樣式），有夢境紀錄時顯示；篩選後無結果顯示「這個角色還沒有夢境」。

**④ 多世界模式「即將推出」標示**
SettingsView「多世界模式」列的「主世界」字樣與 chevron 改為玫瑰色「即將推出」pill，不再是點了才知道的死路按鈕（點擊 toast 保留）。

| 檔案 | 變更 |
|------|------|
| `views/ChatRoomView.vue` | 選單加 goDiary / goDream / openDataMenu；新增 showDataMenu 二層選單；exportChat / triggerImportChat / clearChat 改由二層選單觸發 |
| `views/DiaryView.vue` | onMounted 讀 `route.query.char` 預選篩選 |
| `views/DreamView.vue` | 新增角色篩選列與 filteredDreams；`route.query.char` 預選篩選與生成對象 |
| `views/SettingsView.vue` | 多世界模式「即將推出」pill；P75 → P76 |

---

### P77 聊天全文搜尋・共同願望清單與備忘錄（2026-06-14）

**設計理念**：兩個方向——找回過去（聊天搜尋）與記住未來（共同清單）。搜尋讓長對話可被檢索；願望／備忘把「想一起做的事、約定」這類關係資產沉澱下來，每段關係各自一份。

**① 聊天訊息全文搜尋（in-room）**
ChatRoomView header 新增搜尋圖示，點開頂部搜尋列。輸入關鍵字即時比對該角色目前載入的訊息，顯示命中序號（如 `3/12`）與上下箭頭跳轉；跳到命中訊息 `scrollIntoView({block:'center'})` 並以玫瑰色外框閃爍 1.6s 提示。從最新一筆命中開始（最靠近底部），純前端、零 DB 改動。

**② 共同願望清單＋共同備忘錄（每角色一份）**
新增 `TogetherView`（路由 `/together/:id`），雙分頁共用同一套清單 UI：願望清單／備忘錄。每項可勾選完成（已完成置底、刪除線）、可刪除；新增輸入框 Enter 即送。資料分存 `wishes`、`notes` 兩個 IndexedDB store（`charId` 索引），DB 升版 **v5 → v6**（`if (!contains)` 守衛，舊資料不動）。

**③ 入口（雙處，皆自帶角色脈絡）**
關係主頁（RelationView）新增「我們的願望清單・備忘錄」卡片；聊天室 ⋯ 選單新增「我們的願望・備忘」捷徑（沿用 P76 的選單導航模式），皆導向 `/together/:id`。

**④ 連動與修復**
`db.js` 的 `ALL_STORES`、單角色 `exportCharacterData`／`importCharacterData` 一併納入 `wishes`、`notes`，確保備份／匯出不漏。本版另收錄先前已上線但未獨立記版的兩筆世界書修復（儲存無反應補 try/catch、別名欄位不再把半形逗號轉全形）。

| 檔案 | 變更 |
|------|------|
| `services/db.js` | DB v5→v6；新增 `wishes`／`notes` store；`ALL_STORES`、單角色匯出匯入納入新 store |
| `views/TogetherView.vue` | 新增——願望清單／備忘錄雙分頁，新增／勾選／刪除 |
| `router/index.js` | 新增 `/together/:id` 路由 |
| `views/RelationView.vue` | 新增「我們的願望清單・備忘錄」入口卡片 + `goTogether` |
| `views/ChatRoomView.vue` | header 搜尋圖示與搜尋列；`runSearch`／`prev`／`nextMatch`／`scrollToMatch`；⋯ 選單加 `goTogether` 捷徑 |
| `views/SettingsView.vue` | P76 → P77 |

---

### P78 主動訊息提醒修復・貼文日記吃名字・每日一問標籤・聊天動作排版（2026-06-15）

**設計理念**：四個方向各自獨立——讓主動訊息真的「主動」、讓角色在各處都認得你、讓每日一問被看見、讓對話排版更有臨場感。

**① 主動訊息「不照指令」修復**
所有主動訊息（排程提醒、每日一問、我想你、生理期關心、一般主動訊息）原本把任務指令塞在系統提示最前面，模型拿到整段對話歷史後容易順著舊話題回、忽略指令（例：設定「提醒喝水」卻變成接續前文聊天）。新增共用 helper `buildProactiveHistory(history, task)`：把任務指令放到對話**最尾端（最新近）**，並維持 user/assistant 交替（最後一則是對方留言時併進該則，避免連續同角色被 Gemini/Anthropic 退件）。指令明寫「不要接續舊話題、不要把提示原文寫進訊息」。

**② 貼文／日記／夢境注入名字**
這三類內容生成原本只把名字當聊天記錄標籤、從未明確告訴角色「對方叫 XXX」，也不吃單角色名字覆寫。改為加入「對方本名是『XXX』，習慣稱呼為『暱稱』」，支援 `overrideMe`/`you_name` 與 `c.call`，措辭為「若提到才用」不強制提名。

**③ 每日一問標籤**
每日一問訊息存入時加 `kind: 'dailyQuestion'`，聊天室該則上方顯示「☀️ 每日一問」小標籤（一般/連續版面皆加），與普通對話區隔；回覆方式不變。

**④ 聊天動作排版（全域開關）**
設定頁新增「聊天 → 動作排版」toggle（`chat_format_style`）。開啟時：`format.js` 的 `formatContent(str, enableRich)` 在 HTML 跳脫後把 `*動作*` 轉斜體旁白、`「對話」` 上色（僅聊天室一對一＋群組傳 `enableRich`，貼文/日記不受影響）；系統提示（一對一＋群組）多一行請角色照此格式輸出。顯示同綁 `globalStore.chatFormatStyle`，**關閉時畫面零變化**。

| 檔案 | 變更 |
|------|------|
| `services/chatEngine.js` | 新增 `buildProactiveHistory`，套用至 5 個主動訊息函式；每日一問加 `kind`；`buildAIChatSetup`／群組 setup 注入 `formatCtx`／格式規則 |
| `services/contentEngine.js` | 貼文／日記／夢境注入對方本名與暱稱，支援角色覆寫 |
| `services/format.js` | `formatContent` 新增 `enableRich` 參數（斜體動作／引號上色） |
| `store/index.js` | 新增 `chatFormatStyle` 並於 init 載入 |
| `views/SettingsView.vue` | 新增「聊天 → 動作排版」開關；P77 → P78 |
| `views/ChatRoomView.vue` | 每日一問標籤；bubble 傳 `globalStore.chatFormatStyle` |
| `views/GroupRoomView.vue` | bubble 傳 `globalStore.chatFormatStyle` |
| `assets/main.css` | `.dq-label`、`.msg-action`、`.msg-quote` |

---

### P79 主動訊息融入對話・移除標籤・分時段一次一則（2026-06-15）

**設計理念**：Auris 模擬與真人在手機上往來，主動訊息應像真實生活般自然出現在對話裡，**不該掛標籤做區分**——真人傳「想你」不會掛牌子，一掛上沉浸感就破。前一版（P78）加的「☀️ 每日一問」標籤方向錯了，本版移除。真正讓使用者「不知道回哪句」的病因是：5 種主動訊息（想你／每日一問／作息提醒／生理期關心／一般主動）在開 app 瞬間**一次平行全冒出來**，幾個不相關的開場白同時砸過來。修法是讓它們像真人一樣**分時段、一次一則**。

**① 移除聊天室標籤**
刪掉 `ChatRoomView.vue` 的「☀️ 每日一問」標籤（一般／連續版面兩處）與 `main.css` 的 `.dq-label`。主動訊息從此與普通 AI 訊息渲染完全一致，自然融入對話流。

**② `kind` 降為純內部標記**
四個缺 `kind` 的主動訊息產生器（`proactive`/`cycleCare`/`schedule`/`missYou`）補上 `kind`，連同既有的 `dailyQuestion`，**只供派發邏輯判斷、不再渲染**。新增 `PROACTIVE_KINDS` 與 `hasUnrepliedProactive(charId)`（最新一則非 hv 訊息若為未回覆的主動訊息 → true）。

**③ 統一派發器：分時段、一次一則**
`App.vue` 把「開 app 同時跑 `runMissYou`＋`runDailyQuestions`＋`runCycleCare`」改為單一 `runProactiveDispatch()`，於開 app＋每 5 分鐘各跑一次，每角色每輪最多送一則，過兩道閘門：**(a) 上一則主動訊息沒回就不疊**、**(b) 距上一則未滿 `PROACTIVE_MIN_GAP_MS`（預設 3 小時）就不發**。候選優先序：生理期關心 → 每日一問 → 我想你。各型「當天一次」去重 key 全保留。作息提醒 `runScheduleTriggers` 綁定時鐘時間、本就分散，保留獨立 tick 並加上防堆疊閘門（豁免 min-gap，到點仍準時發）。

> 取捨：主動訊息從「每天保證全發」變成「分時段、盡量送」。只開幾秒就關的日子，當天可能只收到優先序最高的一則——更貼近真人，不再開門被三句話砸到。

**④ 首頁每日一問 widget 保留**
`HomeView.vue` 的每日一問卡片靠 `_dq` id 後綴判斷（不靠標籤），屬主畫面「你有一則沒回」提示、不在對話流內，本版不動。

| 檔案 | 變更 |
|------|------|
| `services/chatEngine.js` | 4 處主動訊息補內部 `kind`；新增並匯出 `PROACTIVE_KINDS`、`hasUnrepliedProactive` |
| `views/ChatRoomView.vue` | 移除「☀️ 每日一問」標籤兩處 |
| `assets/main.css` | 移除 `.dq-label` |
| `App.vue` | 移除 `runMissYou`/`runDailyQuestions`/`runCycleCare`，新增 `runProactiveDispatch`＋`lastProactiveAt`＋`PROACTIVE_MIN_GAP_MS`；`runScheduleTriggers` 加防堆疊閘門；改寫 `onMounted`／interval |
| `views/SettingsView.vue` | P78 → P79 |

---

### P80 主動訊息健檢：真正融入對話・總開關・勿擾時段・跨角色節流・定時補發（2026-06-15）

**背景**：P79 只拿掉了主動訊息的「外觀標籤」，但**內容生成那層沒動**——`buildProactiveHistory` 仍叫 AI「不要接續上面的舊話題」，於是主動訊息一旦落在熱聊中，會自顧自另起話題、跟現場劇情打架（實例：玩家剛說「上車了」，角色卻冒出「還在工作室？要紮營過夜？」）。本版對 5 種自動訊息做一次全面健檢，把「真正融入對話」做到內容層，並補上一批節制與防呆機制。

**① 內容真正融入對話（熱聊／冷場分支）**
`chatEngine.js` 新增 `isRecentlyActive(allMsgs)`（最後一則非 hv 訊息距今 < 5 分鐘＝熱聊）。`buildProactiveHistory(history, task, active)` 改依 active 分支：**熱聊時**指令改為「承接對方剛剛說的內容、像真人邊聊邊提起，不要硬轉新話題」；**冷場時**才維持原本「另起新話題開場白」。五個產生器（`proactive`/`cycleCare`/`schedule`/`missYou`/`dailyQuestion`）都算出 active 傳入，熱聊時 system prompt 追加 `PROACTIVE_ACTIVE_TAIL`，並把「不是回覆任何問題」等與融入相衝突的絕對句改為冷場限定。

**② 總開關：暫停主動訊息**
角色新增 `proactiveMute` 欄位（預設 false，向下相容）。開啟後該角色完全不主動——背景派發（想你／每日一問／生理期）、定時提醒、聊天室即時主動全部跳過，但你傳訊時仍正常回覆。解決「設了手動還是一直被主動訊息打擾、沒有總開關」的痛點（不重用 `replyMode` 以免動到既有設定）。

**③ 勿擾時段**
環境問候（想你／每日一問／生理期關心）在 **23:00–08:00 不發**（`inQuietHours()` 整輪略過）；定時提醒不受限（你設幾點就幾點）。

**④ 跨角色節流：全域每輪最多一則**
`runProactiveDispatch` 改為命中即 `return`，多角色開 app 時不再每角色各冒一則爆量，改為分散到後續每 5 分鐘的掃描逐一送出。

**⑤ 「我想你」機率正名**
原本沒中不寫去重 key → 每 5 分鐘重擲 → 「偶爾」實際變「幾乎必發」。改為**每天只擲一次** 40%（無論中不中都寫當天 key），回歸「不一定每天都有」。

**⑥ 生理期關心加門檻**
比照每日一問，要求對話 ≥ 3 則才發，避免對剛建的陌生角色就冒生理期關心。

**⑦ 定時提醒補發**
容差視窗由「±4 分鐘」改為「到點前 4 分鐘 ~ 到點後 60 分鐘」。到點當下 app 沒開／在勿擾沒掃到時，之後開 app 仍會在一小時內補發一次（當天去重 key 確保只發一次），但不會遲到太久變怪提醒。

**⑧ 兩套主動系統互不再疊**
聊天室即時主動 `generateProactiveMessageStream` 發送後寫入 `last_proactive_<id>`，讓背景派發的 3h min-gap 在玩家在場時生效；`triggerProactive` 發送前先查 `hasUnrepliedProactive`，背景已發過未回的主動訊息就不再疊。

| 檔案 | 變更 |
|------|------|
| `services/chatEngine.js` | 新增並匯出 `isRecentlyActive`、`PROACTIVE_ACTIVE_WINDOW_MS`；`buildProactiveHistory` 加 active 分支＋`PROACTIVE_ACTIVE_TAIL`；5 個產生器傳入 active、熱聊軟化衝突句；`generateProactiveMessageStream` 發送後寫 `last_proactive` |
| `App.vue` | `runProactiveDispatch` 加總開關／勿擾時段／全域單則節流／想你每天擲一次／生理期 ≥3 門檻；`runScheduleTriggers` 加總開關＋遲到 60 分鐘內補發；新增 `inQuietHours` |
| `views/ChatRoomView.vue` | `scheduleProactive` 加 `proactiveMute` 判斷；`triggerProactive` 發送前查 `hasUnrepliedProactive` |
| `views/CharEditView.vue` | 新增「暫停主動訊息（總開關）」toggle 與 `proactiveMute` 預設；修正「我想你」說明文字 |
| `views/SettingsView.vue` | P79 → P80 |

---

### P81 主動訊息修復：杜絕競態疊訊息・時段對齊現在・禁場景旁白・聊天室即時同步・內主動勿擾（2026-06-16）

**背景**：實測發現主動訊息有三類使用者可見的出包同時發生——(1)早上八點多的訊息卻問「中午有沒有好好吃飯」（時段錯亂）；(2)開 app 時一次冒出兩則互不相關的主動訊息（疊訊息）；(3)訊息開頭出現「隔天早上，手機震動」「早晨，書房裡咖啡剛沏好」這類灰字場景旁白，看起來不像聊天訊息。深入追查後共定位六個獨立成因（A–F），本版一次修齊。

**A／F 杜絕競態疊訊息（根因）**
`runScheduleTriggers` 與 `runProactiveDispatch` 原本在開 app 時並排呼叫、不互相 await，兩者的防堆疊閘門 `hasUnrepliedProactive` 讀的是 DB 已寫入訊息，但訊息要等 AI 生成完才寫入——於是兩套同時通過閘門、各生一則。改為新增 `runAllProactive()`：加 `proactiveBusy` 派發鎖（同一時間只跑一輪）、序列化「定時先跑完（含寫入）再跑環境」，環境派發本就尊重 `last_proactive_` 的 3 小時間隔，整輪實際最多送一則。另 `runScheduleTriggers` 命中即 `return`（單輪一則，相近時間的多個定時提醒由後續 5 分鐘掃描自然錯開）。

**C 時段對齊現在**
新增共用 `proactiveTimeAnchor()`（**不依賴角色 timeAware 開關**——主動訊息一定在現實某刻送出）。把當下日期／星期／時段（清晨／早上／中午…）與「問候、用餐話題要對齊現在、不要問已過或未到的時段」強制注入全部 5 個主動生成函式，根治「早上問午餐」。

**B 禁場景旁白**
動作排版開關鼓勵 AI 用 `＊＊` 包敘述，主動 prompt 又沒禁止 → AI 把「主動傳訊」演成小說場景。新增共用 `PROACTIVE_NO_NARRATION` 尾巴，要求「直接以訊息正文開始，不要寫場景／時間旁白、不要用星號包場景」，接到全部 5 個主動生成函式。

**E 聊天室即時同步**
背景派發器寫入訊息時，開著的聊天室原本不會更新，要重開房才由 `loadMessages` 撈出、並因 `createdAt` 排序而「插進歷史中間」。四個背景生成器（想你／每日一問／定時／生理期）寫入後 `dispatchEvent('new-proactive-msg')`，`ChatRoomView` 監聽後即時 `loadMessages`（排序＋捲到底），訊息即時出現在最底、順序正確。

**D 聊天室內主動補勿擾時段**
聊天室內 `triggerProactive` 原本只查 `hasUnrepliedProactive`，不管勿擾時段，與背景規則不一致（自動回覆角色深夜也會主動）。補上 23:00–08:00 不打擾、重排計時器，與背景派發一致。

| 檔案 | 變更 |
|------|------|
| `services/chatEngine.js` | 新增 `proactiveTimeAnchor()`、`PROACTIVE_NO_NARRATION`；5 個主動生成函式（`generateProactiveMessageStream`／`generateCycleCareMessage`／`generateScheduleMessage`／`generateMissYouMessage`／`generateDailyQuestion`）prompt 接上時間錨＋禁旁白；4 個背景生成寫入後 dispatch `new-proactive-msg` |
| `App.vue` | 新增 `runAllProactive()` 派發鎖＋序列化；`runScheduleTriggers` 單輪一則（命中即 return）；onMounted／timer 改用 `runAllProactive` |
| `views/ChatRoomView.vue` | 監聽 `new-proactive-msg` → `loadMessages`（E）；`triggerProactive` 加 23:00–08:00 勿擾守門（D） |
| `views/SettingsView.vue` | P80 → P81 |

---

### P82 聊天室回覆體驗：連續訊息補對話框・回覆拆多則短泡泡逐段冒出・字數隨個性彈性・正常回覆禁場景旁白・即時主動加冷卻（2026-06-16）

**背景**：使用者回報同角色連續兩則訊息「一則有對話框、一則沒有」，重新生成也無效。盤點後發現除了一個 CSS bug，整個回覆體驗還有數個落差，一次優化五項。

**1 連續訊息補對話框（真正的 bug）**
連續訊息（同角色、2 分鐘內）的容器是 `.msg-cont them`（無 `msg` class），白框樣式鎖在 `.msg.them .msg-bubble` 配不到它，導致連續訊息只剩裸文字、沒有背景／邊框。把背景／邊框／陰影補進 `.msg-cont .msg-bubble`（保留分組用的尖角），連續訊息與第一則一致。重新生成無效是因為重生的仍是連續訊息，照樣套到那條沒背景的 CSS——問題在樣式不在內容。

**2 回覆拆多則短泡泡・逐段冒出**
過去 prompt 叫 AI「一次回 1–3 則」，但整段只存成一則訊息、`format.js` 又把換行吃掉，擠成一個大泡泡。新增 `splitReply()`（依空行切段），`generateAIResponseStream`／`generateProactiveMessageStream` 完成後改用 `persistReplySegments()` 切成多則分別寫入（`createdAt` 毫秒位移保序、落在 2 分鐘內由 `isCont` 歸為連續、套上 1. 的白框），回傳由單 `msg` 改為 `{ msgs }`。`ChatRoomView` 抽共用 `streamSegmentedReply()`：串流時把已封段固定成實心氣泡、最後一段維持串流，達成「一顆定住→下一顆冒出」的真人連發感。無空行則回單段（安全退路）。格式規則改為「每則之間空一行分隔」讓切分穩定。

**3 字數隨個性彈性化**
舊 prompt 硬性「每則至少 50～150 字」與「高冷／話少」角色互相打架。改依 `c.talkative`／`c.style==='cool'` 給 `lengthGuide`：高冷話少可只回一兩句、話多可較長連發、其餘適中；品質要求（禁空洞、禁通用句）與長度脫鉤保留。

**4 正常回覆禁場景旁白**
P81 的禁旁白只套主動訊息，正常回覆仍寫「刀叉停了一拍／低頭喝黑咖啡」式小說鋪陳。比照新增 `REPLY_NO_NARRATION` 接到一般回覆 system prompt（正常回覆與重新生成共用），抑制場景／時間旁白與大段敘事；動作排版開著時仍可用 `*星號*` 簡短帶過。

**5 即時主動加冷卻**
聊天室即時主動（P49）在 `care=often`（最短 1 分鐘）時會「回完一分鐘角色又自己補一則」。`triggerProactive` 新增 `PROACTIVE_FLOOR_MS`（3 分鐘）地板：距最後一則訊息未滿就重排不發，避免黏人。

| 檔案 | 變更 |
|------|------|
| `assets/main.css` | `.msg-cont .msg-bubble` 補背景／邊框／陰影（連續訊息白框）|
| `services/format.js` | 新增 `splitReply(text, maxSegments)` 依空行切段 |
| `services/chatEngine.js` | 新增 `persistReplySegments()`、`REPLY_NO_NARRATION`、依個性的 `lengthGuide`；`generateAIResponseStream`／`generateProactiveMessageStream` 回傳改 `{ msgs }`；格式規則改空行分隔 |
| `views/ChatRoomView.vue` | 抽共用 `streamSegmentedReply()` 逐段顯示，套 `sendMsg`／`doRegenerate`／`triggerProactive`；新增 `PROACTIVE_FLOOR_MS` 冷卻地板 |
| `views/SettingsView.vue` | P81 → P82 |

---

### P83 聊天室細修：泡泡切分上限降為 2・時間改在整組對話框結束後顯示・確認彈窗修回實心底・iOS PWA 鍵盤升起不再透底（2026-06-17）

**背景**：使用者回報三個畫面問題——AI 回覆被切成太多瑣碎小泡泡且時間位置怪、安裝成 iOS PWA 後打字時聊天視窗透到手機系統、設定匯入資料的確認彈窗是透明底。一次處理。

**1 泡泡切分上限降為 2**
P82「拆多則短泡泡」預設每則回覆最多切 3 泡泡，實際偏碎。把預設與 fallback 的 `maxMsg` 由 3 降為 2（prompt 改「一次回 1–2 則」、`persistReplySegments`／`streamSegmentedReply`／角色預設同步），`splitReply` 仍只在空行處切，故單句不拆、只在明顯段落分段。既有角色已存 `maxMsg` 值，可於角色編輯「訊息則數」滑桿自行調整。

**2 時間改在整組對話框結束後顯示**
舊版把時間掛在同組「第一則」泡泡（`v-if="!isCont(i)"`），連續泡泡完全不顯示時間——與直覺相反（最後一則反而沒時間）。新增 `isLastInGroup(i)`（下一則不是它的連續訊息即為組尾），時間改掛在組尾：玩家／AI 組首泡泡時間條件改為 `isLastInGroup`，AI 連續泡泡區塊補上時間條。每組只有最後一則、在整組下方顯示時間。

**3 確認彈窗修回實心底（CSS 變數 bug）**
全站共用確認框 `.cm-box` 用了 `background:var(--card)`，但主題系統根本沒定義 `--card`，未定義變數 → 透明底。改為 `var(--surface)`，一次修好 5 個確認彈窗（匯入資料、刪除角色／心聲／群組／章節）。

**4 iOS PWA 鍵盤升起不再透底**
聊天輸入框是 `.chat-ia`（`sticky;bottom:0`）貼在 `.phone`（鎖死 `100dvh`）底部，聊天室內沒有任何元素消費 `keyboardOffset`。iOS 聚焦輸入框時會平移可視區（`visualViewport.offsetTop>0`），使舊公式算出的 `keyboardOffset≈0`、`.phone` 仍是整段 `100dvh` 不再對齊被平移後的可視區 → 落在框外的帶就透到系統。改用 visualViewport API：在既有 `updateKB()` 內把 `visualViewport.height`／`offsetTop` 寫入 root CSS 變數 `--vvh`／`--vvtop`，手機版 `.phone` 改 `height:var(--vvh,100dvh)` 並 `transform:translateY(var(--vvtop,0px))`，把 app 框釘在可見區。桌面用 fallback 不受影響。（依賴 iOS 行為，需實機驗證。）

| 檔案 | 變更 |
|------|------|
| `App.vue` | `.cm-box` 背景 `var(--card)` → `var(--surface)` |
| `services/chatEngine.js` | prompt 與兩處 `persistReplySegments` 的 `maxMsg` fallback 3 → 2 |
| `views/CharEditView.vue` | 新角色 `maxMsg` 預設 3 → 2 |
| `views/ChatRoomView.vue` | 新增 `isLastInGroup()`、時間改掛組尾（三處模板）、`streamSegmentedReply` maxSeg fallback 3 → 2 |
| `store/index.js` | `updateKB()` 新增寫入 `--vvh`／`--vvtop` root 變數 |
| `assets/main.css` | 手機版 `.phone` 改 `height:var(--vvh,100dvh)` + `translateY(var(--vvtop,0px))` |
| `views/SettingsView.vue` | P82 → P83 |

---

### P84 貼文回覆讀取完整貼文＋留言串不再自相矛盾・通知點擊跳到並高亮該則聊天訊息（2026-06-17）

**背景**：使用者回報兩個問題——AI 回覆貼文留言時與貼文自相矛盾（貼文明明有「生物」二字，作者卻回「妳哪隻眼睛看到生物兩個字」）；通知點擊只開到聊天室卻不會跳到那則主動訊息。

**1 貼文回覆讀取完整貼文＋留言串**
`generateCommentReply()` 舊 prompt 只截貼文前 120 字、且完全沒帶入既有留言串（只塞最新一則留言），grounding 太弱才會講出與貼文矛盾的話。改為帶入完整貼文（上限放寬到 1000 字）與整串留言（由舊到新、最後一則即待回覆對象，取最後 10 則），並明確要求「貼合貼文與前文、不可說出與貼文矛盾的話」。

**2 通知點擊跳到並高亮該則聊天訊息**
聊天通知只存 `targetId: charId`、`openNotif` 只導到 `/chat/charId` 捲到底，沒記是哪一則、也不高亮。五處 chat 通知建立點（cycleCare／schedule／missYou／dailyQuestion 背景四則 + 聊天室即時主動）補存 `messageId`；`openNotif` 的 chat 分支改帶 `?msg=訊息id` query；`ChatRoomView` 進場讀 `route.query.msg`，有值就新增 `scrollToMessage()` 捲到該則並沿用搜尋的 `.search-hit` 閃爍高亮 1.6s。舊通知無 `messageId` → query 為空 → 自動 fallback 捲到底。日記／夢境／貼文通知本就路由到該篇詳情頁，不動。

| 檔案 | 變更 |
|------|------|
| `services/contentEngine.js` | `generateCommentReply()` prompt 改吃完整貼文＋留言串 |
| `services/chatEngine.js` | 四處 chat 通知補 `messageId: msg.id` |
| `views/ChatRoomView.vue` | 即時主動通知補 `messageId`；新增 `scrollToMessage()`；`onMounted` 依 `route.query.msg` 捲動高亮 |
| `views/NotificationsView.vue` | `openNotif` chat 分支帶 `?msg=` query |
| `views/SettingsView.vue` | P83 → P84 |

---

### P85 還原 P83 iOS PWA 鍵盤改動——聊天室版面回到 P82 穩定狀態（2026-06-17）

**背景**：P83 為了解決 iOS PWA 鍵盤升起時底部「透到系統」的露出帶，把 `.phone` 從 `height:100dvh` 改成釘在 `visualViewport`（`height:var(--vvh)` ＋ `transform:translateY(var(--vvtop))`），並讓 `updateKB` 即時寫入 `--vvh/--vvtop` 兩個 CSS 變數。實機上此改動把聊天室版面改爆，使用者要求只回退這部分、保留 P83/P84 其餘所有功能。

**處理**：精準還原兩處到 P82 狀態——`main.css` 的 `.phone` 改回 `height:100dvh`、移除 `transform`；`store/index.js` 的 `updateKB` 改回只計算 `keyboardOffset`、不再寫 `--vvh/--vvtop`。P83 的泡泡切分 3→2、時間掛同組最後一則、確認彈窗底色，以及 P84 的貼文回覆與通知跳轉全部保留未動。比對確認這兩檔與 P82 零差異。

| 檔案 | 變更 |
|------|------|
| `assets/main.css` | `.phone` 回退 `height:100dvh`、移除 `transform:translateY` 與 `--vvh` |
| `store/index.js` | `updateKB` 回退為僅算 `keyboardOffset`，不再寫 `--vvh/--vvtop` |
| `views/SettingsView.vue` | P84 → P85 |

---

### P86 全面健檢：聊天競態／逾時修復＋死碼清理（2026-06-18）

**背景**：累積多版迭代後首次全面健檢，分三路審查（聊天核心正確性、整體健康度、文件一致性）。build 與版號一致性正常，找出數個競態／逾時與文件落後問題，本版一併修復。

**修復項目**：
- **開房時主動訊息仍累加未讀紅點**：四個背景生成器（生理期關心／作息／想你／每日一問）無條件 `unreadCount+1`，即使使用者正開著該房。改在 `onProactiveMsg` 收到事件後重撈訊息並把未讀清回 0。
- **串流中 `loadMessages` 競態**：背景主動訊息在前台串流途中觸發整批替換 `messages`，會抹掉尚未落庫的 live 氣泡、導致 `removeLive` 誤刪真實訊息。改為串流期間記旗標 `pendingProactiveReload`，串流結束後才重撈。
- **主動訊息串流無逾時 → 可能鎖死聊天室發訊**：`generateProactiveMessageStream` 原用裸 `fetch` 以傳 `signal`，無逾時保護。改讓 `fetchWithTimeout` 合併外部 `signal`（逾時或手動中斷任一觸發都中止），三家 provider 主動串流皆改走 `fetchWithTimeout`；順帶讓 Vertex 也支援 auto-interrupt 中斷。
- **清除聊天記錄後未重排主動計時器**：`confirmClearChat` 補呼叫 `scheduleProactive()`，取消對舊對話排定的那一輪。
- **表情反應未落庫時的 UI／DB 不一致**：`setReaction`／`removeReaction` 在 `dbGet` 找不到該訊息（如串流中泡泡）時回滾樂觀更新。
- **雙重切段來源不一致**：`streamSegmentedReply` 改從 DB 取最新 `maxMsg`，與落庫端 `persistReplySegments` 同源，避免 live 氣泡數與最終則數對不上。
- **刪內容未連動刪通知（死通知）**：刪除心聲／清空聊天／刪角色後，原本指向已不存在內容的通知還留著，點進去連到空白。補齊五處：心聲刪除（BlackboxView）依 `targetId` 清對應 hv 通知；清除聊天（ChatRoomView）清該角色 chat 通知；ChatListView 清空把 chat 也納入必清型別；角色刪除的 CharEditView 與 ChatListView 批次刪原本漏了 `notifications`（也漏 `chat_memories/wishes/notes` 造成孤兒資料），補成與 CharManageView 一致的完整連動刪除。
- **清理**：刪除未使用的非串流群聊函式 `generateGroupAIResponse`（死碼）與 store 未用欄位 `chatListData`；`ApiView` 改靜態 import `api.js` 消除 `INEFFECTIVE_DYNAMIC_IMPORT` build 警告；`HomeView` inline `console.log` 改 `$toast`；移除 `GroupRoomView` 過時 TODO 註解。
- **文件補正**：`product_feature_list.md` 對應版本 P82 → P86；本檔 Phase 4 區間 `P39–P79` → `P39–P86`。

| 檔案 | 變更 |
|------|------|
| `services/api.js` | `fetchWithTimeout` 合併外部 `signal`（逾時／手動中斷並存） |
| `services/chatEngine.js` | 主動串流三家 provider 改走 `fetchWithTimeout` 並傳 `signal`；刪死碼 `generateGroupAIResponse` |
| `views/ChatRoomView.vue` | `onProactiveMsg` 重撈＋清未讀；`pendingProactiveReload` 旗標；清聊天重排計時器＋清 chat 通知；reaction 回滾；live 切段 maxMsg 同源 DB |
| `views/BlackboxView.vue` | 刪心聲時依 `targetId` 連動刪 hv 通知 |
| `views/ChatListView.vue` | 清空 notifTypesToClear 加 `chat`；批次刪角色補齊完整連動刪除（含 notifications） |
| `views/CharEditView.vue` | 刪角色補齊連動刪除（含 notifications/chat_memories/wishes/notes） |
| `store/index.js` | 移除未用欄位 `chatListData` |
| `views/ApiView.vue` | `api.js` 改靜態 import |
| `views/HomeView.vue` | inline `console.log` → `$toast` |
| `views/GroupRoomView.vue` | 移除過時 TODO 註解 |
| `views/SettingsView.vue` | P85 → P86 |

---

### P87 輸入框 Enter 改為換行（2026-06-22）

**背景**：使用者大多在手機操作，打字時按 Enter 會「直接送出」，導致無法分行。改成 Enter 換行，送出改按右側送出鍵。

**修改項目**：
- 三處多行 textarea 原本綁 `@keydown.enter.exact.prevent="送出函式"`（Enter 直接送出），改為僅 `Ctrl+Enter`／`Cmd+Enter` 送出（`@keydown.enter.ctrl/meta.prevent`），單純 Enter 不再攔截 → textarea 自然換行。
- 影響：單人聊天室、群組聊天室、貼文留言。手機送出方式不變（仍按右側送出鍵），桌面額外保留 Ctrl/Cmd+Enter 快捷送出。
- 單行 input（對話搜尋、群組改名、Together 加項目）的 Enter 觸發維持原樣。

| 檔案 | 變更 |
|------|------|
| `views/ChatRoomView.vue` | 輸入框 Enter 送出 → Ctrl/Cmd+Enter 送出，Enter 換行 |
| `views/GroupRoomView.vue` | 同上 |
| `views/PostDetailView.vue` | 留言輸入框同上（`submitComment`） |
| `views/SettingsView.vue` | P86 → P87 |

---

### P88 AIRP 核心強化：範例對話 few-shot・長期記憶相關性排序＋上限・注入順序優化（2026-06-23）

**背景**：核心功能已成熟，聚焦提升 AIRP（角色扮演）的「像不像本人」與「記不記得我們」兩條體驗主軸。先以一份技術評估盤點 prompt 組裝與記憶機制，再分三階段漸進落地（風險由低到高）。

**階段 1—健康度套餐（補地基、不改產品語意）**：
- **真實 token 估算**：新增 `services/tokens.js` 的 `estimateTokens()`（CJK≈0.6、英數≈0.25 tok/字），記憶抽屜用量顯示從假的「字÷3」改用它。
- **注入順序優化**：world/memory 從 system prompt 中段移到最末尾（緊鄰對話歷史），利用模型 recency 偏好，世界書與長期記憶不再被稀釋。
- **競態修復**：`maybeAutoSummarize` 寫角色前改 `dbGet` 重讀最新角色、只設 `lastAutoSumAt`，根治「自動總結的數秒空窗內整包覆寫、吃掉使用者角色編輯」的既有 bug。

**階段 2—範例對話 few-shot（語氣還原）**：
- 角色卡新增「範例對話」欄位（`examples: [{ user, char }]`），於「說話方式」分頁編輯多組「你說／角色怎麼回」。
- `buildAIChatSetup` 將範例組成標註過的 `exampleCtx`（明確標示為範例、只模仿風格不照抄），放在 system prompt 的說話聲音區。採 system 區塊而非真實對話 turn，避免各家 provider 的 role 交替限制。
- 向後相容：舊角色靠 `{ ...default, ...loaded }` merge 自動補空陣列，免遷移。

**階段 3—長期記憶相關性排序＋上限**：
- 注入 `chat_memories` 時，依與近期對話的字元 2-gram 相關性排序（同分以新近度遞減），再以 `MEM_TOKEN_BUDGET`（1500 tokens）截斷，最相關的先進。解決「記憶越多越稀釋、越燒錢」。
- `recentText` 計算上移，與世界書關鍵字觸發共用。

| 檔案 | 變更 |
|------|------|
| `services/tokens.js` | 新增——`estimateTokens()` token 粗估 |
| `services/chatEngine.js` | `exampleCtx` 範例注入・記憶相關性排序＋token 上限・world/memory 移至 prompt 末尾・`recentText` 共用 |
| `views/CharEditView.vue` | 角色資料加 `examples: []`・「說話方式」分頁加範例對話 UI |
| `views/ChatRoomView.vue` | `enabledTokenEstimate` 改用 `estimateTokens`・`maybeAutoSummarize` 寫前重讀修競態 |
| `views/SettingsView.vue` | P87 → P88 |

---

### P89 即時主動未讀綠燈修正＋群組回覆韌性（2026-06-23）

**背景**：兩個使用者實測回報的問題。其一，角色明明在背景傳了主動訊息、首頁卻不亮綠燈；其二，群組聊天頻繁出現「回覆失敗：HTTP 503／request_timeout」。

**問題 1—「聊天室即時主動」不亮綠燈（未讀狀態漏標）**：
- 首頁綠燈條件是 `character.hasUnread`。四種背景主動訊息（生理期關心／定時／我想你／每日一問）都會設 `hasUnread=true`，唯獨「回覆模式＝自動」的**聊天室即時主動**（`ChatRoomView.triggerProactive`）只建通知、從不設 `hasUnread`。
- 它靠計時器在聊天室元件掛載時觸發，但「掛載 ≠ 使用者正在看」——鎖屏／切走／背景時訊息照生成，使用者沒看到卻不算未讀，綠燈永遠不亮。
- **修法**：生成當下若 `document.hidden`（不在前景）→ 標 `hasUnread=true`＋`unreadCount+1`；另加 `visibilitychange` 監聽，回前景且開著本房時 `reloadAfterProactive()` 清未讀並補撈漏接訊息。在前景看著時不標，避免假未讀。

**問題 2—群組回覆 503／逾時**：
- 群組串流逾時寫死 30s（一對一是 90s），且 `max_tokens: 4000` 輸出更長 → 易撞 `request_timeout`。三處 provider 一律改 90s。
- 群組成員回覆**完全無重試**，任一成員失敗就丟 toast、棄該則。新增暫時性錯誤（503/429/5xx/逾時/限流）自動重試最多 3 次、退避遞增；只在「串流尚未開始」時重試（503/逾時都發生在串流前，氣泡未建立，重試最乾淨不會半截重複）。
- 重試期間 `typingCharId` 維持該成員 →「正在輸入」持續顯示；另加 `groupReplying` 旗標，整輪群組回覆（含成員間空檔與重試）鎖住輸入框與送出鍵，杜絕使用者中途插話造成訊息打架。

| 檔案 | 變更 |
|------|------|
| `views/ChatRoomView.vue` | 即時主動：背景時標 `hasUnread`/`unreadCount`・加 `visibilitychange`（`onPageVisible`）回前景清未讀 |
| `services/chatEngine.js` | `generateGroupAIResponseStream` 三 provider 逾時 30s → 90s |
| `views/GroupRoomView.vue` | 群組回覆暫時性錯誤自動重試（串流前）・`isTransientError`・`groupReplying` 整輪鎖輸入 |
| `views/SettingsView.vue` | P88 → P89 |

---

### P90 貼文回覆吃完整角色設定＋Claude prompt caching 降本（2026-06-23）

**背景**：使用者實測回報兩件事。其一，角色設定（個性＋背景故事）寫了「怕黑、開小夜燈睡覺」，但在貼文留言回覆時卻說「關燈睡了」，與設定矛盾。其二，Claude 聊天「短短三句」就要約人民幣 0.05，覺得偏貴。

**問題 1—貼文回覆吃不到完整設定**：
- `generateCommentReply` 組 prompt 時**只帶了個性（persona）**，背景故事（stories）、近況（status）、喜好（hobby）全沒帶。發貼文 `generatePost` 反而是全帶的，兩者不一致。
- 設定寫在背景故事區塊（如「童年與家庭／重要轉折／現在的生活」）時，回留言完全看不到，才會講出與角色矛盾的話。
- **修法**：回覆 prompt 改與發貼文一致，帶入「個性＋背景＋近況＋喜好」，並在指令明確要求「不要說出與角色設定矛盾的話（例：怕黑就不會說自己關燈睡）」。

**問題 2—Claude 聊天成本偏高**：
- 根因是每則訊息都把整包 system prompt（角色設定／背景／說話範例 few-shot／世界書／長期記憶，約 1500～3500 tokens）**原價重送一次**，且完全沒用 Anthropic 的 prompt caching。「三句」其實是一次 API 呼叫，貴在重複輸入而非輸出。
- **修法**：把 `buildAIChatSetup` 的 system prompt 拆成**穩定段（systemStable：角色設定／說話範例／格式規則，整段對話幾乎不變）＋ 易變段（systemVolatile：現在時間／世界書觸發／長期記憶相關性挑選／長文提示，每則可能變）**。Anthropic 串流路徑把穩定段以 `cache_control: ephemeral` 設快取點、易變段接其後不破壞快取，並補上 `anthropic-beta: prompt-caching-2024-07-31` 標頭。
- 連續聊天（5 分鐘 TTL 內）幾乎每則都命中快取，重複輸入只收約 1 折，聊天輸入成本大幅下降；快取未命中時價格與原本相同（首次寫入約 1.25 倍，一次性），角色行為完全不變。

| 檔案 | 變更 |
|------|------|
| `services/contentEngine.js` | `generateCommentReply` 帶入完整角色設定（背景/近況/喜好）＋防矛盾指令 |
| `services/chatEngine.js` | `buildAIChatSetup` 拆 `systemStable`/`systemVolatile`；Anthropic 串流路徑加 `cache_control` 快取點與 beta 標頭 |
| `views/SettingsView.vue` | P89 → P90 |

---

### P91 聊天室回覆分泡泡修復——「」邊界自動切泡泡（2026-06-24）

**背景**：使用者回報聊天室回覆「從原本會分行分泡泡，變成一次送一大串」。實測截圖顯示同一段對話裡時好時壞——有時正常分 3 顆泡泡，有時整串 `「」` 擠成一顆。

**根因**：分泡泡的 `splitReply`（`services/format.js`）**只認空行**（`\n{2,}`）來切多則泡泡，完全仰賴模型自覺在每則之間空行。但自 P78 動作排版（`「」` 包對話）後，模型常把多句 `「…」` 連寫成一段、中間不空行，切割器就只切出一顆泡泡。模型空不空行不穩定 → 表現時好時壞。這是 P78 排版規則與 P82 空行分泡泡規則的長期潛在衝突，非單一版本回歸。

**修法**：不再死等模型空行。`splitReply` 在空行分段後，再對每段呼叫 `splitQuotedBubbles`——在「一句結束的 `」`」緊接「下一句的 `「`」（或中間夾一段 `*動作*` 後再接 `「`）的交界補切點，讓每則對話（含其前綴動作）各自成泡泡。只在 `」` 後確實還有下一句 `「` 時才切，句中引用（如 `他說「我愛你」然後…`、`「這個」和「那個」`）與純文字訊息不受影響（已 node 驗證 6 種情境）。受 `maxMsg` 上限保護，不會炸出過多泡泡。

| 檔案 | 變更 |
|------|------|
| `services/format.js` | `splitReply` 加 `splitQuotedBubbles`：以 `」`/`「` 邊界（lookbehind+lookahead）補切點，連寫對話也能分泡泡 |
| `views/SettingsView.vue` | P90 → P91 |

---

### P92 強化時間感——統一時間錨（2026-06-24）

**背景**：使用者回報「模擬傳訊息」情境下，開了時間感知的角色仍把星期三講成星期四，並在內文自編比實際送出時間還早的時間戳。

**根因**：聊天回覆的時間注入（`chatEngine.js` 的 `timeCtx`）只在 `c.timeAware` 開啟時給，且格式只有「時:分＋星期」——**缺完整日期、缺時段**，時間錨不夠強；而「主動訊息」用的 `proactiveTimeAnchor()` 早已是「完整日期＋星期＋時段＋時分」的好範本，兩條路徑不一致。貼文生成（`contentEngine.js` 的 `generatePost`）則**完全沒餵現在時間**，提到日子/時段純靠猜。

**修法**：抽出共用 helper `dayPeriod()`＋`timeAnchorLine()`（回傳「6/24（星期三）清晨 07:24」格式），三處共用——(1) 重構 `proactiveTimeAnchor()` 改用之（行為不變）；(2) 聊天回覆 `timeCtx` 維持 `timeAware` 閘門，但格式升級為完整時間錨；(3) `generatePost` 在 `timeAware` 開啟時注入時間錨。**保留 `timeAware` 開關語意**（沒開的架空/古裝角色仍不給現實時間），且**不禁止 AI 自寫時間戳**（使用者要保留該表現）。純 prompt 字串調整，不動任何 .vue 渲染/分泡邏輯，前端無變化。日記（`generateDiary`）原本已含完整日期，不變。

| 檔案 | 變更 |
|------|------|
| `services/chatEngine.js` | 新增並 export `dayPeriod`、`timeAnchorLine`；`proactiveTimeAnchor` 改用之；聊天 `timeCtx` 格式升級為完整時間錨 |
| `services/contentEngine.js` | import `timeAnchorLine`；`generatePost` 於 `timeAware` 開啟時注入時間錨 |
| `views/SettingsView.vue` | P91 → P92 |

---

### P93 貼文/回覆管理＋回覆身份綁定（2026-06-24）

**背景**：兩件客訴——(1) 角色回覆貼文留言時，把「留言的使用者」當成第三方陌生人，用「她／他」指稱貼文裡稱呼的對象（其實就是留言者本人）；(2) 貼文與留言完全沒有管理功能，AI 講錯也無法修改或刪除。

**修法**：
- **回覆身份綁定**：把 `generateCommentReply` 的「組 prompt → 生成回覆」抽成共用 `buildReplyText(post, char, threadComments)`，比照 `generatePost` 解析角色對使用者的稱呼（`overrideMe?you_name:me.name`＋`call`），並在 prompt 插入明確指示：「留言串中標示為對方的留言＝你貼文裡稱呼/提到的那個人本人，不是第三者，不要用第三人稱把對方講成別人」。
- **貼文管理**：`MomentsView` 卡片與 `PostDetailView` 標頭加 `⋯` 選單——編輯（就地改 content）、重新生成（新增 `regeneratePost(postId)`：保留 id/讚數、重寫內容、清空舊留言）、刪除（`dbDel`）。把 `generatePost` 的內容生成抽成共用 `buildPostContent(c)`。
- **留言管理**：`PostDetailView` 每則留言長按（380ms，沿用聊天室 `.msg-sheet`）→ 複製／編輯（就地改）／刪除（`splice`）；角色回覆額外可「重新生成」（新增 `regenerateCommentReply(postId, replyIdx)`：以該回覆之前的留言串重生、原地取代、保留其後留言）。
- UI 全沿用既有 `.msg-sheet`／`window.confirm_()`／`window.toast_()`，新增 `.post-edit-area`/`.post-edit-btn` 就地編輯樣式。

| 檔案 | 變更 |
|------|------|
| `services/contentEngine.js` | 抽 `buildPostContent`、`buildReplyText`（含身份綁定）；新增 export `regeneratePost`、`regenerateCommentReply` |
| `views/MomentsView.vue` | 貼文卡 `⋯` 選單：編輯（轉詳情）/重生/刪除 |
| `views/PostDetailView.vue` | 貼文標頭 `⋯` 選單＋就地編輯；留言長按選單（複製/編輯/刪除/重生）＋就地編輯；`?edit=1` 自動進編輯 |
| `assets/main.css` | 新增 `.post-edit-area`、`.post-edit-btn` |
| `views/SettingsView.vue` | P92 → P93 |

---

### P94 修復心聲顯示不完全（2026-06-28）

**背景**：使用者反應「心聲」列表頁的內心話顯示不完整，每則都斷在句子中間（「其實我根本不在」「只要妳」「情」「真想現在就」）。追查確認**非前端裁切**——`BlackboxView` 用 `formatContent`（未開 rich，只做 escape＋換行）、`.bb-text` 無 line-clamp/overflow，顯示忠實，代表存進 DB 的內容本身就是殘句。

**根因**：`chatEngine.js` 的 `generateHeartVoice` 用 `max_tokens: 80`，是全專案最小。對**推理型模型**（先吃 token 思考）與 **CJK tokenization 較差的模型**（1 中文字 ≈ 2–3 tokens），80 token 不夠把短句講完，導致句子被硬切；而 `generateHeartVoice` 走非串流 `sendLLMRequest`、不檢查 finish_reason，殘句被靜默存入。

**修法**：
- `max_tokens` 80 → 220，給模型足夠空間把 1–2 句短話講完。prompt 仍限「30 字以內」、後處理仍有 50 字硬上限，故放大額度不會讓心聲變長。
- 加截斷偵測（啟發式）：清理後 `hvText` 很短（<6 字）又以「未完成」標點（，、；：,;:）收尾，視為殘句，直接放棄不存、不發通知，寧缺勿濫。
- 既有已存的殘缺心聲無法回溯重生，僅影響之後新生成。

| 檔案 | 變更 |
|------|------|
| `services/chatEngine.js` | `generateHeartVoice` max_tokens 80→220；新增截斷殘句偵測 early-return |
| `views/SettingsView.vue` | P93 → P94 |

---

### P95 新增天氣感知（2026-06-29）

**背景**：希望角色能感知使用者所在地的當下天氣，自然流露環境感——例如下雨時關心一句「記得帶傘」，讓對話更有臨場感。

**設計**：把「天氣」當成又一條情境 context，比照既有的「時間感（timeAware）」「作息感知」注入 system prompt 的易變段，交給模型自行發揮，不寫死規則。
- **成本 0**：定位用瀏覽器原生 Geolocation API、天氣與地名反查用 Open-Meteo（皆免費、免 API key）。
- **每個角色各自開關**（`weatherAware`，預設開），放在角色編輯頁的「自動功能」區，比照 `timeAware`。
- **定位為全域**：在設定頁取得一次（自動定位優先，拒絕／失敗退回手動輸入城市），存 `settings` 表 `weather_loc`，所有角色共用。
- **克制原則**：weatherCtx 措辭強調「偶發性提及」——多數對話不主動提，僅在剛下雨、天氣劇變等自然時機關心，避免每則都報天氣。
- **快取**：`weather.js` 模組級快取（仿 Vertex token），同座標 30 分鐘內不重打 API。
- **韌性**：未定位或 API 失敗時 `getWeatherCtx()` 回空字串，聊天完全不受影響。
- 因聊天與 5 種主動訊息共用 `buildAIChatSetup()`，天氣自動全面生效，無需改主動訊息函式；注入點在易變段（Anthropic 快取點之後），不破壞前段快取。

| 檔案 | 變更 |
|------|------|
| `services/weather.js` | **新增**：Open-Meteo 天氣查詢 + 地名正/反查 + WMO code 中文化 + 30 分鐘快取 + `getWeatherCtx()` |
| `services/chatEngine.js` | `buildAIChatSetup` 內依 `c.weatherAware` 組 `weatherCtx`，併入 `systemVolatile` |
| `views/CharEditView.vue` | 「自動功能」新增「天氣感」toggle（`weatherAware`，預設 true） |
| `views/SettingsView.vue` | 新增「天氣」設定區：使用目前位置／手動輸入城市／清除；P94 → P95 |

---

### P96 互動真實感三連發：輕觸互動・心情打卡・已讀/已讀不回（2026-07-02）

**背景**：核心功能已完備，本版聚焦「與角色互動的真實感」——可以碰到他（輕觸）、他知道你今天過得如何（心情）、他的回覆節奏像真人（已讀/已讀不回）。

**A. 輕觸互動**：聊天室長按角色頭像（header 或訊息旁）跳出動作選單——拍拍🖐️／抱抱🤗／摸摸頭🫳／牽手🤝／戳一下👉／親親😘，角色立刻用人設口吻對動作本身反應（傲嬌彆扭、黏人蹭回來）。
- 動作以 `type:'touch'` 訊息落庫（content 為「（拍了拍你）」式短句），自然進 AI history——角色記得被拍過；畫面渲染成置中系統行「你拍了拍 ○○」。
- 角色回應走新函式 `generateTouchResponseStream`（串流、`kind:'touch'`、上限 2 泡泡）。

**B. 心情打卡**：首頁新增「今天的心情」卡片——5 顆 emoji（開心😊平靜😌累了😴低落😞煩躁😤）＋選填一行備註；打卡後縮成 chip、當天可點開重選。
- 新增 `services/mood.js`（仿 `cycle.js`）：資料存 settings 表單一 key `mood_log`（`{ 'YYYY-MM-DD': { mood, note } }`，自動清 60 天前舊紀錄）。
- `moodContext()` 注入 system prompt 易變段（措辭比照生理期關心：自然體貼、不句句提及）；聊天與所有主動訊息共用 `buildAIChatSetup`，全面生效。沒打卡＝零注入零影響。

**C. 已讀＋已讀不回**：
- **已讀**：最後一則使用者訊息在時間戳旁顯示小字「已讀」（`readAt` 軟欄位或其後已有回覆即顯示，舊資料免遷移）。
- **已讀不回**（逐角色開關 `busyRead`，預設關）：忙碌時段收到訊息時機率性「只已讀、不出現輸入中」，2–6 分鐘後才補回、開頭自然帶「剛剛在忙」。基礎機率 15%，能從 `workTime` 解析出 HH:MM–HH:MM 且當下落在區間內提高到 40%；深夜（23–08）不觸發。
- pending 落地 settings（`pending_busy_reply_{charId}`）：聊天室開著由房內計時器到點補回；離房/關 app 由 `App.vue` 背景派發掃到 `processDueBusyReply` 補生成（帶未讀＋通知）。等待期間再傳訊息／輕觸 → 取消延遲立即正常回覆；訊息被清空/編輯重傳 → 丟棄 pending。

| 檔案 | 變更 |
|------|------|
| `services/mood.js` | **新增**：MOODS 常數、`getTodayMood`/`setTodayMood`、`moodContext()` prompt 注入 |
| `services/chatEngine.js` | `moodCtx` 併入 `systemVolatile`；新增 `streamWithSystem`（共用串流 helper）、`generateTouchResponseStream`、`generateBusyReplyStream`、`shouldBusyRead`、`processDueBusyReply` |
| `views/ChatRoomView.vue` | 頭像長按＋輕觸選單＋touch 行渲染；已讀顯示 `showRead`；已讀不回 queue/timer/補發流程；scoped CSS（touch-line/touch-grid/msg-read） |
| `views/HomeView.vue` | 「今天的心情」卡片＋已打卡 chip＋scoped CSS |
| `views/CharEditView.vue` | 「自動功能」新增「已讀不回」toggle（`busyRead`，預設 false） |
| `views/App.vue` | `runAllProactive` 前置 `runBusyReplyCatchup()`（正開著該房則讓房內計時器處理） |
| `views/SettingsView.vue` | P95 → P96 |

---

### P97 健檢修正 A：預設模型更新・推理型模型 temperature 相容・本地時區日期判定（2026-07-03）

**背景**：程式健檢後的第一批「小而確定」修正。三件互相獨立、風險低、但都修掉會實際出錯或語意偏移的問題。

**A. 預設模型更新至各家現行款**：`getDefModel()` 從 chatEngine 移到 `api.js` 並更新為現行主力——Anthropic `claude-sonnet-5`、Google `gemini-3.5-flash`、Vertex `gemini-2.5-flash`、OpenRouter `openai/gpt-4o-mini`、OpenAI `gpt-5.4-mini`；`api.js` 的 `api_model` fallback 也改用 `getDefModel(provider)`（原本寫死 `gpt-4o-mini`）。設定頁／Onboarding 的 Anthropic 清單同步更新到 Opus 4.8／Sonnet 5／Haiku 4.5。

**B. 推理型模型 temperature／penalty 相容（修既有 400 bug）**：GPT-5／o 系列與 Anthropic 現行款（Sonnet 5／Opus 4.x）會**拒絕非預設 temperature**（回 400）；而 UI 早已把 `gpt-5.4-mini`／`gpt-5.5` 列為推薦/預設，等於現在選預設就會在主動訊息、心聲、總結、甚至主聊天串流上 400。新增 `isReasoningModel(model)` 判斷，對這些模型一律不送 `temperature`（及 OpenAI 的 `frequency/presence_penalty`）——涵蓋 `sendLLMRequest` 與 chatEngine 四個串流 openai 分支；Gemini（Vertex/AI Studio）不受影響照送。Anthropic 一律不送 temperature，與串流主聊天分支本來的行為對齊。

**C. 「每天一次」判定改用本地時區**：新增 `services/date.js` 的 `localDateKey(d)`（`YYYY-MM-DD`，本地時區）。原本多處用 `toISOString().slice(0,10)`（UTC），台灣 UTC+8 早上 8 點才換日——會讓早上的心情打卡、每日一問、自動日記的「今天」整整偏移 8 小時，甚至造成 App 端 dedup（UTC）與日記實際存檔日期（本地）不一致。統一替換 `App.vue`（自動生成／主動派發／作息觸發三處）、`mood.js`、`RelationView.vue`，並讓 `contentEngine` 日記共用同一 helper。匯出檔名的日期沿用 UTC，不動。

**D. 數值 fallback `||` → `??`**：`api.js` 六處（vertex/OpenAI `max_tokens`・`temperature`、OpenAI penalties）把 `||` 改 `??`，避免使用者刻意設 `0`（如 temperature 0、penalty 0）被 falsy 吃掉而套回預設值。

| 檔案 | 變更 |
|------|------|
| `services/date.js` | **新增**：`localDateKey(d)` 本地時區日期 key，全站「每天一次」判定共用 |
| `services/api.js` | 新增 export `getDefModel(provider)`（含現行預設款）、`isReasoningModel(model)`；`sendLLMRequest` 依此略過 temperature/penalty；`||`→`??` 六處 |
| `services/chatEngine.js` | 移除本地 `getDefModel`（改 import api.js）；四個串流 openai 分支對推理型模型略過 temperature |
| `services/contentEngine.js`、`services/mood.js`、`views/RelationView.vue`、`App.vue` | 日期判定改用 `localDateKey` |
| `views/ApiView.vue`、`views/OnboardingView.vue` | Anthropic 清單更新至 Opus 4.8／Sonnet 5／Haiku 4.5 |
| `views/SettingsView.vue` | P96 → P97 |

---

### P98 背景派發強化：DB 升版 v7・去重 key 改成功後寫・主動訊息單一來源（2026-07-03）

**背景**：健檢第二批，聚焦「背景主動訊息派發」的三個體質問題——失敗會靜默丟失、掃描全量載入、任務描述兩份易 drift。皆為背景邏輯與效能，使用者日常操作無感，但長期穩定性與省電有感。

**A. DB 升版 v6 → v7（#8）**：`messages` 補建複合索引 `charId_createdAt`。IndexedDB 對既有 store 加索引必須走 upgrade transaction（`onupgradeneeded` 內 `e.target.transaction.objectStore('messages')`），對「全新安裝直接開 v7」與「v6 升 v7」兩條路徑皆適用；加索引會自動回填、不動既有資料內容，安全。新增 `dbIdxCount`（索引計數）與 `dbLatestByChar(charId, n)`（複合索引逆向 cursor 取最新 N 則）兩個 helper。

**B. 背景掃描不再全量載入（#8）**：`hasUnrepliedProactive` 改用 `dbLatestByChar(charId, 10)` 從最新往回找第一則真實訊息（跳過 heart voice），取代整包 `getAll`+`sort`；`App.vue` `runProactiveDispatch` 的「訊息數 ≥ 3/5」門檻改用 `dbIdxCount`。聊天記錄上萬則後，每 5 分鐘 × 每角色的全量載入在 iOS PWA 上會有感，此改消除之。

**C. 去重 key 改「生成成功後才寫」＋當日重試上限（#4）**：原本「先寫去重 key → 再生成」，API 失敗（斷網／額度用完）時當天內容靜默丟失、不再重試。改為：
- **生理期關心／每日一問**：生成成功才寫 `cycle_care_`/`daily_q_` 當天 key；失敗靠當日重試計數（`cycle_care_try_`/`daily_q_try_` 存 `{date,count}`），同日最多 3 次、達上限視同已發（防壞掉的設定每週期重打 API）。`last_proactive_` 仍在嘗試前寫（維持 min-gap 防疊，連帶讓重試自然錯開）。共用 `dispatchProactive` helper。
- **定時提醒**：同樣成功後才寫 `sched_sent_`＋當日 3 次上限（`sched_try_`），受 -4~+60 分容差視窗約束、超窗自然放棄。每日順手清 7 天前的 `sched_sent_`/`sched_try_` key（`sched_cleanup_date` 守衛），防 settings 隨天數無限成長。
- **每日自動生成**：`last_auto_gen_date` 改為整批全失敗（有嘗試但一則都沒成功）才不寫，下次開 app 重試；個別角色失敗不擋整批。
- **「我想你」刻意維持現狀**：`miss_you_` 記錄的是「今天擲過骰」而非「發成功」，生成失敗＝今天沒想起，符合功能個性；已加註解防未來誤「修正」。

**D. 主動訊息任務描述單一來源（#12）**：`chatEngine.js` 五個主動訊息函式的任務核心描述原本 system 尾段與 `buildProactiveHistory` 各手打一份、已有些微 drift。抽成單一 `const task`（生理期沿用既有 `careGoal`）兩處共用；雙重注入的「框」（【標頭】、「這不是對方傳來的訊息…」包裝）保留，只去除重複的任務本體。送出 prompt 語意等價。

| 檔案 | 變更 |
|------|------|
| `services/db.js` | DB 升版 v7、`messages` 複合索引 `charId_createdAt`；新增 `dbIdxCount`／`dbLatestByChar` |
| `services/chatEngine.js` | `hasUnrepliedProactive` 改 cursor（`dbLatestByChar`）；五個主動訊息函式任務描述單一來源（#12） |
| `App.vue` | 三個派發函式去重 key 改成功後寫＋重試上限；新增 `dispatchProactive`；`dbIdxCount` 計數；sched key 每日清理 |
| `auris-vue/ARCHITECTURE.md` | DB 升版紀錄、IndexedDB 表補複合索引、db.js helper、Settings key |
| `views/SettingsView.vue` | P97 → P98 |

---

### P99 統一 LLM 呼叫層：provider 分支收斂單一來源（2026-07-03）

**背景**：健檢第四批（純重構、行為不變）。原本 openai/anthropic/google/openrouter/vertex 五家的「請求組裝＋回應解析」三叉分支被**複製在 5 個呼叫點**：`generateAIResponseStream`、`generateProactiveMessageStream`、`streamWithSystem`（touch/busy 共用）、`generateGroupAIResponseStream`，以及 `api.js` 的 `sendLLMRequest`。新增 provider 或改一個 header 要改 5 處，是 bug 溫床，也擋住後續（P100）的 prompt cache 全覆蓋。

**做法**：新增 `services/llm.js`，單一入口 `callLLM(opts)` 收斂所有 provider 分支——
- **`resolveLLMConfig()`**：讀 settings 解析 provider/model/base/apiKey（原散在 3 處，邏輯相同），`getDefBase` 一併移入。
- **`callLLM({ system, messages, maxTokens, temperature, stream, onChunk, onStart, signal, image, extra })`**：回傳 `{ fullText, truncated }`。`system` 可傳字串或 blocks 陣列 `[{ text, cache }]`（cache 只對 anthropic 生成 `cache_control`，其餘 join 成純字串）；多模態圖片、SSE 解析（`parseSSEStream` 移入）、90 秒 timeout、各家 header（含 anthropic 直連／版本／prompt-caching beta header）、錯誤訊息抽取一律保留現況語意。
- **五個呼叫點全數改喊 `callLLM`**，原地三叉分支刪除；`sendLLMRequest` 保留為 `callLLM({ stream:false })` 薄包裝（contentEngine 的貼文/日記/心聲/摘要與背景主動訊息不需改動）。

**行為保證（只搬運、不改行為）**：anthropic 一般聊天的穩定段快取、proactive 的 `signal` 可中斷、群聊 `onStart` 時機（HTTP OK 後、讀串流前）、vertex 非串流「整段一次 onChunk」、openai 非推理型的 frequency/presence penalty、推理型與 anthropic 一律不送 temperature——皆逐一保留。`chatEngine.js` + `api.js` 淨減約 260 行。vitest 43 案例全綠、build 通過。

| 檔案 | 變更 |
|------|------|
| `services/llm.js` | **新增**：`callLLM`／`resolveLLMConfig`／`getDefBase`／`parseSSEStream`，五 provider 分支唯一來源 |
| `services/chatEngine.js` | 四個串流呼叫點改用 `callLLM`；移除三叉分支、`parseSSEStream`、`getDefBase`；`buildAIChatSetup`／`buildGroupChatSetup` 改用 `resolveLLMConfig` |
| `services/api.js` | `sendLLMRequest` 改為 `callLLM` 薄包裝；`getVertexToken`／`getDefModel`／`isReasoningModel`／`fetchWithTimeout` 保留供 llm.js 引用 |
| `views/SettingsView.vue` | P98 → P99 |
| `auris-vue/ARCHITECTURE.md` | 新增 llm.js service 說明、目錄、版本紀錄 |

---

### P100 省錢＋品質：prompt cache 全覆蓋・群聊補人設・歷史長文截斷（2026-07-03）

**背景**：健檢第五批（最後一批），建立在 P99 統一呼叫層之上，聚焦「省 token／降本」與「對話品質」三處。

**A. prompt cache 全覆蓋（#6，anthropic）**：P99 前只有一般聊天把 system 拆「穩定段（設 `cache_control`）＋易變段」。主動訊息、輕觸、已讀補回、生理期關心、定時提醒、我想你、每日一問這 **7 個函式**原本把整條 system 當字串送，**無法命中快取**——但它們的穩定段前綴（角色設定/說話範例/格式規則）與一般聊天**完全相同**。
- 新增 `cacheSystem(systemStable, systemVolatile, tail)` helper：組成 `[{ text: systemStable, cache: true }, { text: systemVolatile + 任務尾段 }]`。**任務尾段（【主動訊息】【親暱動作】等）一律放易變段**，絕不進穩定段（否則打破快取）。
- 7 個函式全數改傳 blocks；其中背景四函式（cycleCare/schedule/missYou/dailyQuestion）由 `sendLLMRequest` 改直呼 `callLLM({ stream:false })` 以帶 blocks（penalty 預設沿用，行為不變）。
- **非 anthropic provider 行為零變化**：`callLLM` 把 blocks join 回 `systemStable+systemVolatile+tail`，與改版前送出的字串**逐字相同**。效果：anthropic 用戶先聊一句、5 分鐘內任何主動訊息的穩定段命中快取，重複輸入只收 1 折。`contentEngine`（貼文/日記/夢境/留言）prompt 結構每次全變、無利可圖，不改。

**B. 群聊補人設與時間感（#10）**：`buildGroupChatSetup` 原本只注入 persona＋style，角色在群聊「失憶」。比照單聊組法補上**背景故事（stories）／近況（status）／喜好（hobby）／時間錨（timeAware 開時）**，各項有才加。**刻意取捨**：不加長期記憶・世界書・天氣・作息（群聊 token 成本 × 人數，維持輕量），已註解說明。

**C. 歷史訊息單則長文截斷（#9）**：`buildAIChatSetup` 的 history 組裝——**最近 4 則（KEEP_FULL）保留全文**（接續剛寫的長文不受影響），更早的單則超過 **600 字元（HIST_MSG_CAP）**則截頭加「…（後略）」。歷史裡一篇 2000 字故事原本每輪重複計費，改後省 token，舊長文細節交由長期記憶摘要補位。群聊 history 本就短、slice(-12)，不動。

**D. 修正 P96 輕觸互動：長按頭像誤觸 iOS 原生圖片預覽**：iOS 長按 `<img>` 會跳系統的圖片預覽選單，與輕觸動作選單**雙重彈出**（上傳圖片頭像才會、emoji 頭像無感）。原本只擋 `contextmenu`（桌面右鍵）不夠——補 CSS：頭像容器 `-webkit-touch-callout: none`＋禁選取，`img` 加 `pointer-events: none`（觸控落在容器上、系統預覽無從觸發）＋禁拖曳。

| 檔案 | 變更 |
|------|------|
| `services/chatEngine.js` | 新增 `cacheSystem` helper；7 個主動/互動函式改傳 cache blocks（背景四函式改 `callLLM`）；`buildGroupChatSetup` 補人設與時間錨（#10）；`buildAIChatSetup` history 單則截斷 `HIST_MSG_CAP`/`KEEP_FULL`（#9）；移除已無消費者的 `finalSystemPrompt` |
| `views/ChatRoomView.vue` | 頭像長按防 iOS 原生圖片預覽（touch-callout／pointer-events CSS，D） |
| `views/SettingsView.vue` | P99 → P100 |

---

## 🚀 Phase 5：上線後優化（P101–）

正式版對外發布後的持續打磨期：以使用者實測回報驅動的排版重診與修復、互動教學、體驗細節補強為主。

---

### P101 聊天室排版修復：自己氣泡配色・句中換行・主動訊息切泡泡・拒絕回覆處理（2026-07-04）

**背景**：使用者實測截圖回報聊天室三個排版問題＋一個沉浸感問題，集中成一版修復。

**A. 自己氣泡「對話」看不清（main.css）**：自己氣泡是玫瑰底白字，但 `.msg-quote` 一律染玫瑰色 → 「」內文字與底色相近而**看不到**。新增 `.msg.me .msg-bubble .msg-quote` 改**白色加粗**、`.msg-action` 改半透明白（維持與對話的層次差）。AI 氣泡（淺底）配色不變。

**B. 模型硬斷句中的孤立換行（format.js）**：原 `formatContent` 的「孤立換行合併」規則要求換行**緊貼**兩側字元，模型偶爾輸出「字 \n字」（換行旁多一個空格）或 `\r\n` 就配不到 → 句子被腰斬（如「吃午餐了\n沒。」）。修法：先把 `\r\n`／`\r` 正規化成 `\n`；合併規則**容忍換行前後空白**、改用 lookahead 不吃右側字元（`A\nB\nC` 連續單行也能逐一合併）；**英數↔英數之間補回一個空格**（避免 `hello\nworld` 黏成 `helloworld`）。段落空行 `\n\n` 仍保留。補 8 個 vitest 案例。

**C. 主動訊息糊成一大顆泡泡（chatEngine.js）**：一般聊天回覆會經 `splitReply` 切連發短泡泡，但**定時提醒／生理期關心／想你／每日一問**四種主動訊息是整段 `text.trim()` 直接存**單則**訊息 → 動作旁白＋空行＋「對話」全糊在一顆泡泡。改為四者共用新 helper `persistProactive`（內部走 `persistReplySegments`，與一般回覆同樣切泡泡、未讀數依段數累加、建通知、通知開著的聊天室即時撈）。串流類主動訊息（proactive/touch/busy）本就已切泡泡、不受影響。

**D. 上游模型拒絕生成的 meta 回覆處理（chatEngine.js／ChatRoomView.vue）**：模型因供應商內容政策拒絕（「我無法繼續寫這個方向…」）時，原本這段出戲文字會以角色口吻**落庫**、永久破壞沉浸感並污染後續上下文。新增 `isRefusalReply()`（啟發式：以拒絕語開門見山、且全文無「」對話與 *動作* 標記 → 判為 meta 拒絕，避免誤判戲裡台詞）；`generateAIResponseStream` 命中則**不落庫、不觸發心聲**、回傳 `refused`。ChatRoomView 收到 `refused` 顯示置中系統提示＋「重新生成」按鈕（同上下文重打，拒絕有隨機性常重骰即過；根本解法是換模型）。**app 端無任何內容過濾，尺度由使用者選用的 provider／模型決定。**

| 檔案 | 變更 |
|------|------|
| `assets/main.css` | 自己氣泡 `.msg-quote` 白色加粗、`.msg-action` 半透明白（A） |
| `services/format.js` | 換行合併升級：正規化 `\r\n`、容忍空白、lookahead 逐一合併、英數補空格（B） |
| `services/chatEngine.js` | 新增 `persistProactive`，四種背景主動訊息改切泡泡（C）；新增 `isRefusalReply`／`REFUSAL_OPENER_RE`，`generateAIResponseStream` 回傳 `refused`（D） |
| `views/ChatRoomView.vue` | `streamSegmentedReply` 透傳 `refused`；sendMsg／doRegenerate 處理拒絕；新增 `retryAfterRefusal`、`refusalNotice` 提示與樣式（D） |
| `services/__tests__/format.test.js` | 新增 8 個換行合併案例（B） |
| `views/SettingsView.vue` | P100 → P101 |

---

### P102 互動教學示範模式：複用真實畫面元件的 demo 沙盒（2026-07-04）

**背景**：教學手冊原本是 Notion 一大篇文字。要做成「像真的在操作」的教學網站，但截圖會隨版本迭代過時、維護成本高。結論改採「**讓真實的 Vue 畫面元件跑在隔離的 Demo 模式**」——同一份 App、同一批 component，靠 `?demo=1` 進入。App UI 一改，示範自動同步、零截圖；再疊一層螢幕感知教學面板。

**核心設計（低侵入，旗標關閉時對正式 App 零影響）**：
- **單一 AI 入口攔截**：全站 AI 最終都經 `services/llm.js` 的 `callLLM`。在其開頭加 `if (isDemo())` 守衛，回傳假腳本（相容串流：`onStart` → 分段 `onChunk` → `{ fullText, truncated:false }`），免金鑰、不外連。
- **資料庫隔離**：`services/db.js` 開 DB 時依 `isDemo()` 切到獨立的 `auris-demo`，其餘讀寫函式吃 module 級 `db` 自動跟著隔離，**碰不到使用者真實 `auris` 資料**（已用 sentinel 實測驗證）。
- **免改 App.vue**：`main.js` 的 demo 分支先 `seedDemoIfEmpty()` 灌「夜雨／小晴」示範世界＋`onboarding_done`＋`last_seen_announcement`，App.vue 的引導與公告判斷靠資料自然略過。
- **教學面板不侵入**：`main.js` 於主 app mount 後，另建節點把 `DemoTeachingPanel.vue` 當第二個小 Vue app 掛上（共用同一 router 讀當前路由），完全不動 App.vue。面板依 route name 顯示該頁說明（文案取自使用手冊）。
- **入口**：設定頁「使用教學」列另開分頁進 `?demo=1`；或直接用 `?demo=1` 網址（可放官網／分享）。

| 檔案 | 變更 |
|------|------|
| `services/demoMode.js` | 新增。`isDemo()`（sessionStorage 黏著 `?demo=1`）、`demoEntryUrl()`、`exitDemo()` |
| `services/demoData.js` | 新增。夜雨／小晴 seed 資料＋`seedDemoIfEmpty()`＋`demoReply()`（依 system 關鍵字回對應題材假文字） |
| `services/demoGuideContent.js` | 新增。route name → `{ title, body[] }` 螢幕感知教學文案＋fallback |
| `components/DemoTeachingPanel.vue` | 新增。浮動「教學」鈕＋底部螢幕感知面板（含離開示範） |
| `services/db.js` | `initDB` 開 DB 名稱依 `isDemo()` 切 `auris-demo`（一行守衛） |
| `services/llm.js` | `callLLM` 開頭加 demo 假回覆守衛（相容串流/非串流） |
| `main.js` | demo 分支：mount 前 `seedDemoIfEmpty()`、mount 後掛載 `DemoTeachingPanel` |
| `views/SettingsView.vue` | 新增「使用教學」入口列；P101 → P102 |

---

### P103 聊天室排版重診：泡泡雙重壓縮・保留原始分行・主動訊息出戲修正（2026-07-05）

**背景**：使用者以「聊天匯出 JSON vs 手機畫面截圖」對照回報三個問題：樣式跑掉、分行跑掉、內容對不上。用 Playwright 把匯出檔資料原樣種進本地重現，逐一定位——並發現 **P56/P101 的「孤立換行合併」是誤診**。

**A. 泡泡雙重 74% 壓縮（main.css）**：`.msg-with-av`（max-width 74%）內層的 `.msg` 又套一次 74% → 帶頭像的第一顆泡泡上限只有 74%×74%≈196px，比後續 `.msg-cont`（74%+33px）窄一大截（樣式跑掉）；且「shrink-to-fit 父容器 × 百分比 max-width 子元素」形成循環收縮，短句（實測「吃晚餐了沒」，DB 內**無換行**）在 iPhone 3x 亞像素下無故折成兩行——**這就是 P56/P101 當年「句中被腰斬」的真正病根，當時誤診為模型硬換行**。修法：`.msg-with-av` 上限改 `calc(74% + 33px)`（含頭像列）、內層 `.msg` 解除上限（`max-width:none;min-width:0`）；374px 媒體查詢同步。修正後首顆與後續泡泡同寬、右緣對齊。

**B. 停止合併孤立換行（format.js）**：實證（匯出檔 `今天心情看起來不錯\n做什麼了` 是模型刻意的兩句分行）顯示單一 `\n` 是有意分行，P101 的合併規則把它黏成一長串（分行跑掉）。既然 A 已修掉腰斬的真兇，P103 起**保留所有單一換行**，只做 `\r` 正規化、行尾空白清理、3+ 連續換行收斂。`format.test.js` 換行測試組改寫為「換行保留」行為（9 案例）。

**C. 主動訊息冷場出戲（chatEngine.js）**：`buildProactiveHistory` 冷場分支（5 分鐘沒對話）原指令「**不要接續上面的舊話題**」＋task「**問問近況**」＝明文叫模型失憶——劇情演到「兩人正在同一空間相處、晚餐延後」，19 分鐘後主動訊息卻是「吃晚餐了沒／今天做什麼了」這種分開一整天式問候（內容對不上）。修法：冷場分支改為「可以開新話題，但必須與上面對話的最後情境銜接得上——若劇情裡你們正在同一空間相處，就順著『人還在身邊』的情境說話」；task 的「問問近況」改為情境中性的「說說你此刻在做什麼或想什麼」。所有主動訊息種類（定時／生理期／想你／每日一問／環境）共用此入口、一次全覆蓋。

**驗證**：vitest 52/52 通過；Playwright 以同一批資料重現比對——「吃晚餐了沒」回到單行、「今天心情看起來不錯／做什麼了」保留兩行、首顆泡泡與後續同寬。

| 檔案 | 變更 |
|------|------|
| `assets/main.css` | `.msg-with-av` 上限 `calc(74%+33px)`＋內層 `.msg` 解除 74%（A）；374px 媒體查詢同步 |
| `services/format.js` | 移除孤立換行合併，保留原始分行；行尾空白清理（B） |
| `services/__tests__/format.test.js` | 換行測試組改寫為「換行保留（P103）」9 案例（B） |
| `services/chatEngine.js` | 冷場分支指令改情境相容；task「問問近況」改情境中性（C） |
| `views/SettingsView.vue` | P102 → P103 |

---

### P104 {{user}} 佔位符全站替換・心聲截斷再修（2026-07-07）

**背景**：正式版實測回報兩個 bug：(1) 聊天泡泡出現原文 `{{user}}`（「看見{{user}}窩在沙發上滑手機的樣子」），模型沒把佔位符換成使用者名字；(2) 心聲又出現截斷殘句（「管她什麼心跳，我的早就」「連妳嗔怒的模樣，都」），P94 修過卻復發。

**A. `{{user}}`/`{{char}}` 佔位符（format.js＋chatEngine.js＋contentEngine.js）**：追查發現全專案**從未有過佔位符替換邏輯**——角色卡欄位（個性／背景故事／關係背景／補充指令／範例對話）若照 SillyTavern 慣例寫了 `{{user}}`，會原封不動進 system prompt，模型便學著照抄進輸出，落庫與顯示層也都沒攔。修法為雙保險：
- **治本（prompt 端）**：新增 `applyNameMacros(text, userName, charName)`（大小寫、空白變體都吃），單聊 systemStable/systemVolatile、群聊 systemPrompt、貼文／留言回覆／日記／夢境 prompt 組完後整段替換成真名。
- **治標（輸出端）**：`persistReplySegments`（單聊＋所有主動訊息共用落庫點）、群聊落庫、contentEngine 四個生成器的輸出，存檔前再掃一次，模型即使自己輸出佔位符也不會進 DB。
- 既有已存的 `{{user}}` 訊息不回溯改寫，可長按刪除或重新生成。

**B. 心聲截斷復發（llm.js＋chatEngine.js）**：P94 把 max_tokens 80→220 並加了「<6 字＋逗號結尾」啟發式，但漏了兩層：(1) `callLLM` 的**非串流**路徑拿到完整 JSON 卻從不讀 `finish_reason`，`truncated` 永遠回 `false`（P94 只修了 SSE 串流路徑），心聲走非串流、被切斷了呼叫端也不知道；(2) 這次的殘句 11 字、結尾無標點，完美閃過啟發式。且推理型模型思考先吃掉 220 額度，輸出照樣被硬切。修法：
- `llm.js` 非串流三分支補上截斷偵測：OpenAI 相容 `finish_reason === 'length'`、Anthropic `stop_reason === 'max_tokens'`、Vertex `finishReason === 'MAX_TOKENS'`。
- `generateHeartVoice` 改直連 `callLLM` 拿 `truncated`，**被硬切一律不存、不發通知**（寧缺勿濫）；max_tokens 220→1000 讓推理型模型講得完（prompt 仍限 30 字、後處理仍有 50 字上限，不會讓心聲變長）。原啟發式保留作第二道防線（部分相容供應商不回 finish_reason）。

**驗證**：vitest 59/59 通過（新增 applyNameMacros 7 案例）；`npm run build` 成功。

| 檔案 | 變更 |
|------|------|
| `services/format.js` | 新增 `applyNameMacros`：{{user}}/{{char}} → 真名（A） |
| `services/llm.js` | 非串流三 provider 分支補 finish_reason 截斷偵測（B） |
| `services/chatEngine.js` | 單聊／群聊 prompt 端替換＋落庫端補刀（A）；心聲直連 callLLM、truncated 即棄、額度 220→1000（B） |
| `services/contentEngine.js` | 貼文／留言回覆／日記／夢境 prompt 端＋輸出端替換（A） |
| `services/__tests__/format.test.js` | applyNameMacros 測試組 7 案例 |
| `views/SettingsView.vue` | P103 → P104 |

---

### P105 維運防線包：備份提醒＋診斷匯出＋群組 prompt caching（2026-07-08）

**背景**：「Auris 維運與新功能討論」全清單定案後的第一批——M1＋M3＋B1 合為維運包（三者同屬使用者無感的體質改善，且 M3 與 B1 同動 `llm.js`，一批改一批測）。規格見討論文件各定案段。

**A. 版號常數手術（M3 前置）**：新增 `src/version.js`（`APP_VERSION`／`VERSION_NOTE`），版號全站唯一來源；SettingsView 改引用顯示（版更不必再改 .vue）。連動：CLAUDE.md 第 1 項與檔案對照表、`/bump` skill、`check-version-bump.sh` 改盯 `version.js` 的 `APP_VERSION` diff，並實測 hook 仍能擋未版更 commit。

**B. 診斷匯出（M3）**：新增 `services/diag.js`——`logError` 錯誤 ring buffer（localStorage、30 筆、逐筆蓋當時版號、訊息截 300 字元；不依賴 IndexedDB，連 DB 初始化失敗都記得下來）＋`exportDiag` 組診斷純文字（版本＋UA＋螢幕/dpr＋PWA standalone＋主題＋provider/模型名＋角色/訊息計數＋最近錯誤，**絕不含訊息內容與 API 金鑰**）。`main.js` 啟動即掛 `error`/`unhandledrejection` 全域監聽；`llm.js` 的 `callLLM` 包一層失敗記錄（provider/model＋錯誤訊息含 HTTP 狀態，使用者主動中斷 AbortError 不記）。設定頁「資料」組新增「複製診斷資訊」列：剪貼簿為主、下載 .txt 備援。

**C. 備份提醒（M1）**：匯出邏輯抽成 `services/backup.js`（`doBackup`／`markBackedUp`／`snoozeBackupReminder`／`shouldRemindBackup`），設定頁與首頁共用。提醒規則：從未備份且訊息總數 ≥ 50 → 首次提醒；距上次備份 ≥ 14 天 → 逾期提醒（帶天數）；「稍後」snooze 3 天；匯出／匯入成功皆重置計時（匯入＝手上有新鮮備份檔）。HomeView 仿 mood-card 提醒卡（工具式中性文案、「立即備份／稍後」雙鍵）。背景：iOS Safari 對未加桌面的網站 7 天未造訪可能整站清資料，備份是唯一防線。

**D. 群組 prompt caching（B1）**：盤點發現主路徑（單聊＋全部主動訊息）P100 起已切穩定／易變段，唯一缺口是群聊仍傳純字串。`buildGroupChatSetup` 比照單聊拆 `systemStable`（參與者、人設、背景故事、回覆規則——設 Anthropic 快取點）＋`systemVolatile`（現在時間、點名提醒——挪到快取點之後）；Gemini/OpenAI 靠自動前綴快取受惠。一次性呼叫（總結／日記等）快取無意義、不動。

**驗證**：vitest 74/74 通過（新增 backup 8 案例＋diag 7 案例）；`npm run build` 成功；hook 擋未版更 commit 實測通過。

| 檔案 | 變更 |
|------|------|
| `src/version.js` | 新增：`APP_VERSION`／`VERSION_NOTE` 常數（A） |
| `services/diag.js` | 新增：錯誤 ring buffer＋診斷匯出（B） |
| `services/backup.js` | 新增：就地備份＋備份提醒判斷（C） |
| `services/db.js` | 新增 `dbCount`（整店計數，備份門檻／診斷計數用） |
| `services/llm.js` | `callLLM` 包失敗記錄層（B） |
| `services/chatEngine.js` | 群聊 prompt 切穩定／易變段＋設快取點（D） |
| `main.js` | 啟動掛全域錯誤監聽、initDB 失敗記診斷（B） |
| `views/SettingsView.vue` | 版號改引用 version.js（A）；「複製診斷資訊」列（B）；匯出改走 backup.js、匯入成功重置計時（C） |
| `views/HomeView.vue` | 備份提醒卡（C） |
| `services/__tests__/backup.test.js` | 新增：提醒門檻／snooze／重置 8 案例 |
| `services/__tests__/diag.test.js` | 新增：ring buffer／容錯 7 案例 |
| `.claude/hooks/check-version-bump.sh`、`.claude/skills/bump/SKILL.md`、`CLAUDE.md` | 版號檢查改盯 version.js（A） |

---

### P106 泡泡長按選單批：B3 訊息朗讀＋D2 回憶收藏盒＋F1 對話分享卡（2026-07-11）

**背景**：「Auris 維運與新功能討論」定案清單的第二批。討論文件明示「泡泡長按選單一次住進三個新功能：B3 朗讀、D2 收藏、F1 分享——同一批做最省」，故三項合為一版；載體＝單聊既有的訊息長按 action sheet（P96 起就有）。

**A. 訊息朗讀（B3，TTS 輕量版）**：新增 `services/speech.js`——`speechSynthesis` 純前端免費朗讀，zh-TW 語音優先；`stripActionText` 先剝括號動作描寫（唸「（抱住了你）晚安」只唸「晚安」，整句都是動作則照唸）。長按訊息 →「朗讀」；不做自動朗讀（iOS 中文系統音偏機械，自動播破壞氣氛）；離開聊天室即停。瀏覽器不支援 speechSynthesis 時選項不出現。

**B. 回憶收藏盒（D2）**：新增 `services/keepsakes.js`——**存快照不存引用**（settings `keepsakes`，清空聊天後收藏仍在），同一則訊息重複收藏會擋。長按 →「收藏成回憶」→ 選填一行備註（60 字內）→ 入盒。入口＝關係主頁新入口卡「我們的回憶」→ 新頁 `MemoriesView`（路由 `/memories/:id`，26 條）：收藏列表（說話者／日期／內容／備註）、兩段式刪除（先變「確認刪除」再點才刪）。V1 不注入 prompt；規格中的「歷月回顧｜收藏」雙分頁等 D1 回憶月報實作時再擴。

**C. 對話分享卡（F1）**：新增 `services/shareCard.js`——canvas 生成對話美圖卡，配色讀當前主題 CSS 變數（6 款主題自動跟色），CJK 逐字換行、拉丁字串不拆；浮水印「Auris」＋網址（小字淡色）。長按 →「分享成卡片」→ 預覽 modal：可勾「帶上前一則」成一問一答（自動跳過心聲／輕觸動作行）、「顯示角色名字」可切匿名（匿名顯示「Ta」）；**使用者側一律不出現名字**（隱私預設）。輸出走 `navigator.share` 檔案分享，不支援則下載 PNG；使用者收掉分享面板不當錯誤。V1 僅文字訊息；D1 月報存圖未來共用此引擎。

**驗證**：vitest 87/87 通過（新增 keepsakes 8 案例＋speech 5 案例）；`npm run build` 成功。

| 檔案 | 變更 |
|------|------|
| `services/speech.js` | 新增：朗讀＋`stripActionText` 動作剝除（A） |
| `services/keepsakes.js` | 新增：收藏快照 CRUD（B） |
| `services/shareCard.js` | 新增：canvas 分享卡＋share/下載（C） |
| `views/ChatRoomView.vue` | 長按選單加三項；收藏備註、分享卡預覽兩個 modal；離房停朗讀 |
| `views/MemoriesView.vue` | 新增：「我們的回憶」收藏列表頁（B） |
| `views/RelationView.vue` | 「我們的回憶」入口卡（B） |
| `router/index.js` | 新路由 `/memories/:id`（25 → 26 條） |
| `services/__tests__/keepsakes.test.js` | 新增：快照／去重／排序／刪改 8 案例 |
| `services/__tests__/speech.test.js` | 新增：動作剝除 5 案例 |

---

### P107 測試回饋修正：心聲刪除列定位＋分享卡主題色與一問一答＋心聲簡體字/拒絕句（2026-07-12）

**背景**：P105＋P106 一輪實測（iPhone）回報的三個 bug。

**A. 心聲管理刪除列卡在畫面中間**：`.bb-manage-bar` 原為 `position:fixed; bottom:0`，但 `.page` 有 `transform`（頁面轉場動畫）——transform 會讓 fixed 後代改以該祖先為定位基準、退化成跟著內容捲動，於是刪除列釘死在列表中段。改 `position:sticky; bottom:0`：釘在 `.page` 捲動區可視底部（`.screen` 底緣＝BottomNav 上緣），不受 transform 影響。**通則：`.page` 內不要用 `position:fixed`**（聊天室 msg-sheet 沒事是因為該頁不捲動整頁）。

**B1. 分享卡配色不跟主題**：主題變數是掛在 `#phone-container` 的 `[data-theme]` 覆寫、不在 `:root`，`themeColors()` 原讀 `documentElement` 永遠拿到預設奶白。改讀 `#phone-container`。

**B2. 一問一答看不出是兩個人**：`findPrevTextMsg` 原本找「上一則文字訊息」不分角色——splitReply 會把角色回覆切成連續多顆泡泡，找到的多半是同一人的上一顆（兩顆同色同側）。改限定 **role 相反**才算一問一答（必定一左一右、白/玫瑰兩色），checkbox 文案也依對象動態顯示「帶上你／他說的上一句」。

**C. 心聲偶發簡體字＋拒絕句誤存**：HV prompt 的「繁體中文」約束太弱（該 prompt 無完整人設上下文，模型易飄簡體），強化為「一律使用繁體中文（台灣用語），嚴禁出現任何簡體字」獨立鐵則；另比照聊天主路徑，存入前過 `isRefusalReply`——實測發現有一筆心聲存成 "I can't help with this request."（抽象任務偶被上游拒絕），此類不落庫。

**驗證**：vitest 87/87；build 成功。

| 檔案 | 變更 |
|------|------|
| `assets/main.css` | `.bb-manage-bar` fixed → sticky（A） |
| `services/shareCard.js` | `themeColors()` 改讀 `#phone-container`（B1） |
| `views/ChatRoomView.vue` | `findPrevTextMsg` 限定對方訊息＋動態文案（B2） |
| `services/chatEngine.js` | HV prompt 繁體鐵則＋`isRefusalReply` 過濾（C） |

---

### P108 朗讀功能暫時下架（2026-07-12，當前版本）

**背景**：P106 上線的 B3 訊息朗讀實測後，iOS 中文系統語音（speechSynthesis 能拿到的等級）偏機械，不符「使用者要有良好體驗」的標準——與其留一個聽了出戲的功能，先下架。

**做法**：只拆 UI、保留引擎——ChatRoomView 長按選單移除「朗讀」項與相關 handler/import；`services/speech.js` 與 speech 測試 5 案例**保留**（檔頭註記暫下架），待未來接高品質 TTS API（BYOK，可挑男女聲／per 角色配音）時直接復用 `stripActionText` 等邏輯。討論文件 B3 改標「暫下架、待高品質 TTS 再議」。

**驗證**：vitest 87/87；build 成功。

| 檔案 | 變更 |
|------|------|
| `views/ChatRoomView.vue` | 移除長按選單「朗讀」項＋doSpeak/import/stopSpeak 呼叫 |
| `services/speech.js` | 檔頭註記 P108 暫下架（程式保留） |

---

## 🎨 當前技術棧（Vue 版現況）

```
框架    Vue 3.5（Composition API + <script setup>），單檔元件 SFC
路由    Vue Router 4（createWebHistory，配合 GitHub Pages 404 redirect），26 條路由
建置    Vite，HMR 開發，build 至 dist/ 後 copy 至專案根目錄
狀態    自製 globalStore（reactive，characters/theme/keyboardOffset/chatFormatStyle）
CSS     CSS Variables 主題系統（6 主題）、Flexbox/Grid、safe-area-inset
資料    IndexedDB（auris，v7，14 個 store）；無 localStorage/sessionStorage
API     OpenAI 相容 + Anthropic 原生 + Google AI Studio / Vertex AI 原生；串流 SSE（P47）
```

### 服務層（`auris-vue/src/services/`）

| 檔案 | 職責 |
|------|------|
| `db.js` | IndexedDB CRUD、export/import、settings 讀寫 |
| `api.js` | `fetchWithTimeout`、`sendLLMRequest`（統一 LLM 入口）、`getVertexToken`、`getDefModel`（各家預設款）、`isReasoningModel`（推理型模型 temperature 相容判斷） |
| `date.js` | `localDateKey(d)`：本地時區 `YYYY-MM-DD`，全站「每天一次」判定共用（P97） |
| `chatEngine.js` | 對話引擎：串流回覆、群組、主動訊息、記憶總結（含自動）、Heart Voice、生理期關心、世界書注入、作息／時間流逝感知、圖片識別 |
| `contentEngine.js` | 內容生成：貼文／日記／夢境／留言回覆 |
| `format.js` | 共用 `formatContent`（escape + 換行清洗）全站 v-html 渲染點引用；`splitReply`（依空行把回覆切多則短泡泡，P82）|
| `cycle.js` | 生理期週期階段計算與提示／標籤組裝（P59） |
| `weather.js` | 天氣感知：Open-Meteo 查詢＋地名正/反查＋WMO code 中文化＋30 分鐘快取，`getWeatherCtx()` 供 prompt 注入（P95） |
| `llm.js` | 統一 LLM 呼叫層（P99）：五家 provider 請求組裝＋回應解析收斂於 `callLLM`；demo 模式在此攔截回假腳本（P102） |
| `demoMode.js` | 教學/Demo 模式旗標（P102）：`isDemo()`（sessionStorage 黏著 `?demo=1`）、`demoEntryUrl`、`exitDemo` |
| `demoData.js` | 教學示範資料（夜雨／小晴）＋`seedDemoIfEmpty`＋假 AI 回覆 `demoReply`（P102） |
| `demoGuideContent.js` | 螢幕感知教學文案：route name → 說明（P102） |
| `version.js`（src/） | `APP_VERSION`／`VERSION_NOTE` 版號常數，全站唯一來源（P105） |
| `diag.js` | 錯誤 ring buffer（`logError`）＋診斷純文字匯出（`exportDiag`）（P105） |
| `backup.js` | 就地備份＋備份提醒判斷（P105） |
| `speech.js` | 訊息朗讀引擎：speechSynthesis＋括號動作剝除（P106；**P108 起 UI 暫下架**，引擎保留待高品質 TTS） |
| `keepsakes.js` | 回憶收藏盒：訊息快照 CRUD，存 settings `keepsakes`（P106） |
| `shareCard.js` | 對話分享卡：canvas 生成主題配色美圖卡＋share/下載（P106） |

### 元件（`auris-vue/src/components/`）
`BottomNav.vue`（底部導覽、鍵盤隱藏）、`AnnouncementModal.vue`（更新公告三頁式 modal）、`DemoTeachingPanel.vue`（教學示範模式的浮動教學鈕＋螢幕感知面板，P102）

### IndexedDB（`auris`，v7，14 個 store）
characters / messages / memories / moments / diary / dreams / worlds / groups / group_messages / notifications / chat_memories / wishes / notes / settings。
> v7（P98）：`messages` 加複合索引 `charId_createdAt`（背景派發 cursor／計數用）。升版只能新增 store 或索引；修改既有結構需刪掉重建會清空資料。詳見 `ARCHITECTURE.md`。

---

## 🗂️ 檔案結構

```
專案根目錄（本地開發目錄，依機器而異）
├─ index.html / assets/            ← Vue build 輸出（copy 自 dist/，GitHub Pages 部署）
├─ Auris 完整開發進度總覽.md       ← 本文件
├─ archive/                        ← 舊版 HTML 單檔（唯讀參考，不修改）
└─ auris-vue/                      ← Vue 3 原始碼（正式）
   ├─ index.html / vite.config.js / package.json
   ├─ ARCHITECTURE.md              ← 架構規格文件
   ├─ public/404.html              ← SPA redirect
   ├─ dist/                        ← 建置輸出
   └─ src/
      ├─ App.vue / main.js
      ├─ assets/main.css           ← CSS Variables + 全域樣式
      ├─ router/index.js           ← 26 條路由
      ├─ store/index.js            ← globalStore
      ├─ services/                 ← db / api / llm / chatEngine / contentEngine / format / cycle
      ├─ components/               ← BottomNav / AnnouncementModal
      └─ views/                    ← 26 個 View
```

---

## ✅ 已知問題（皆已解決，歸檔）

| 問題 | 解決於 | 方案 |
|------|--------|------|
| iPhone PWA 底部空隙 | P28 | `--kb-offset` CSS 變數 + visualViewport 追蹤 |
| 聊天訊息被截斷（長篇） | P33 | 長篇 regex 擴充（中文數字 + 口語動詞） |
| Heart Voice 變續寫故事 | P33 | max_tokens 80 + prompt 30 字 + 句尾截斷 |
| 貼文/日記/夢境生成無反應 | P33 | Gemini 不支援 penalty 參數，改條件加入 |
| 群組點名角色不回應 | P34 | 點名偵測 + 強制回應 + 優先排序 |
| 群組角色自編對話 | P35/P36 | 保守清洗 + 保險絲 fallback |
| GitHub Pages 重載 404 | P39 | `public/404.html` SPA redirect |
| Vue 版 modal 無樣式 | P38 | 補齊 modal CSS |
| 底部「對話」tab 導向錯誤 | P38 | `/chat` → `/chat-list` |
| 貼文留言回覆 503/靜默失敗 | P44/P45 | `sendLLMRequest` 容錯重做 |
| iOS 鍵盤白色空白 | P41/P42/P45 | `height:100dvh` + body `position:fixed` |
| 群組只單人回覆 | P41 | 全員依序回覆機制 |
| Anthropic CORS | P57 | dangerous-direct-browser-access header |
| IndexedDB 競態 | P57 | initDB 移至 mount 前 await |
| 群組玩家名字不顯示 | P56 | key `my_profile`→`me_settings` |
| 誤刪角色（左划） | P58 | 左划移除刪角色入口 + 確認 modal |

---

## 📝 歷史備註：HTML 單檔時代（P1–P36）

P1–P36 為單一 HTML 檔開發（最終態 `auris-p36-bugfix.html`，約 5,489 行：HTML/CSS/JS 混寫，15+ 頁面以 `nav_()` 切換）。檔案以 `auris-p{版本}-{描述}.html` 命名，現存於 `archive/` 唯讀參考。P37 起完整遷移至 Vue 3，HTML 版不再維護。

> 此時代累積的關鍵除錯教訓已併入上方各 P 記錄（如 P14–P18 鍵盤空隙、P33 Gemini 相容性偵錯方法論、P35/P36 群組清洗的保守原則）。

---

**🎯 專案目標**：打造最自然、最有溫度的 AI 角色聊天體驗
**💪 開發信念**：細節決定體驗，體驗決定情感連結
