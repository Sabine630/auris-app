# 🛠️ Auris 維運速查（給 Sabine 的備忘）

> 開發系統（hooks／skills／CI 資安防線）的「怎麼觸發」與「怎麼查核」。
> 系統本體：共用 hooks 在 `scripts/hooks/`；Claude/Codex 分別由 `.claude/settings.json`、`.codex/hooks.json` 掛載；skills 在 `.claude/skills/`、`.agents/skills/`；CI 在 `.github/workflows/ci.yml`。
> 建立：2026-07-05～07-11（P105 前後）。

---

## 一、怎麼觸發

| 情境 | 要做的事 |
|------|-----------|
| 日常改功能、修 bug | **什麼都不用**。照常敘述需求；commit 時三道 hook 自動跑，push dev 後 CI 自動跑弱掃 |
| 明確走版更流程 | 打 `/bump`（或說「照流程收尾」） |
| 發正式版 | 打 `/release`，或直接說「發正式版」——SOP 含上版前資安檢測 |
| 單獨驗證改動 | 打 `/verify-app` |
| 隨時做資安審查 | 直接要求「依資安 checklist 審查目前分支相對 main 的 diff」；不得假設每個工具都有同名 `/security-review` 指令 |

**hooks 和 CI 在正常流程會自動觸發**。`[skip-ver]`／`[skip-secret]` 是有意保留的特殊逃生口，使用時必須在 commit 訊息留下原因；遠端 branch rules 才是跨工具、跨電腦的最終防線。

---

## 二、怎麼知道 Claude 真的照做（兩個信任等級）

### 機器強制——不用查，做錯會被擋

- **推 main**：畫面**必定**跳出「⚠️ 對外正式版」確認框。沒看到確認框＝main 沒被動過（這是 harness 行為，不是 Claude 的承諾）。
- **版更／金鑰**：commit 當下被 hook 擋下並逼 Claude 先修。畫面偶爾閃過「檢查版更 checklist…」「掃描金鑰外洩…」＝它們在跑。
- **依賴弱掃**：跑在 GitHub 伺服器上，與 Claude 無關，Actions 頁面公開留底。

### 流程性——30 秒抽查四招

1. **看 app**（最直觀）：Vercel 測試版設定頁最底部，版號應 +1、摘要應是這次改的東西。版號沒動＝流程沒走完。
2. **看 commit**：`git log --oneline -5`——功能 commit 開頭應為 `Fix P{新版號}:`，與設定頁一致。
3. **看 GitHub Actions**：每次 push dev 有一條 CI（含 Audit dependencies，點進去可見 `found 0 vulnerabilities`）；發版後 main 有一條 deploy。
4. **發版時看對話**：應看到待發 diff 的審查範圍、逐項 checklist、發現清單與驗收結果；只說「已跑 security review」不算證據。

隨時可用：`/hooks` 看三道 hook（也能暫停用）、`/permissions` 看 Claude 被允許自動做哪些事。

---

## 三、逃生口（特殊情況才用）

| 情況 | 做法 |
|------|------|
| WIP／還原類 commit，不該版更 | commit 訊息加 `[skip-ver]` |
| 金鑰掃描誤報（假金鑰、文件範例） | commit 訊息加 `[skip-secret]`（`sk-demo-` 已內建白名單） |

---

## 四、待辦：GitHub 網頁上要手動確認的項目

- [ ] **main required status checks**：main 已 protected，對非管理者已禁止 force push／刪除（2026-07-15 API 復驗 `allow_force_pushes`／`allow_deletions` 皆 false；`enforce_admins=false`，管理者仍可繞過）。剩：把實際 CI check 設為必過——**前提是先把發版改成 dev → main 的 PR 流程**（直推的 merge commit 沒有 CI 結果會被擋），屆時一併評估 `enforce_admins`。
- [ ] **Dependabot alerts**：repo Settings → Security → 啟用。依賴有新 CVE 會主動通知，比 push 才發現更早。
- [ ] **CodeQL default setup**：Settings → Security → Code scanning。公開 repo 免費，每次 push 自動跑 JS 靜態掃描。

開完可把這節勾掉或刪除。
