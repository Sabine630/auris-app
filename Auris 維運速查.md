# 🛠️ Auris 維運速查（給 Sabine 的備忘）

> 開發系統（hooks／skills／CI 資安防線）的「怎麼觸發」與「怎麼查核」，以及這類 app 維護處方（使用者回報怎麼確認是我們改的、怎麼修）。
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

- **更新 main（發正式版）**：發布走 dev→main PR（2026-07-18 起）。合併 PR 或直推 main 的指令，畫面**必定**跳出「⚠️ 對外正式版」確認框（hook 同時攔 `git push`、GitHub merge API 與 `gh pr merge`）。沒看到確認框＝main 沒被動過（這是 harness 行為，不是 Claude 的承諾）。另有 GitHub 遠端防線：main 的 required status check（`test-build`）沒過就無法合併，`enforce_admins` 開啟後對管理者、對任何工具（含手動網頁操作）一體適用。
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

- [x] **main required status checks**：✅ 2026-07-18 完成——發版已改為 dev→main PR 流程（見 `/release` skill）；main 設「必須經 PR」（required_pull_request_reviews，0 位 reviewer，作用是封掉直推）＋required status check `test-build`＋`enforce_admins` 開啟（管理者不可繞過，含 fast-forward 直推）；dev 亦已禁止 force push／刪除。查核方式：GitHub → Settings → Branches 看 main／dev 規則，或要求 Claude 用 API 印出 `branches/main/protection` 現值。
    - 逃生口：若防線設定本身出問題（例如 CI 壞掉導致無法合併），可暫時到 Settings → Branches 關掉 `enforce_admins` 或 required checks，修好後**必須**開回來。
- [x] **Dependabot alerts**：✅ 2026-07-18 由 API 啟用（`GET /repos/…/vulnerability-alerts` 回 204＝開啟）。另有 `.github/dependabot.yml`：npm（auris-vue）與 github-actions 每週檢查更新，PR 一律開到 dev、走 CI 驗證（ci.yml 的 `pull_request` 監聽含 dev）。「security updates」（CVE 自動修復 PR）**刻意不開**——它只會對 default branch（main）開 PR、與 dev→main 發布流程相衝；CVE 靠 alerts＋CI 的 `npm audit` 把關、手動走 dev 修。查核：Settings → Security，或 repo 的 Dependabot alerts 頁。
- [x] **CodeQL default setup**：✅ 2026-07-18 由 API 啟用（`state: configured`）。掃 default branch（main）與開往 main 的 PR——發布走 PR 流程後，每次發正式版前都會被掃到。查核：Security → Code scanning alerts。
- [x] **Actions 釘 commit SHA**：✅ 2026-07-18——ci.yml／deploy.yml 的第三方 action 全數改釘 commit SHA（防 tag 被改指的供應鏈攻擊），註解保留版號，Dependabot 自動滾動更新。

三項皆完成；此節保留作為「已開防線與查核方式」備忘。尚未做：lint／coverage gate、正式 E2E 測試套件（見 ROADMAP）。

---

## 五、使用者回報的常見處理

### 角色回覆把人名／地名改成別的寫法（例：格林格拉斯→格林葛拉斯）

- **症狀**：使用者在對話裡打的專有名詞（人名、地名）是對的，但角色回覆存進聊天後，某幾個字被換成別的寫法，看起來像模型自己打錯字。
- **成因**：`normalizeCharacterOutput`（`auris-vue/src/services/outputLanguage.js`）落庫前會跑 OpenCC 的 `twp`（台灣詞彙）轉換，把供應商偶爾吐出的簡體／中國用語轉成台灣繁體與慣用詞。但 `twp` 的 `TWPhrases` 詞表裡混了一批「短音譯碎片」條目（例：格拉斯→葛拉斯、布爾→布林），只要碎片剛好是某個更長專有名詞的一部分，就會在該名字內部誤觸發，把本來就正確的繁體名字改壞。
- **怎麼確認是我們改的、不是模型打錯**：串流當下畫面顯示的是正確寫法，**落庫後才變**——正規化是在 `persistReplySegments` 呼叫 `normalizeCharacterOutput` 那一步才跑，時間點在生成完成之後。可用診斷匯出或重現對話比對「串流當下」與「重新整理後」的文字是否一致來確認。
- **怎麼修**：打開 `auris-vue/src/services/zhPhraseBlocklist.js`，把被改壞的詞條「來源詞」（`TWPhrases` 裡「來源 目標」那一行的來源那半）加進 `DROP_SOURCES` 集合，例如使用者打「肯特」卻被改成別的寫法，就把 `'肯特'` 加進去。再到 `auris-vue/src/services/__tests__/outputLanguage.test.js` 的「twp 詞表碎片誤觸發的迴歸鎖」補一條該名字的斷言。**只需要加一個詞、補一條測試，不必動任何轉換邏輯**（`zhTwWorker.js`、`outputLanguage.js` 的呼叫端都已經接好 `filterPhraseDict`）。

### 角色把生日／紀念日講錯，而且糾正不回來（P135 起）

- **症狀**：使用者問「你生日幾號」，角色講出一個跟設定不符的日期，之後怎麼糾正都堅持己見——連把紀念日卡片貼給他看都沒用。
- **成因（P135 之前）**：四個日期欄位（角色生日、使用者生日、相識紀念日、在一起紀念日）**只有在當天**才會進 prompt。其餘 364 天模型根本不知道日期是哪天，被問到就自己編一個；那個錯誤答案接著寫進對話歷史，反而變成它「記得」的事實，於是越糾正越堅持。
- **P135 已修**：`getKeyDatesCtx()`（`auris-vue/src/services/chatEngine.js`）把四個日期當成常駐既定事實注入角色卡，模型每則對話都看得到。
- **但修不回已經吵過的對話**：先前講錯的日期仍留在對話歷史裡，模型會同時看到「正確的設定」與「自己講過的錯答案」，可能繼續拉扯。
  **注意：Auris 沒有「刪除單則訊息」的功能**——長按選單只有表情反應／複製／存紀念品／分享卡片，另加「編輯重傳」（限最新一則使用者訊息）與「重新生成」（限最新一則角色訊息）。所以實際可行的只有下面三條：
  1. **等它滾出視窗（推薦）**：送進 prompt 的只有最近 `memory` 則（角色設定「記憶則數」，預設 20，見 `chatEngine.js:522` 的 `allMsgs.slice(-(c.memory || 20))`）。再聊約 20 則之後，講錯的那幾則就不再被送給模型，問題自然消失。記憶則數設得越大，撐得越久。
  2. **剛發生就重新生成**：如果錯的就是最新那則角色訊息，長按 → 重新生成即可（`doRegenerate` 會刪掉該則之後的訊息再重打）。往前的訊息無法這樣處理。
  3. **清除聊天記錄（核彈選項）**：聊天室選單有這個，但會清掉**整個對話**，不是只清錯的那幾則。除非對話本來就不重要，否則不建議。
- **若修完仍講錯，先確認這兩件事**：
  1. 角色編輯／我的設定裡**日期欄位真的有填**——沒填的欄位不會注入，模型仍然只能猜。
  2. 生日刻意**只注入月日、不含年份**（年齡以角色卡「年齡」欄位為準，避免兩者矛盾）。所以角色答不出出生年份是**預期行為**，不是 bug。相識日與在一起紀念日則含年份。
- **角色如果變得沒事就報生日**：文案裡已有「不要主動提起、也不要反覆確認」的約束（比照作息與天氣感的寫法）。若實機仍過度提及，調整的是 `getKeyDatesCtx()` 結尾那段約束文字，不是拿掉整段注入。
