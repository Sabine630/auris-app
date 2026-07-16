# Auris

Auris 是純前端、BYOK（Bring Your Own Key）的 AI 角色陪伴 PWA。角色、訊息與生活紀錄保存在使用者瀏覽器的 IndexedDB；AI 請求由瀏覽器直接送往使用者選擇的供應商或自訂 endpoint。

## 快速開始

需求：Node.js 22。

```bash
cd auris-vue
npm ci
npm test
npm run dev
```

本機網址：`http://localhost:5173/auris-app/`

互動示範沙盒：`http://localhost:5173/auris-app/?demo=1`。Demo 使用獨立的 `auris-demo` IndexedDB 與本地假回覆，不讀寫正式資料。

## 驗證與建置

```bash
cd auris-vue
npm test
npm audit --audit-level=high
npm run build
```

## 分支與部署

- `dev`：日常開發與測試版，推送後由 Vercel 部署，GitHub Actions 執行 audit、test、build。
- `main`：GitHub Pages 正式版；只有使用者明確確認發布後才能推送。
- 正式版：https://sabine630.github.io/auris-app/

## 文件入口

- [文件索引](docs/README.md)
- [產品功能清單](product_feature_list.md)
- [目前 Roadmap](docs/ROADMAP.md)
- [架構規格](auris-vue/ARCHITECTURE.md)
- [完整版本歷程](Auris%20完整開發進度總覽.md)
- [維運速查](Auris%20維運速查.md)
- [最新資安審查](docs/Auris%20專案健檢與資安審查報告%202026-07-15.md)

## 資料與憑證原則

- 備份不包含 API key、provider、model 或自訂 API base。
- 同一 origin 還原時會保留該瀏覽器既有的 API 設定；換裝置、換 origin 或清除網站資料後仍須重新設定。
- 不要把真實 API key、service account JSON、部署密碼或個人路徑寫進 Git。
- `archive/` 僅保存歷史原型，不是可部署版本，也不能視為安全設計參考。

## AI 協作規則

- Claude：`CLAUDE.md`、`.claude/skills/`
- Codex：`AGENTS.md`、`.agents/skills/`
- 共用 hooks：`scripts/hooks/`

功能修改 commit 前依 `/bump` 收尾；驗證改動用 `/verify-app`；正式發布走 `/release`。
