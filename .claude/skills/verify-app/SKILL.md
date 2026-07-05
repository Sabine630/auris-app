---
name: verify-app
description: 驗證 Auris 改動——跑 vitest、起 dev server 實測；聊天室排版問題必須先比對匯出 JSON 與截圖再下診斷。
---

# Auris 驗證（/verify-app）

改完code不能只靠「看起來對」——依改動類型至少做到對應驗證。

## 單元測試（一律先跑）

```bash
cd auris-vue && npm test    # vitest run
```

## 本地實測

```bash
cd auris-vue && npm run dev   # Vite，預設 http://localhost:5173/auris-app/
```

- 本地 base path 是 `/auris-app/`（vite.config.js；Vercel 上才是 `/`），開錯路徑會 404
- 互動教學沙盒：網址加 `?demo=1`（獨立 `auris-demo` DB、假回覆，不動真資料）
- 可用 Playwright 截圖驗證版面（教學手冊目錄有現成 `shot_all.cjs` 可參考）

## 聊天室排版／訊息顯示類改動的鐵律（P103 教訓）

**先定層、再動手**。P56/P101 曾把 CSS 收縮 bug 誤診為「模型硬換行」，錯修了 format.js：

1. 取得「聊天匯出 JSON」與「畫面截圖」對照，確認是**資料層**（DB 裡就長那樣）還是**呈現層**（CSS/format.js 把它弄壞）的問題，才可以動手
2. 模型輸出的單一 `\n` 是**刻意分行**，不可合併（P103 起 format.js 保留所有單一換行）
3. 泡泡寬度問題優先懷疑「百分比 max-width × shrink-to-fit 父容器」的循環收縮

## iOS PWA 鍵盤類改動

照 CLAUDE.md「iOS PWA 鍵盤處理原則」段落；重點：不要在 phone container 加 `paddingBottom: keyboardOffset`。
