# Auris — 架構規格說明

> 維護這份文件的原則：每次新增頁面、服務、或重要設計決策時一起更新。  
> 最後更新：2026-05-20

---

## 目錄

1. [整體架構](#1-整體架構)
2. [資料流向](#2-資料流向)
3. [IndexedDB 資料庫](#3-indexeddb-資料庫)
4. [Services 服務層](#4-services-服務層)
5. [Store 全局狀態](#5-store-全局狀態)
6. [Router 路由](#6-router-路由)
7. [Views 頁面](#7-views-頁面)
8. [Components 元件](#8-components-元件)
9. [CSS 樣式系統](#9-css-樣式系統)
10. [維護注意事項](#10-維護注意事項)
11. [新增一個頁面的標準流程](#11-新增一個頁面的標準流程)

---

## 1. 整體架構

```
┌─────────────────────────────────────────────────────┐
│  App.vue（根元件）                                    │
│  ・時鐘、鍵盤偵測、Onboarding 導向、nav 顯示控制       │
└─────────────┬───────────────────────────────────────┘
              │
     ┌────────┴────────┐
     │  router-view    │         BottomNav.vue
     │  (21 個 View)   │         ・四個 tab
     └────────┬────────┘         ・active 狀態依 route.name
              │
     ┌────────┴────────┐
     │  globalStore    │  ←  reactive 全局狀態
     │  (store/index)  │      characters / theme / keyboardOffset
     └────────┬────────┘
              │
     ┌────────┴────────────────────────────────┐
     │           services/                      │
     │  db.js          api.js   contentEngine  │
     │  IndexedDB CRUD  fetch    AI 生成邏輯    │
     └────────┬────────────────────────────────┘
              │
     ┌────────┴────────┐
     │   IndexedDB     │  資料庫名稱：auris（版本 v4）
     │   10 個資料表   │
     └─────────────────┘
```

---

## 2. 資料流向

### 頁面讀取資料
```
View onMounted
  → globalStore.loadCharacters()     // 更新全局角色列表
  → dbAll('xxx') / dbIdx('xxx', ...)  // 讀取頁面自己需要的資料
  → 渲染
```

### 使用者操作寫入資料
```
使用者動作
  → View 方法
    → dbPut('xxx', data)       // 寫入 IndexedDB
    → globalStore.loadCharacters()  // 角色有變動時重新載入
    → 更新 local ref（立即反映 UI）
```

### AI 生成流程
```
使用者點「生成」
  → View 呼叫 contentEngine.generateXxx(charId)
    → getSetting('api_key/provider/model/base')
    → dbGet('characters', charId)
    → 組 prompt → fetchWithTimeout(API)
    → 解析回應 → dbPut 存入 DB
    → return { entry, truncated }
  → View 把 entry push 進本地列表（不需重新讀 DB）
```

---

## 3. IndexedDB 資料庫

**資料庫名稱**：`auris`　**版本**：v4

| 資料表 | keyPath | 索引 | 說明 |
|--------|---------|------|------|
| `characters` | `id` | `worldId` | 角色完整設定 |
| `messages` | `id` | `charId`, `createdAt` | 單人聊天訊息 |
| `memories` | `id` | `charId` | Heart Voice 心聲記錄 |
| `moments` | `id` | `charId`, `createdAt` | 貼文（含 likes/comments） |
| `diary` | `id` | `charId`, `date` | 日記（`date` 格式：YYYY-MM-DD） |
| `dreams` | `id` | `charId` | 夢境 |
| `worlds` | `id` | — | 多世界（待開發） |
| `groups` | `id` | — | 群組設定 |
| `group_messages` | `id` | `groupId`, `createdAt` | 群組訊息 |
| `notifications` | `id` | `charId`, `createdAt` | 通知記錄 |
| `settings` | `key` | — | 系統設定（key-value） |

### Settings 常用 key

| key | 說明 |
|-----|------|
| `api_key` | API 金鑰 |
| `api_provider` | `'openai'` / `'anthropic'` / `'google'` |
| `api_model` | 模型名稱字串 |
| `api_base` | 自訂 API 位址（空 = 用預設） |
| `theme` | 主題名稱（`cream` / `warm` / `dark` / `gray` / `ocean` / `matcha`） |
| `me_settings` | 使用者自身設定物件（名字、年齡、個性等） |
| `onboarding_done` | `true` = 已完成新手引導 |

### ⚠️ 升版注意

升版（`version` 數字 +1）只能「新增」資料表或索引，不能修改已有結構。  
修改已有 store 的結構必須刪掉重建，**會清空該 store 的資料**。

---

## 4. Services 服務層

### `services/db.js`
IndexedDB 的所有讀寫操作都走這裡，不要在 View 裡直接操作 `indexedDB`。

| 函式 | 用途 |
|------|------|
| `initDB()` | 開啟/升版資料庫，`main.js` 啟動時呼叫 |
| `dbPut(store, value)` | 新增或更新一筆（keyPath = `id`） |
| `dbGet(store, key)` | 讀取單筆 |
| `dbAll(store)` | 讀取全部 |
| `dbIdx(store, indexName, value)` | 用索引查詢多筆 |
| `dbDel(store, key)` | 刪除單筆 |
| `getSetting(key)` | 讀取 settings |
| `setSetting(key, value)` | 寫入 settings |

### `services/api.js`
API 請求的底層工具。

| 函式 | 用途 |
|------|------|
| `fetchWithTimeout(url, opts, ms)` | 帶 90 秒逾時的 fetch，abort 後拋 `'request_timeout'` |
| `sendLLMRequest(messages, config)` | 統一的 LLM 呼叫入口，自動處理 OpenAI/Anthropic 格式差異 |

**⚠️ Gemini 不支援 `frequency_penalty` / `presence_penalty`**，`sendLLMRequest` 已處理，只有 OpenAI 才加這兩個參數。`contentEngine.js` 裡手工呼叫 API 的部分也都有做此判斷。

### `services/contentEngine.js`
AI 內容生成邏輯，聊天以外的所有生成都在這裡。

| 函式 | 用途 | 存入資料表 |
|------|------|-----------|
| `generatePost(charId)` | 生成角色貼文 | `moments` |
| `generateCommentReply(postId, charId, userComment)` | 生成留言回覆 | 更新 `moments[].comments` |
| `generateDiary(charId)` | 生成今日日記 | `diary` |
| `generateDream(charId)` | 生成夢境 | `dreams` |

**回傳格式**：`{ entry, truncated }` — `truncated: true` 表示 AI 輸出被 `max_tokens` 截斷。

**⚠️ `getDefModel` 要與 `ApiView.vue` 的模型清單同步更新**，兩處都有定義預設模型。

---

## 5. Store 全局狀態

**檔案**：`store/index.js`  
使用 Vue 3 `reactive()` 實作，不依賴 Pinia。

```javascript
globalStore = {
  theme: 'cream',          // 當前主題，綁到 App.vue data-theme
  characters: [],          // 所有角色陣列，各頁面共用
  keyboardOffset: 0,       // 鍵盤高度（px），用於 BottomNav 隱藏判斷

  init()            // App.vue onMounted 呼叫，讀 theme + characters + 設定鍵盤監聽
  loadCharacters()  // 重新從 DB 載入 characters（各 View onMounted 呼叫）
  reloadCharacters() // loadCharacters 的別名，保留相容性
}
```

**⚠️ 各 View 的 `onMounted` 都要呼叫 `await globalStore.loadCharacters()`**，確保角色資料是最新的（例如在別的頁面新增角色後跳回來）。

---

## 6. Router 路由

**檔案**：`router/index.js`  
使用 `createWebHistory`（需要 GitHub Pages 的 404 → index.html 重導設定）。

| 路由 | name | View | BottomNav 顯示 |
|------|------|------|---------------|
| `/` | `home` | HomeView | ✅ |
| `/chat-list` | `chat-list` | ChatListView | ✅（對話 tab 亮） |
| `/chat/:id?` | `chat` | ChatRoomView | ❌ 隱藏 |
| `/moments` | `moments` | MomentsView | ✅ |
| `/post/:id` | `post-detail` | PostDetailView | ❌ 隱藏 |
| `/diary` | `diary` | DiaryView | ✅ |
| `/diary/:id` | `diary-detail` | DiaryDetailView | ❌ 隱藏 |
| `/dream` | `dream` | DreamView | ✅ |
| `/dream/:id` | `dream-detail` | DreamDetailView | ❌ 隱藏 |
| `/settings` | `settings` | SettingsView | ✅ |
| `/me` | `me` | MeView | ❌ 隱藏 |
| `/api` | `api` | ApiView | ❌ 隱藏 |
| `/char-manage` | `char-manage` | CharManageView | ❌ 隱藏 |
| `/char-edit/:id?` | `char-edit` | CharEditView | ❌ 隱藏 |
| `/group-list` | `group-list` | GroupListView | ✅（對話 tab 亮） |
| `/group-create` | `group-create` | GroupCreateView | ❌ 隱藏 |
| `/group-room/:id?` | `group-room` | GroupRoomView | ❌ 隱藏 |
| `/blackbox` | `blackbox` | BlackboxView | ✅ |
| `/notifications` | `notifications` | NotificationsView | ✅ |
| `/onboarding` | `onboarding` | OnboardingView | ❌ 隱藏 |
| `/lock` | `lock` | LockView | ❌ 隱藏（開發模式佔位，正式版移除） |

### BottomNav active 對應
| Tab | 亮起的 route.name |
|-----|-----------------|
| 首頁 | `home` |
| 對話 | `chat-list`, `chat`, `group-list`, `group-create`, `group-room` |
| 貼文 | `moments`, `post-detail` |
| 我的 | `settings` |

---

## 7. Views 頁面

### 頁面標準結構

每個 View 的 `<template>` 都遵循：

```html
<div class="page active" id="pg-xxx">
  <!-- 頁首 -->
  <div class="ph">
    <div class="ph-back" @click="$router.push('...')">返回</div>
    <div class="ph-title">標題</div>
    <div class="ph-act">右側動作</div>
  </div>

  <!-- 主要內容區 -->
  ...

  <!-- 需要 modal 時 -->
  <div class="modal-overlay" :class="{ open: showModal }" @click.self="showModal = false">
    <div class="modal-box">...</div>
  </div>
</div>
```

### 各 View 說明

| View | 說明 | 特殊注意 |
|------|------|---------|
| **HomeView** | 首頁，快速入口磚塊 | 角色橫列點擊 → 直接進聊天室 |
| **ChatListView** | 聊天列表，含搜尋/排序/滑動操作 | 空狀態按鈕用 `empty-cta` 類別 |
| **ChatRoomView** | 單人聊天室 | AI 回覆邏輯最複雜，含 Heart Voice 觸發 |
| **MomentsView** | 貼文列表 + AI 生成 | gen panel 要 `characters.length > 0` 才顯示 |
| **PostDetailView** | 貼文詳情 + 留言 | 留言區用 flex 直欄避免 sticky 空白 |
| **DiaryView** | 日記列表 + AI 生成 | gen panel 要 `characters.length > 0` 才顯示 |
| **DiaryDetailView** | 日記全文閱讀 | — |
| **DreamView** | 夢境列表 + AI 生成 | 無角色時隱藏空狀態（只留 gen area） |
| **DreamDetailView** | 夢境全文閱讀 | — |
| **BlackboxView** | Heart Voice 黑盒子列表 | 角色篩選 chip |
| **GroupListView** | 群組列表 | 空狀態按鈕用 `empty-cta` 類別 |
| **GroupCreateView** | 建立群組 | 至少選 2 個角色才能建立 |
| **GroupRoomView** | 群組聊天室 | ⚠️ 見下方說明 |
| **NotificationsView** | 通知中心 | 點擊可跳轉至對應內容 |
| **CharManageView** | 角色管理列表 | 從設定頁進入 |
| **CharEditView** | 新增/編輯角色（5 個 Tab） | modal CSS 必須存在才能正常彈窗 |
| **MeView** | 使用者自身設定 | — |
| **SettingsView** | 設定主頁（主題、資料匯出匯入） | — |
| **ApiView** | API 金鑰與模型設定 | 模型清單要與 contentEngine.js 的 getDefModel 同步 |
| **OnboardingView** | 新手引導（4 步驟） | 完成後寫 `onboarding_done = true` |
| **LockView** | 開發模式鎖定（佔位，正式版移除） | 目前沒有任何功能 |

### ⚠️ GroupRoomView 特別說明

群組回覆邏輯在 HTML 版（P34–P36）有多次修復，Vue 版目前**尚未移植**以下修補：

1. **點名偵測**（P34）：偵測使用者訊息中含角色名字時，強制該角色回應、優先排序
2. **保守清洗邏輯**（P36）：只在「換行 + 其他角色名：」時截斷輸出，並加保險絲（清空時 fallback 回原始輸出）

移植時參考 `auris-p36-bugfix.html` 的 `sendGroupMsg()` 函式。

---

## 8. Components 元件

目前只有一個共用元件：

### `BottomNav.vue`
- 使用 `useRoute()` 判斷當前路由，用 computed 決定各 tab 的 active 狀態
- `isChatActive`：涵蓋 chat-list / chat / group-list / group-create / group-room
- `isMomentsActive`：涵蓋 moments / post-detail
- `kb-hidden` class：鍵盤拉起時（`keyboardOffset > 80`）隱藏整個 nav

---

## 9. CSS 樣式系統

**主檔**：`assets/main.css`（所有樣式都在這一支）

### 主題系統

六個主題透過 `[data-theme="xxx"]` 切換 CSS Variables：

```css
[data-theme="cream"] { --bg: #faf8f5; --rose: #c9826a; ... }
[data-theme="dark"]  { --bg: #1a1a1a; --rose: #e8907a; ... }
/* cream / warm / dark / gray / ocean / matcha */
```

主題名稱存在 `settings.theme`，由 `globalStore.init()` 讀取後綁到 `App.vue` 的 `data-theme`。

### 常用 Class

| Class | 說明 |
|-------|------|
| `.page` | 頁面根容器，`position:absolute;inset:0;overflow-y:auto` |
| `.ph` | 頁首 header |
| `.ph-back` | 返回按鈕 |
| `.ph-title` | 頁面標題 |
| `.ph-act` | 右側動作按鈕 |
| `.sg` | 設定群組卡片 |
| `.sg-label` | 設定群組標題 |
| `.sr` | 設定列項目 |
| `.form-group` | 表單群組 |
| `.form-row` | 表單列 |
| `.form-input` | 輸入框 |
| `.opt-btn` | 選項按鈕（`.sel` 為選中態） |
| `.empty-cta` | 空狀態的行動按鈕（玫瑰色圓角） |
| `.btn-primary` | 深色全寬主要按鈕（用於聊天發送等） |
| `.bb-empty` | 空狀態容器（icon + 標題 + 副文案） |
| `.modal-overlay` | 模態框遮罩（`.open` 才顯示） |
| `.modal-box` | 模態框內容（從底部 slide up） |
| `.tab-save-bar` | 角色編輯頁底部儲存列（sticky） |
| `.model-opt` | API 設定頁的模型選項（radio 樣式） |
| `.nav` | 底部導覽列（`.kb-hidden` 時高度收到 0） |

### ⚠️ 空狀態按鈕規則

空狀態的行動按鈕（例如「新增角色」「建立群組」）一律用 **`empty-cta`**，不用 `btn-primary`。  
`btn-primary` 是深色（`var(--text)` 背景），`empty-cta` 是玫瑰色（`var(--rose)` 背景）。

---

## 10. 維護注意事項

### 新增角色相關資料時
刪除角色（`CharEditView.doDeleteChar`）需要一起清除所有關聯資料表：
```
messages / memories / diary / dreams / moments（charId 索引）
```
新增支援 charId 的新資料表時，記得加進這個刪除清單。

### 新增生成功能時
1. 在 `contentEngine.js` 新增 `generateXxx(charId)` 函式
2. 函式末尾呼叫 `dbPut` 存入 DB，並回傳 `{ entry, truncated }`
3. 在 View 裡接收回傳值，把 `entry` 直接 push 進本地陣列（不用重讀 DB）
4. Anthropic 和 OpenAI/Gemini 的 API 格式不同，參考現有函式的 if/else 結構

### 新增設定項目時
`getSetting` / `setSetting` 用 key-value，任意加新 key 即可，無需改 DB schema。

### `contentEngine.js` 的 `getDefModel` 與 `ApiView` 同步
兩個地方都定義了各服務商的預設模型，每次更新模型清單時兩處都要改。

---

## 11. 新增一個頁面的標準流程

以新增「XXX 頁」為例：

**1. 建立 View 檔案**
```
auris-vue/src/views/XxxView.vue
```

**2. 在 router/index.js 新增路由**
```javascript
import XxxView from '../views/XxxView.vue';
// routes 陣列加入：
{ path: '/xxx', name: 'xxx', component: XxxView }
```

**3. 決定 BottomNav 是否顯示**  
在 `App.vue` 的 `hiddenRoutes` 陣列加入 `'xxx'`（如果這頁要隱藏 nav）。

**4. 決定 BottomNav 哪個 tab 亮起**  
在 `BottomNav.vue` 的對應 computed（`isChatActive` 或 `isMomentsActive`）加入 `'xxx'`。

**5. 從其他頁面連結過去**
```javascript
$router.push('/xxx')
// 或帶參數：
$router.push('/xxx/' + id)
```
