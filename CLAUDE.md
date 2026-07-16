# Auris 專案 Claude 工作規則

## 自動化防線與 Skills（2026-07-05 起）

工作規則已部分做成可執行的 skill 與強制 hook，**優先用 skill 走流程**：

| 指令 | 用途 |
|------|------|
| `/bump` | 版更 checklist 全流程（版號 +1、進度總覽、架構文件、功能清單、防呆自檢） |
| `/release` | 發布正式版（確認授權、公告版號四處同步、**上版前資安檢測**、merge dev→main、確認 Actions 部署） |
| `/verify-app` | 驗證改動（vitest、dev server 實測、排版問題先定層再動手） |

Hooks（共用腳本在 `scripts/hooks/`，由 `.claude/settings.json` 掛載；個人路徑與權限只放在已忽略的 `.claude/settings.local.json`）：
- **guard-main-push**：任何推送 main 的指令一律先跳使用者確認
- **check-version-bump**：commit 含 `auris-vue/src/` 異動時，強制檢查版號已 +1、進度總覽已更新、「當前版本」恰好 2 處；WIP 等特殊 commit 可在訊息加 `[skip-ver]` 略過
- **check-secret-leak**：commit 前掃描新增內容有無 API 金鑰／私鑰特徵（sk-…、AIza…、PRIVATE KEY、ghp_… 等；`sk-demo-` 為示範模式白名單），防測試金鑰誤入版控；確認誤報可在訊息加 `[skip-secret]` 略過

資安防線（2026-07-11 起）：CI（ci.yml）含 `npm audit --audit-level=high` 依賴弱掃；發正式版前 `/release` 步驟 3 必須依明確 checklist 審查整包待發 diff，不能只靠指令名稱宣稱已完成。

## 版更 Checklist（每次 commit 前必做，= /bump 的內容）

每次功能修改、bug 修復、UI 調整，commit 前依序完成。**第 1、2 項每次必做**，第 3、4 項視異動性質決定。

> ⚠️ 動工前先看本檔最後的「**防呆三原則**」——過去出包都栽在那三件事（亂序、重複「當前版本」、漏連動計數）。

### 1. 更新版號常數（必做）
**檔案**：`auris-vue/src/version.js`（P105 起版號集中此檔；設定頁 SettingsView 只是引用顯示，**不必再改**）
- `APP_VERSION` +1（如 `'P104'` → `'P105'`，格式**沒有 "v"**）
- `VERSION_NOTE` 改為本次改動的簡短摘要（顯示在設定頁版號下方）

### 2. 更新進度總覽（必做）
**檔案**：`Auris 完整開發進度總覽.md`
- 此檔為「**舊 → 新遞增**」排列，新節**加在編號最大的 P 節之後、`## 🎨 當前技術棧` 之前**（P 節後面還有「技術棧／檔案結構／已知問題／歷史備註」4 個固定尾節，**不是加在檔案最尾端**），不可插在中間或跳號
- 同步更新**檔頭的「當前版本」欄位**（並把舊節標題裡的「當前版本」字樣移除，見防呆原則 1）
- 若跨到新 Phase 範圍，更新 Phase 標題的版本區間（如「Phase 4：P39–P67」）
- 格式照現有節：標題（含日期）、功能描述、受影響檔案表格

### 3. 更新架構文件（有技術/架構/邏輯異動才做）
**檔案**：`auris-vue/ARCHITECTURE.md`
- 版本紀錄為「**新 → 舊降序**」，新版插在「## 12. 版本更新紀錄」**最前面**（與進度總覽方向相反，別搞混）
- 同步更新檔頭「最後更新」日期與版號
- 若新增 service / store / component / route / 欄位，一併更新對應章節與表格（IndexedDB 表、Router 表、Views 說明、目錄）

### 4. 更新產品功能清單（有「使用者看得到的新能力」才做）
**檔案**：`product_feature_list.md`
- **非必做**：純 bug 修、內部重構、文件調整免更新；只有新增或改變對使用者可見的功能時才更新
- 把新能力寫進對應章節；若該功能原本列在「產品藍圖」，記得從藍圖搬出來、標示已完成
- 同步檔頭「對應版本」

---

## 🛡️ 防呆三原則（每次 commit 前自我檢查，過去都栽在這）

1. **只能有一個「當前版本」**：改版時**先把上一版的「當前版本」字樣拿掉**，再標到新版。檢查法：`grep "當前版本"` 應只出現在「檔頭欄位 + 最新那一節」。
2. **不亂序**：兩份 .md 方向相反且固定——**進度總覽遞增（新在最下）**、**ARCHITECTURE 降序（新在最上）**。新節務必放對方向與位置，P 編號連續不跳號。
3. **不漏連動**：新增路由 / store / View / 欄位時，順手更新文件裡的**計數與表格**（路由數、View 數、store 欄位說明、me_settings/characters/messages 軟欄位）。改完 `grep` 一下舊數字（如 `21 條`）確認沒殘留。

---

## Branch 策略

- **`dev` 分支**：所有開發與修復一律先推到這裡，Vercel 自動部署測試版
- **`main` 分支**：只有使用者**明確確認**後才能推，推上去會更新對外公開的 GitHub Pages 正式版
- **絕對不可在未經確認的情況下推送到 `main`**

## Build & Deploy 流程

### 日常開發（推測試版）
```bash
git add <files>
git commit -m "Fix PXX: 摘要"
git push origin dev   # Vercel 自動部署測試版；GitHub Actions（ci.yml）自動跑 test＋build
```

### 發布正式版（使用者確認後才執行）
正式版由 **GitHub Actions**（`.github/workflows/deploy.yml`）自動 build＋部署——來源 `auris-vue/dist`，**不再手動 build／copy 到根目錄、也不需清舊 hash**（自 2026-05-20 起如此，P97-P100 整理批次移除了根目錄冗餘成品）。發布只是把 `dev` 合進 `main` 再推：
```bash
# 使用者明確確認後：
git checkout main && git merge dev
git push origin main   # Actions 自動 build（auris-vue/dist）並部署 GitHub Pages 正式版
```

**推 `dev` 屬日常流程，不需逐次確認；推 `main` 必須先取得使用者明確同意（guard-main-push hook 會再強制確認一次）。**

---

## 專案架構速查

- **Vue 源碼**：`auris-vue/src/`
- **Build 輸出**：`auris-vue/dist/`（正式版由 GitHub Actions 自 dist 部署，**不再 copy 到專案根目錄**）
- **測試版部署**：Vercel，監聽 `dev` 分支自動部署（`auris-app-git-dev-sabine630-6243s-projects.vercel.app`）；`dev` push 另由 GitHub Actions `ci.yml` 跑 test＋build
- **正式版部署**：GitHub Pages，GitHub Actions `deploy.yml`（`main` 分支自動 build `auris-vue/dist`，`sabine630.github.io/auris-app`）
- **Archive（舊版 HTML 單檔）**：`archive/` — 唯讀參考，不修改

## 重要檔案對照

| 目的 | 檔案 |
|------|------|
| 版號常數（版更時改這裡） | `auris-vue/src/version.js` |
| 診斷匯出（錯誤 ring buffer） | `auris-vue/src/services/diag.js` |
| 備份與備份提醒 | `auris-vue/src/services/backup.js` |
| 進度紀錄（遞增） | `Auris 完整開發進度總覽.md` |
| 維運速查（給使用者：觸發與查核方式） | `Auris 維運速查.md` |
| 架構文件（降序） | `auris-vue/ARCHITECTURE.md` |
| 產品功能清單（視需要） | `product_feature_list.md` |
| 歷史紀錄（完成的計畫書、審查報告、討論決議） | `docs/` |
| 全域樣式 | `auris-vue/src/assets/main.css` |
| 全域狀態 | `auris-vue/src/store/index.js` |
| API 底層 | `auris-vue/src/services/api.js` |
| AI 生成 | `auris-vue/src/services/contentEngine.js` |
| 聊天引擎 | `auris-vue/src/services/chatEngine.js` |

## iOS PWA 鍵盤處理原則

- `body` 需有 `position: fixed; width: 100%`（防 iOS 偷捲 visualViewport）
- `globalStore.keyboardOffset` 追蹤鍵盤高度，`BottomNav` 用 `kb-hidden` class 隱藏
- 聊天室／群聊／貼文留言使用 `services/keyboardViewport.js`＋`.keyboard-page`：外層不捲動，只有 `.keyboard-scroll` 捲動，輸入列是普通 flex 子元素（禁止 sticky/fixed）
- `.keyboard-page` 內的輸入框不得走 App 全域 smooth `scrollIntoView`；由 scoped visualViewport controller 局部調整頁面 top/bottom inset
- **不要**在 phone container 加 `paddingBottom: keyboardOffset`（會造成空白）
- **不要**把 `.phone` 高度／transform 綁到 visualViewport（P83 實機改爆、P85 已回退）
