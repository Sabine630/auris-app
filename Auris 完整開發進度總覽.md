# 🎨 Auris 完整開發進度總覽

**最後更新**：2026-06-05
**當前版本**：P70（首頁改版・黑盒子改名心聲・世界書 & 我的設定入口）
**狀態**：上線後持續優化中

---

## 📌 專案資訊

- **專案名稱**：Auris（你說，他在聽）
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
- 🟢 **角色偶爾傳圖** — 角色偶爾「傳一張照片」給你（預設圖或 AI 生成）

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

## ✅ Phase 4：Vue 版持續迭代（P39–P70）

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

### P70 首頁改版・黑盒子改名心聲・世界書 & 我的設定入口（2026-06-06，當前版本）

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

## 🎨 當前技術棧（Vue 版現況）

```
框架    Vue 3.5（Composition API + <script setup>），單檔元件 SFC
路由    Vue Router 4（createWebHistory，配合 GitHub Pages 404 redirect），23 條路由
建置    Vite，HMR 開發，build 至 dist/ 後 copy 至專案根目錄
狀態    自製 globalStore（reactive，characters/theme/keyboardOffset）
CSS     CSS Variables 主題系統（6 主題）、Flexbox/Grid、safe-area-inset
資料    IndexedDB（auris，v5，12 個 store）；無 localStorage/sessionStorage
API     OpenAI 相容 + Anthropic 原生 + Google AI Studio / Vertex AI 原生；串流 SSE（P47）
```

### 服務層（`auris-vue/src/services/`）

| 檔案 | 職責 |
|------|------|
| `db.js` | IndexedDB CRUD、export/import、settings 讀寫 |
| `api.js` | `fetchWithTimeout`、`sendLLMRequest`（統一 LLM 入口）、`getVertexToken` |
| `chatEngine.js` | 對話引擎：串流回覆、群組、主動訊息、記憶總結（含自動）、Heart Voice、生理期關心、世界書注入、作息／時間流逝感知、圖片識別 |
| `contentEngine.js` | 內容生成：貼文／日記／夢境／留言回覆 |
| `format.js` | 共用 `formatContent`（escape + 換行清洗），全站 v-html 渲染點引用 |
| `cycle.js` | 生理期週期階段計算與提示／標籤組裝（P59） |

### 元件（`auris-vue/src/components/`）
`BottomNav.vue`（底部導覽、鍵盤隱藏）、`AnnouncementModal.vue`（更新公告三頁式 modal）

### IndexedDB（`auris`，v5，12 個 store）
characters / messages / memories / moments / diary / dreams / worlds / groups / group_messages / notifications / chat_memories / settings。
> 升版只能新增 store 或索引；修改既有結構需刪掉重建會清空資料。詳見 `ARCHITECTURE.md`。

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
      ├─ router/index.js           ← 23 條路由
      ├─ store/index.js            ← globalStore
      ├─ services/                 ← db / api / chatEngine / contentEngine / format / cycle
      ├─ components/               ← BottomNav / AnnouncementModal
      └─ views/                    ← 23 個 View
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
