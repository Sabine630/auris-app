# Auris 專案 Claude 工作規則

## 版更 Checklist（每次 commit 前必做）

每次有功能修改、bug 修復、UI 調整，在 commit 前必須完成以下三件事，**缺一不可**：

### 1. 更新設定頁版號
**檔案**：`auris-vue/src/views/SettingsView.vue`
- 找到版號（搜尋 `Auris · v`）
- 更新版號字串
- 更新下方一行的修復摘要（簡短描述這次改了什麼）

### 2. 更新進度總覽文件
**檔案**：`Auris 完整開發進度總覽.ini`
- 在最後一個 P 節（`### P4x: ...`）後面新增本次進度節
- 格式參考現有節的結構：標題、日期、版本、功能描述、受影響檔案表格

### 3. 更新架構文件（若有技術/架構/邏輯異動）
**檔案**：`auris-vue/ARCHITECTURE.md`
- 在「版本更新紀錄」區塊最前面插入新版本的記錄
- 若有新增 service、store、component、重要邏輯變更也一併更新對應章節

---

## Build & Deploy 流程

```bash
# 1. Build
cd auris-vue && npm run build

# 2. Copy to root
cp -r dist/* ..

# 3. Clean old assets
git rm assets/index-{舊hash}.{css,js}

# 4. Stage & commit
git add -A
git commit -m "Fix vX.XX: 摘要"
```

**推上 Git 前必須先問使用者是否確認推送。**

---

## 專案架構速查

- **Vue 源碼**：`auris-vue/src/`
- **Build 輸出**：直接 copy 到專案根目錄（`assets/`, `index.html`）
- **部署**：GitHub Pages (`sabine630.github.io/auris-app`)
- **Archive（舊版 HTML 單檔）**：`archive/` — 唯讀參考，不修改

## 重要檔案對照

| 目的 | 檔案 |
|------|------|
| 版號顯示 | `auris-vue/src/views/SettingsView.vue` |
| 進度紀錄 | `Auris 完整開發進度總覽.ini` |
| 架構文件 | `auris-vue/ARCHITECTURE.md` |
| 全域樣式 | `auris-vue/src/assets/main.css` |
| 全域狀態 | `auris-vue/src/store/index.js` |
| API 底層 | `auris-vue/src/services/api.js` |
| AI 生成 | `auris-vue/src/services/contentEngine.js` |
| 聊天引擎 | `auris-vue/src/services/chatEngine.js` |

## iOS PWA 鍵盤處理原則

- `body` 需有 `position: fixed; width: 100%`（防 iOS 偷捲 visualViewport）
- `globalStore.keyboardOffset` 追蹤鍵盤高度，`BottomNav` 用 `kb-hidden` class 隱藏
- 輸入框 focus 時用 `scrollIntoView({ block: 'nearest' })` 確保可見
- **不要**在 phone container 加 `paddingBottom: keyboardOffset`（會造成空白）
