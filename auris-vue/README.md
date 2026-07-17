# Auris Web App

Vue 3 + Vite 的 Auris PWA 前端。專案總覽與文件入口請先看根目錄 [`README.md`](../README.md)。

## 指令

```bash
npm ci                         # 依 package-lock.json 安裝
npm run dev                    # 本機開發
npm test                       # Vitest（run mode）
npm audit --audit-level=high   # high 以上依賴弱點會失敗
npm run build                  # production build 至 dist/
```

本機 base path 是 `/auris-app/`；Vercel 環境才使用 `/`。

## 主要目錄

- `src/views/`：路由頁面
- `src/components/`：可重用 UI 元件
- `src/services/`：IndexedDB、LLM、內容生成與本地運算
- `src/services/__tests__/`：服務層單元測試
- `src/store/`：全域狀態
- `public/`：GitHub Pages SPA fallback 與靜態資源

技術細節、資料表與路由清單見 [`ARCHITECTURE.md`](ARCHITECTURE.md)。

## 資料庫

- 正式資料庫：`auris`
- Demo 沙盒：`auris-demo`
- 備份不包含 API 連線設定

不要在測試、fixture、文件或 commit 中放入真實 API key／service account JSON。
