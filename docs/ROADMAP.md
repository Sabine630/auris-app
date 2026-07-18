# Auris Roadmap

> 最後整理：2026-07-18（P127）
> 本檔只放尚未完成、待驗證或暫緩項目；已上線內容見 `product_feature_list.md`，逐版成果見 `Auris 完整開發進度總覽.md`。

## 目前優先：安全與維運基線

1. ~~main required status checks 與 PR 發布流程~~（2026-07-18 完成：發布改為 dev→main PR；main 設「必須經 PR」＋required check `test-build`＋`enforce_admins=true`，直推與 fast-forward 均被封；dev 禁止 force push／刪除；guard-main-push hook 擴充攔截 PR merge 指令——含變數 PR 編號與 gh 全域參數繞過形式，並補 hook 測試）。

2. ~~Actions 依賴 SHA 固定、Dependabot、CodeQL~~（2026-07-18 完成：ci.yml／deploy.yml 全數釘 commit SHA；`.github/dependabot.yml` npm＋github-actions 每週更新開 PR 到 dev；Dependabot alerts 與 CodeQL default setup 由 API 啟用並驗證）。

後續工程防禦縱深（未排程）：lint／typecheck／coverage gate、正式 E2E 測試套件。

具體證據與驗收條件見 `Auris 專案健檢與資安審查報告 2026-07-15.md`。

## 已採用、尚未排入版本

| 項目 | 摘要 | 原決議 |
|---|---|---|
| 關係里程碑慶祝 | 100／200／300／520／1000 天的提示與對話感知 | A1 |
| 角色偶爾傳圖 | 使用者維護角色相簿，由模型依情境偶爾選圖 | A2 |
| SillyTavern 角色卡匯入 | 支援 ST JSON／PNG 角色卡與世界書對映 | B2 |
| 角色限時動態 | 24 小時狀態、首頁 story 入口與輕回應 | C1 |
| 陪伴專注模式 | 25／50 分鐘或自訂倒數，開始與結束各一句 | E1 |
| 睡前模式 | 低刺激介面與睡前對話，隔天能自然呼應 | E2 |

## 待使用者訊號／再議

- 高品質 TTS 與 per-role voice：先確認使用者是否願意 BYOK 並承擔朗讀費用。
- 關係階段系統：功能方案已備，但需確認是否符合目前產品方向。
- 同世界角色互相呼應：與多世界／角色關係圖一起評估。

## 暫緩

- 多世界完整隔離：底層欄位已預留，等實際需求浮現再動。
- 完整 Service Worker 離線與 App Store／Google Play 封裝。
- PWA 系統推播：需要後端，與目前純前端定位衝突。
- 劇本／小說、寵物屋、任務系統：目前沒有足夠清晰的使用情境。

## 大型重構候選（獨立批次、不得與功能混做）

- 拆分 `ChatRoomView.vue`：搜尋、匯入匯出、分享／收藏、記憶抽屜改為 composables／components。
- 拆分 `chatEngine.js`：prompt、一般對話、主動訊息、群聊、記憶摘要分離。
- 抽出共用 BottomSheet／ActionSheet，減少多個 View 的重複模板。
- 將元件專屬樣式移回 scoped CSS，縮小 `main.css` 的全域責任。

重構批必須先補對應測試，並以「不改行為」為驗收原則。
