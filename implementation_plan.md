# Auris 完整 Vue 架構重構計畫

非常抱歉！先前的修復確實只觸及了皮毛（只補了 CSS 和首頁的一部份），沒有發現 Vue 專案裡面其實**漏掉了你原本寫的超過 70% 的功能與頁面**。

我現在完全了解你的需求：「**要在 Vue 的架構下，分毫不差地呈現原本 `auris-p36-bugfix.html` 的所有東西。**」

經過我盤點你原本 5490 行的心血，目前的 Vue 專案缺少了極多關鍵頁面與邏輯（例如密碼鎖、新手教學、API 設定、角色新增編輯 5 Tab、黑盒子、群組聊天、各種貼文/日記/夢境的詳情頁，以及自訂的 Modal/Toast 系統）。

這是為你量身打造的**「分毫不差還原計畫」**，我會按部就班地把所有功能搬進 Vue 專案中。

---

## 🏗️ 系統層與狀態管理 (Store / Router)

### 1. 路由補齊 (`src/router/index.js`)
目前的 router 只有 5 個頁面，我會補齊所有原本的 `#pg-*`：
- `/lock` (密碼鎖)
- `/onboarding` (新手教學 & API 金鑰設定)
- `/home` (主頁)
- `/chat-list` (聊天列表)
- `/chat/:id` (一對一聊天室)
- `/group-list` (群組列表)
- `/group-create` (建立群組)
- `/group-room/:id` (群組聊天室)
- `/moments` (貼文列表)
- `/post/:id` (貼文詳情)
- `/diary` (日記列表)
- `/diary/:id` (日記詳情)
- `/dream` (夢境)
- `/dream/:id` (夢境詳情)
- `/blackbox` (黑盒子)
- `/notifications` (通知)
- `/char-manage` (角色管理)
- `/char-edit/:id?` (角色編輯 5 Tab)
- `/me` (我的設定)
- `/settings` (系統設定)

### 2. 全域狀態與資料庫 (`src/store/index.js` & `src/services/db.js`)
- 將 `original.js` 裡面的 IndexedDB (`AurisDB_v2`) 邏輯完整保留。
- 把 `saveChar()`, `deleteChar()`, `saveMe()`, `saveSettings()` 等核心邏輯移植到 `store` 或對應的 `services`。

---

## 🧩 全域元件 (Global Components)

將原本直接寫在 `#phone` 裡面的共用元件獨立出來，掛載在 `App.vue` 之下：
- **[NEW] `src/components/Modal.vue`**: 取代原生的 prompt/confirm，實作原本的 `#modal-overlay`。
- **[NEW] `src/components/Toast.vue`**: 實作原本的 `toast_()` 彈窗系統。

---

## 📱 頁面移植 (Views Migration)

我會依序建立以下 `.vue` 檔案，將 HTML 結構與 `original.js` 對應的邏輯 1:1 複製進去。

### 第一階段：基礎系統與設定
- **[NEW] `LockView.vue`**: 密碼鎖畫面 (`#lock`)。
- **[NEW] `OnboardingView.vue`**: 新手 3 步驟、API Provider 選擇、金鑰輸入 (`#onboarding`)。
- **[MODIFY] `SettingsView.vue`**: 移植 API 金鑰切換、背景主題切換、資料匯出/匯入 (`#pg-settings`)。
- **[NEW] `MeView.vue`**: 使用者自身設定與暱稱 (`#pg-me`)。

### 第二階段：角色與聊天系統
- **[NEW] `CharManageView.vue`**: 角色列表與管理 (`#pg-char-manage`)。
- **[NEW] `CharEditView.vue`**: 角色編輯 5 個 Tab（基本、個性、說話、關係、回覆），包含 Emoji 與照片上傳 (`#pg-char-edit`)。
- **[NEW] `ChatListView.vue`**: 聊天列表、搜尋與排序 (`#pg-chat-list`)。
- **[MODIFY] `ChatRoomView.vue`**: 確保打字動畫、Heart Voice 顯示、長按重生等邏輯完整對齊原本寫法 (`#pg-chat-room`)。

### 第三階段：群組功能 (P34~P36 重點修復)
- **[NEW] `GroupListView.vue`**: 群組列表 (`#pg-group-list`)。
- **[NEW] `GroupCreateView.vue`**: 建立群組、勾選角色 (`#pg-group-create`)。
- **[NEW] `GroupRoomView.vue`**: 群組聊天室、防角色自言自語的清洗邏輯 (`#pg-group-room`)。

### 第四階段：生活動態系統
- **[MODIFY] `MomentsView.vue`**: 貼文列表 (`#pg-moments`)。
- **[NEW] `PostDetailView.vue`**: 貼文詳情，留言置底（P34 修復的 Flex 佈局）(`#pg-post-detail`)。
- **[MODIFY] `DiaryView.vue`**: 日記列表 (`#pg-diary`)。
- **[NEW] `DiaryDetailView.vue`**: 日記詳情 (`#pg-diary-detail`)。
- **[NEW] `DreamView.vue` & `DreamDetailView.vue`**: 夢境功能 (`#pg-dream`)。
- **[NEW] `BlackboxView.vue`**: 黑盒子篩選與顯示 (`#pg-blackbox`)。
- **[NEW] `NotificationsView.vue`**: 通知清單 (`#pg-notifications`)。

---

## 🛠️ 開發與驗證步驟
1. 我會先從 **Router** 與 **Onboarding (API 設定)** 開始建立，讓你馬上能設定 API。
2. 接著實作 **角色編輯與聊天** 的核心流程。
3. 然後把剩下的生活動態（貼文、日記、群組）補齊。
4. 在過程中我會不斷確保原本的 CSS 都能 100% 完美對應到這些 Vue 元件上。

> [!IMPORTANT]
> 請問你同意我按照這個計畫，一口氣把這些遺失的 20 幾個頁面與功能全部實作補齊，做到「分毫不差」嗎？同意的話我們就立刻開始大工程！
