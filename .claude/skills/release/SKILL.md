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
gh run list --branch dev -L 3     # ci.yml 綠燈（test＋audit＋build 過）
```

尚未推上 dev 的改動先走 /bump → commit → push dev，等 CI 綠燈。

## 步驟 3：上版前資安檢測（不可跳過）

1. **依賴弱掃**（CI 已擋過，這裡做最終確認）：
   ```bash
   cd auris-vue && npm audit --audit-level=high   # 應為 0 vulnerabilities
   ```
2. **程式碼資安審查**：執行內建的 `/security-review`，審當前分支相對 main 的整包待發改動（XSS、注入、金鑰硬編碼、不安全的資料處理等）。
   - Auris 重點面向：不可信輸入進 DOM（角色卡匯入、備份還原、AI 回覆渲染是否都走 `formatContent` escape）、CSP 是否被新功能鬆動、金鑰是否只存在使用者裝置。
   - 有 medium 以上的發現：先修復、重跑，全數清除才進下一步；確認為誤報則向使用者說明後放行。

## 步驟 4：合併與推送

```bash
git checkout main && git merge dev
git push origin main    # hook 會要求使用者確認——這是設計行為
git checkout dev        # 推完立刻切回開發分支
```

## 步驟 5：確認部署

```bash
gh run list --branch main -L 1   # 等 deploy.yml 綠燈
```

完成後正式站更新：https://sabine630.github.io/auris-app
