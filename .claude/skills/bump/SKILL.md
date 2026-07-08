---
name: bump
description: Auris 版更 checklist——version.js 版號 +1、進度總覽新節、架構文件、產品功能清單、防呆三原則自檢。每次功能修改 commit 前執行。
---

# Auris 版更（/bump）

把本次改動依 CLAUDE.md 的版更 checklist 落到四份文件。**第 1、2 步每次必做**，第 3、4 步視異動性質。全部做完才 commit（commit hook 會再自動把關一次）。

## 步驟 0：取得版號

```bash
grep -n "APP_VERSION" auris-vue/src/version.js
```

得到目前版號 P{N}，本次為 P{N+1}。格式是 `P{N}`，**沒有 "v"**。

## 步驟 1：版號常數（必做）

`auris-vue/src/version.js`（P105 起版號集中此檔，SettingsView 只是引用顯示，不必再改）：
- `APP_VERSION = 'P{N}'` → `'P{N+1}'`
- `VERSION_NOTE` 改為本次改動的簡短描述（會顯示在設定頁版號下方）

## 步驟 2：進度總覽（必做）

`Auris 完整開發進度總覽.md` 為「舊 → 新遞增」排列。**注意：P 節之後還有 4 個固定尾節（當前技術棧、檔案結構、已知問題、歷史備註），新節不是加在檔案最尾端**。

1. 先把現有最新 P 節標題裡的「，當前版本」字樣移除（防呆原則 1：全檔只能有一個「當前版本」節）
2. 在編號最大的 `### P{N}` 節之後、`## 🎨 當前技術棧` 之前插入：
   ```
   ### P{N+1} 標題（YYYY-MM-DD，當前版本）
   ```
   內容照前節格式：背景、修法說明、受影響檔案表格
3. 檔頭「最後更新」日期與「當前版本」欄位同步
4. 若跨到新 Phase 範圍，更新 Phase 標題的版本區間

## 步驟 3：架構文件（有技術／架構／邏輯異動才做）

`auris-vue/ARCHITECTURE.md` 為「新 → 舊降序」（**與進度總覽方向相反**）：
- 新版插在 `## 12. 版本更新紀錄` **最前面**
- 檔頭「最後更新」日期與版號同步
- 新增 service / store / component / route / 欄位時，一併更新對應章節與表格（IndexedDB 表、Router 表、Views 說明、目錄）

## 步驟 4：產品功能清單（有使用者看得到的新能力才做）

`product_feature_list.md`：純 bug 修、重構、文件調整免更新。有新功能時寫進對應章節、從「產品藍圖」搬出並標已完成、同步檔頭「對應版本」。

## 步驟 5：自檢（必做）

```bash
# 應為 2（檔頭欄位＋最新節）
grep -c "當前版本" "Auris 完整開發進度總覽.md"
# 兩處版號應一致
grep "APP_VERSION" auris-vue/src/version.js
grep "當前版本" "Auris 完整開發進度總覽.md" | head -1
```

若動了路由 / store / View / 欄位：grep 文件裡的舊計數（如「21 條」）確認沒殘留。

完成後即可 commit（`Fix P{N+1}: 摘要` 或 `feat: P{N+1} 摘要`），推 `dev`。
