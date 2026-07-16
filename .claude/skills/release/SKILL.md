---
name: release
description: 發布 Auris 正式版——確認使用者同意、公告版號四處同步、merge dev→main、推送並確認 GitHub Actions 部署。
---

# Auris 發布正式版（/release）

把 `dev` 合進 `main`，由 GitHub Actions（deploy.yml）自動 build `auris-vue/dist` 並部署 GitHub Pages 正式版。

## 步驟 0：確認授權（不可跳過）

必須在**本次對話中**取得使用者明確同意發布正式版。沒有明確的「確認發布」就中止流程。push main 時 hook 會再跳一次確認，屬正常防線。

## 步驟 1：公告版號同步（共 4 處，首頁最容易漏）

發正式版通常要更新使用者公告。版號散在 **4 個檔案**：

| 檔案 | 位置 |
|------|------|
| `auris-vue/src/App.vue` | `ANNOUNCEMENT_VERSION = 'P{N}'` |
| `auris-vue/src/components/AnnouncementModal.vue` | badge「P{N} 更新公告」＋教學文字「設定頁最底部顯示 P{N}」兩處 |
| `auris-vue/src/views/HomeView.vue` | 首頁「P{N} 更新公告」按鈕（**歷史上最常漏這處**） |
| `auris-vue/src/services/demoData.js` | `last_seen_announcement: 'P{N}'`（demo 帳號避免跳公告） |

檢查一致性（把 P103 換成當前公告版號）：

```bash
grep -rn "ANNOUNCEMENT_VERSION\|更新公告\|last_seen_announcement" auris-vue/src --include="*.vue" --include="*.js"
```

若本次發版**不**更新公告內容，可跳過，但要向使用者說明。公告內容本身也要改（AnnouncementModal.vue 的正文）。

## 步驟 2：確認 dev 狀態

```bash
git log origin/dev -1 --oneline   # 最新改動已推上 dev
```

確認 ci.yml 綠燈（test＋audit＋build 過）：優先用已連線的 GitHub app／API；若環境有 `gh` 才可使用 `gh run list --branch dev -L 3`。不得因本機沒有 `gh` 就略過遠端 CI 查核。

尚未推上 dev 的改動先走 /bump → commit → push dev，等 CI 綠燈。

## 步驟 3：上版前資安檢測（不可跳過）

1. **依賴弱掃**（CI 已擋過，這裡做最終確認）：
   ```bash
   cd auris-vue && npm audit --audit-level=high   # 應為 0 vulnerabilities
   ```
2. **程式碼資安審查（checklist 為必要步驟）**：直接審 `git diff main...dev` 的整包待發內容，至少逐項查核並留下結論：
   - 不可信輸入進 DOM：所有動態 `v-html` 是否經 `formatContent` escape；匯入 JSON／AI 回覆／錯誤訊息是否可能成為 HTML、URL 或 script sink。
   - 憑證與 endpoint：備份、診斷、log、demo、測試與新增檔案不得含真實 key；API base／provider 變更不得把既有 key 靜默送往新目的地。
   - 資料完整性：IndexedDB 多 store 寫入是否需要單一 transaction；匯入失敗不得破壞原資料或留下半套新增資料。
   - 外部請求與 CSP：圖片、連結、自訂 endpoint、第三方資源是否擴大追蹤或 CSP 攻擊面。
   - 依賴、workflow 與分支防線：audit 結果、Actions 權限、main required checks 與部署來源是否符合預期。
   - 對每個發現標出嚴重度、檔案／行號、可利用前提與驗收條件。medium 以上先修復並重跑；確認誤報時向使用者說明證據後才能放行。
3. **內建 `/security-review` 作為第二道檢查**：checklist 完成後額外執行 Claude Code 內建的 `/security-review`。它不能取代 checklist，也不能只因指令執行完成就宣稱資安審查通過；兩者的發現都要清零或說明。

## 步驟 4：合併與推送

```bash
git checkout main && git merge dev
git push origin main    # hook 會要求使用者確認——這是設計行為
git checkout dev        # 推完立刻切回開發分支
```

## 步驟 5：確認部署

使用 GitHub app／API 確認 main 最新 deploy workflow 成功；環境有 `gh` 時可用 `gh run list --branch main -L 1`。再開正式站核對實際版號與 console。

完成後正式站更新：https://sabine630.github.io/auris-app
