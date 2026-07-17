# iOS PWA 鍵盤缺塊事後報告（P116–P124）

> 日期：2026-07-17
> 最終狀態：P124 已在 `dev` 正式啟用；`main` 尚未發布
> 適用範圍：iPhone／iPadOS standalone PWA 的文字輸入鍵盤
> 現行程式：`auris-vue/src/services/keyboardRootScrollGuard.js`

## 1. 結論摘要

這次不是同一個 CSS bug 反覆出現，而是兩個方向相反、會互相掩蓋的 iOS WebKit 問題：

| 現象 | 觸發條件 | 實機證據 | 正式處理 |
|---|---|---|---|
| 頂部畫面缺塊／錯誤重繪 | 手機 shell 使用 `body { position: fixed }` | P119 Body 單變因與 Flow 正常；Page、Clip 無效 | `body` 維持 `position: static` |
| 鍵盤上方底部白帶 | static／absolute body 仍跟隨 iOS focus 造成的 root document scroll | P122 三頁均出現 root scroll `0→404`、body rect `0…852→-404…389` | 鍵盤期間由 Root Scroll Guard 把 window/document/body scroll 歸零 |

因此正式修法不是 fixed／static 二選一，而是以下兩項必須成套存在：

1. `body static`：避開 fixed body 的 compositor 頂部缺塊。
2. iOS standalone Root Scroll Guard：阻止文字輸入 focus 把 static body 所在的 root document 偷捲走。

P123 最終實機影片同時通過聊天室、貼文留言與 API 自訂模型輸入框；P124 才將 Guard 從診斷 A/B 正式化。

## 2. 影響範圍與重現條件

- 會重現：iPhone standalone PWA，文字輸入框叫出系統鍵盤。
- 已確認頁面：聊天室、貼文留言、API 設定的自訂模型輸入框。
- Safari 一般分頁不重現。
- API 設定頁不使用 `keyboardViewport.js`、`.keyboard-page` 或聊天串流，卻仍會重現；因此 P115 controller 與聊天 DOM mutation 都不是必要條件。
- P118 純鍵盤頁在同一支 iPhone、同一 standalone PWA、相同 viewport meta 下完全正常；standalone／viewport meta 本身不足以觸發，問題必須包含 Auris 共用 shell 或其 document 行為。

## 3. 診斷時間線

| 版本 | Commit | 做了什麼 | 結果／決策 |
|---|---|---|---|
| P116 | `09328c3` | 加入 `kbdiag` 面板與 caret、blur、stream、paint、layer 開關 | 五項單獨關閉都仍會缺塊，排除為單一根因 |
| P117 | `72b5019` | 修正 iOS PWA 被誤標為 browser | 讓影片能可靠辨識 standalone |
| P118 | `e8d0957` | 加入完全脫離 Vue／Auris shell 的純鍵盤頁 | 純頁正常、Auris 異常，嫌疑縮到共用 shell |
| P119 | `f57fd6a` | Body、Page、Clip、Flow 四組 shell A/B | Body、Flow 正常；Page、Clip 異常。`body fixed` 是當時唯一單變因觸發條件 |
| P120 | `f244834` | 正式把手機 body fixed 改為 static | fixed 造成的頂部問題消失，但 static 放行的底部白帶再次顯現 |
| P121 | `50da8a8` | 面板加入版本、computed body position、body rect／scroll | 證明實機確實載入新版 static CSS，不再用 query 字樣代替 computed 證據 |
| P122 | `065118e` | 加入 Absolute body 候選與 window/html scroll 讀值 | Absolute 仍失敗；三頁 focus 時 root scroll 到 404，定位底部白帶機制 |
| P123 | `3410ddd` | Static＋Root Scroll Guard A/B | 三頁實機通過，root 偷捲成功歸零，頂部／底部／收鍵盤皆正常 |
| P124 | `8cfbdbe` | 將 Guard 拆成 production service、自動限縮到 iOS standalone；移除 Root A/B | 正式候選完成並推到 `dev`，CI 全通過 |

## 4. 關鍵實機矩陣

### P118：純頁對照

| 頁面 | 結果 |
|---|---|
| Auris 共用 shell | 缺塊 |
| 無 Vue、`.phone/.screen/.page`、fixed/absolute、blur、transform、動畫的純頁 | 正常 |

這排除了「standalone PWA 或 viewport meta 本身就會壞」的假設。

### P119：shell 單變因

| 模式 | 唯一／主要差異 | 結果 |
|---|---|---|
| Body | 只移除 body fixed | 正常 |
| Page | 只移除 page absolute | 異常 |
| Clip | 只解除 phone/screen overflow clipping | 異常 |
| Flow | 整組普通 flow，包含 body static | 正常 |

Body 是唯一只改一個條件就恢復的模式，因此 P120 將 body static 正式化。後續 P121/P122 並沒有推翻「fixed 會造成頂部缺塊」，而是揭露 static 還有另一個 root-scroll 失敗模式。

### P122：底部白帶的幾何證據

鍵盤開啟時的代表數值：

```text
visual viewport height 448
window/html scroll      404
body rect               -404…389
visual viewport bottom  448
body bottom             389
差值                    59px
```

可視區底部 448 與 body 底部 389 相差 59px，正好對應影片中鍵盤上方露出的白帶。Absolute 仍屬 document 座標，與 Static 一樣會被 focus scroll 搬走，所以不能取代 Guard。

### P123：最終放行證據

最終影片長 43.612 秒、1180×2556、約 60fps；先逐秒看完整時間軸，再用 0.2 秒間隔檢查鍵盤升降：

| 頁面 | Guard 證據 | 穩定結果 |
|---|---|---|
| 聊天室 | `404.0→0.0` | `scroll w 0.0 · html 0.0`、body rect `0…852` |
| 貼文留言 | `404.0→0.0` | 同上 |
| API 自訂模型（兩輪） | `11.0→0.0`、`2.0→0.0` | 同上 |

鍵盤收起後 visual viewport 回到 852，scroll 仍為 0；影片未見頂部缺塊、底部白帶或殘留跳位。

## 5. 正式修法設計

### 5.1 啟用範圍

`installIosStandaloneRootScrollGuard()` 只有同時符合以下條件才掛監聽：

- iOS／iPadOS 裝置：iPhone/iPad/iPod user agent，或 iPadOS desktop UA 的 `MacIntel + maxTouchPoints > 1`。
- standalone display：`navigator.standalone === true` 或 `(display-mode: standalone)`。
- 存在 `visualViewport`。

這保證 Safari 一般分頁、桌面 standalone 與不支援 visualViewport 的環境保持零介入。

### 5.2 執行邊界

即使正式 Guard 已安裝，仍須同時符合以下條件才會修正 scroll：

- focus 在文字型 `input`（text/search/url/tel/email/password/number）、`textarea` 或 contenteditable。
- visual viewport 比 resting baseline 縮小超過 80px，確認鍵盤確實開啟。
- window、documentElement 或 body 的 root scroll 絕對值大於 0.5px。

checkbox、radio、date 等非文字 input、鍵盤關閉、一般頁面捲動與失焦都不修正。

### 5.3 時序

Guard 監聽 visualViewport resize/scroll、window scroll、focusin/focusout 與 orientationchange。每次鍵盤過渡採：

1. 立即檢查與修正。
2. 下一個 animation frame 再檢查。
3. 60ms、240ms、500ms 三次有限複核。

這是為了涵蓋 iOS 鍵盤動畫期間事件與幾何分批更新；禁止改成永久 polling。destroy 必須解除所有 listeners、rAF 與 timers。

## 6. 已排除或否決的方案

| 方案 | 為何否決 |
|---|---|
| 隱藏 caret | 實機仍缺塊 |
| 關閉 backdrop-filter | 實機仍缺塊 |
| 停止串流 DOM mutation | 實機仍缺塊；API 頁也不使用聊天串流 |
| `.keyboard-scroll { contain: paint }` | 實機仍缺塊 |
| `.keyboard-scroll` 強制 layer／translateZ | 實機仍缺塊 |
| 只移除 `.page` absolute | P119 Page 仍異常 |
| 只解除 phone/screen clipping | P119 Clip 仍異常 |
| body fixed | 會重新引入頂部 compositor 缺塊 |
| body absolute | P122 仍被 document focus scroll 搬走 |
| 只用 body static | 解決 fixed 頂部問題，但會放行底部 root-scroll 白帶 |
| 將 `.phone` 高度／transform 綁到 visualViewport | P83 實機曾造成更嚴重版面問題，P85 已回退 |
| phone container 加 keyboard padding | 會製造底部空白，維護規則明確禁止 |

## 7. 回歸防線

P124 測試涵蓋：

- `main.js` 確實安裝 production Guard。
- iPhone 與 iPadOS desktop UA 辨識。
- 桌面 standalone、iOS Safari 分頁不掛監聽。
- 文字 focus＋鍵盤 viewport 開啟時 `404→0`。
- 鍵盤關閉時不攔一般捲動。
- focusout 後停止修正。
- checkbox/date 等非文字 input 不介入。
- cleanup 移除 window、visualViewport 與 document listeners。
- 診斷連結清除退役的 `kbroot`，面板沒有 Root自由／Root鎖定。
- body static 與 fixed/absolute 只存在於顯式 shell 診斷 selector。

P124 本機驗證：21 個測試檔、207 項測試、production build、project config checks 全通過；GitHub Actions run `29587294313` 的 config、dependency audit、tests、build 全部成功。

## 8. 不可破壞的維護規則

1. `body static` 與 production Root Scroll Guard 必須成套保留。
2. 不得把 Guard 改回 `kbdiag`／query 才啟用，也不得提供一般使用者關閉它的開關。
3. 不得把 `.phone` 高度、transform 或 padding 綁到 keyboard offset／visualViewport。
4. `.keyboard-page` 保持外層不捲動、只有 `.keyboard-scroll` 捲動；輸入列維持普通 flex 子元素，不用 fixed/sticky。
5. Guard 只攔 root document scroll，不接管頁面內容區的合法捲動。
6. 修改 eligibility、80px threshold、settle delays 或 focus type allowlist 時，必須補測試並重新做 iPhone standalone 實機鍵盤開合。

## 9. 未來若再出現缺塊，先看什麼

開啟 `kbdiag=1`，先確認：

```text
kbdiag Pxxx · standalone
body pos static
shell original
root official
scroll w 0.0 · html 0.0
body rect 0.0…基準高度
```

鍵盤開啟時若 WebKit 嘗試偷捲，應看到 `fix` 增加以及 `guard 非零→0.0`。

- `root off`：先查 iOS／standalone eligibility 或 `visualViewport`，不要先改 CSS。
- `root official` 但 scroll 維持非零：查事件是否漏接或 `scrollTo(0,0)` 是否被新版 WebKit 拒絕。
- scroll 為 0、body rect 正常但仍缺塊：這才是新的 compositor／paint 問題，需重新做單變因 A/B。
- body position 不是 static：優先查 PWA cache、舊 hashed asset 或部署版本。
- 每次影片必須同時拍到 App version、display mode、computed body、scroll、body rect、root status 與 before→after；query 按鈕選中狀態不能代替 computed evidence。

## 10. 相關文件與程式

- 現行架構：[`../auris-vue/ARCHITECTURE.md`](../auris-vue/ARCHITECTURE.md)
- 逐版時間線：[`../Auris 完整開發進度總覽.md`](../Auris%20完整開發進度總覽.md)
- 維護規則：[`../AGENTS.md`](../AGENTS.md)、[`../CLAUDE.md`](../CLAUDE.md)
- 正式 Guard：[`../auris-vue/src/services/keyboardRootScrollGuard.js`](../auris-vue/src/services/keyboardRootScrollGuard.js)
- 診斷面板：[`../auris-vue/src/services/keyboardDiagnostics.js`](../auris-vue/src/services/keyboardDiagnostics.js)
- Guard 測試：[`../auris-vue/src/services/__tests__/keyboardRootScrollGuard.test.js`](../auris-vue/src/services/__tests__/keyboardRootScrollGuard.test.js)
