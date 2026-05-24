# Auris 開發接力說明（2026-05-25）

## 專案基本資訊
- **專案路徑**：`~/Desktop/AI測試/auris-app`
- **框架**：Vue 3 + Vite，純前端，資料存 IndexedDB（v5）
- **分支策略**：`dev` 開發 → Vercel 自動部署；`main` 僅使用者確認後推
- **測試版**：`auris-app-git-dev-sabine630-6243s-projects.vercel.app`
- **正式版**：`sabine630.github.io/auris-app`

## 當前狀態（今天剛推到 dev）
階段 A 四個功能全部開發完畢，**尚未測試驗收**：

| 功能 | P 號 | 主要檔案 |
|------|------|---------|
| 聊天室串流輸出 | P47 | `chatEngine.js` |
| 長期記憶抽屜 | P48 | `ChatRoomView.vue`、`chatEngine.js`、`db.js`（v5） |
| 動態回覆模式（主動傳訊 + 打斷） | P49 | `ChatRoomView.vue`、`chatEngine.js` |
| 每日自動生成日記/貼文 | P50 | `App.vue` |

## 測試清單（階段 A 驗收重點）
- [ ] 設定頁版號顯示 `Auris · P50`
- [ ] 聊天室標題列有腦波圖示，點開記憶抽屜正常
- [ ] 記憶 toggle 開關、AI 總結按鈕、token 估算正確
- [ ] 角色設為「自動」回覆模式後，一段時間內收到主動訊息
- [ ] 角色設為「自動可打斷」，打字時主動生成中斷
- [ ] 角色開啟 `autoDiary`/`autoPost` 後，第二天開啟 App 自動生成

## 重要檔案速查
| 目的 | 檔案 |
|------|------|
| 版號顯示 | `auris-vue/src/views/SettingsView.vue` |
| 進度紀錄 | `Auris 完整開發進度總覽.md` |
| 架構文件 | `auris-vue/ARCHITECTURE.md` |
| 全域狀態 | `auris-vue/src/store/index.js` |
| AI 聊天引擎 | `auris-vue/src/services/chatEngine.js` |
| 內容生成（日記/貼文） | `auris-vue/src/services/contentEngine.js` |
| DB 初始化 | `auris-vue/src/services/db.js`（現為 v5）|

## 下一階段：階段 B
確認階段 A 測試無誤後，下一步是：
1. **世界觀設定書（World Book）** — 與角色設定脫鉤的詞條庫
2. **定位系統 & 任務系統** — 每日登入與互動的遊戲化機制
3. **劇本 / 小說體驗** — AVG 選項分支與長篇協作創作

## 每次 commit 前必做（CLAUDE.md 規定）
1. 更新 `SettingsView.vue` 版號（搜尋 `Auris · P`）
2. 在 `Auris 完整開發進度總覽.md` 新增進度節
3. 在 `auris-vue/ARCHITECTURE.md` 版本更新紀錄最前面插入新紀錄

## 推送規則
- **一律先推 `dev`**，等使用者確認才推 `main`
- 推任何分支前都要先問使用者
