# 🎨 Auris 完整開發進度總覽

**最後更新**：2026-06-17
**當前版本**：P83（聊天室細修：泡泡切分上限降為 2・時間改在整組對話框結束後顯示・確認彈窗修回實心底・iOS PWA 鍵盤升起不再透底）
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

## ✅ Phase 4：Vue 版持續迭代（P39–P79）

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

### P83 聊天室細修：泡泡切分上限降為 2・時間改在整組對話框結束後顯示・確認彈窗修回實心底・iOS PWA 鍵盤升起不再透底（2026-06-17，當前版本）

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

## 🎨 當前技術棧（Vue 版現況）

```
框架    Vue 3.5（Composition API + <script setup>），單檔元件 SFC
路由    Vue Router 4（createWebHistory，配合 GitHub Pages 404 redirect），25 條路由
建置    Vite，HMR 開發，build 至 dist/ 後 copy 至專案根目錄
狀態    自製 globalStore（reactive，characters/theme/keyboardOffset/chatFormatStyle）
CSS     CSS Variables 主題系統（6 主題）、Flexbox/Grid、safe-area-inset
資料    IndexedDB（auris，v6，14 個 store）；無 localStorage/sessionStorage
API     OpenAI 相容 + Anthropic 原生 + Google AI Studio / Vertex AI 原生；串流 SSE（P47）
```

### 服務層（`auris-vue/src/services/`）

| 檔案 | 職責 |
|------|------|
| `db.js` | IndexedDB CRUD、export/import、settings 讀寫 |
| `api.js` | `fetchWithTimeout`、`sendLLMRequest`（統一 LLM 入口）、`getVertexToken` |
| `chatEngine.js` | 對話引擎：串流回覆、群組、主動訊息、記憶總結（含自動）、Heart Voice、生理期關心、世界書注入、作息／時間流逝感知、圖片識別 |
| `contentEngine.js` | 內容生成：貼文／日記／夢境／留言回覆 |
| `format.js` | 共用 `formatContent`（escape + 換行清洗）全站 v-html 渲染點引用；`splitReply`（依空行把回覆切多則短泡泡，P82）|
| `cycle.js` | 生理期週期階段計算與提示／標籤組裝（P59） |

### 元件（`auris-vue/src/components/`）
`BottomNav.vue`（底部導覽、鍵盤隱藏）、`AnnouncementModal.vue`（更新公告三頁式 modal）

### IndexedDB（`auris`，v6，14 個 store）
characters / messages / memories / moments / diary / dreams / worlds / groups / group_messages / notifications / chat_memories / wishes / notes / settings。
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
      ├─ router/index.js           ← 25 條路由
      ├─ store/index.js            ← globalStore
      ├─ services/                 ← db / api / chatEngine / contentEngine / format / cycle
      ├─ components/               ← BottomNav / AnnouncementModal
      └─ views/                    ← 25 個 View
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
