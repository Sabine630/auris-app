# 🎨 Auris 完整開發進度總覽

**最後更新**: 2026-05-23
**當前版本**: P46（對話長按選單復刻與 UX 優化、貼文按鈕優化、Heart Voice 頻率優化）
**狀態**: 持續優化中

---

## 📌 專案資訊

- **專案名稱**: Auris（你說，他在聽）
- **類型**: AI 角色聊天 PWA 應用
- **技術棧**: Vue 3 + Vite + Vue Router + IndexedDB + CSS Variables（P37 起）
- **部署平台**: GitHub Pages（正式）/ Vercel（測試）

### 🔗 重要連結

| 項目 | 網址 | 說明 |
|------|------|------|
| 正式版網址 | https://sabine630.github.io/auris-app/ | Production，`main` 分支，對外公開 |
| 測試版網址 | https://auris-app-git-dev-sabine630-6243s-projects.vercel.app | Staging，`dev` 分支，自動部署 |
| GitHub Repo | https://github.com/sabine630/auris-app | 原始碼 |
| 登入密碼 | `auris2025` | 密碼鎖 |

---

---

## 🚀 下一步計劃 (產品藍圖)

### ✅ 階段 A：核心體驗與沈浸感補完 — 開發完成，待測試
1. ✅ **聊天室 Streaming 串流輸出** — P47（2026-05-24）
   - 文字逐字流出，▍閃爍游標，智慧自動捲動
   - 支援 Anthropic、OpenAI、Gemini 三大 provider
   - 一對一與群組聊天室均支援
2. ✅ **長期記憶與總結助手（記憶抽屜）** — P48（2026-05-24）
   - 聊天室標題列記憶入口，AI 一鍵總結近期對話
   - 每筆記憶獨立開關，token 消耗視覺化
3. ✅ **動態回覆模式實作** — P49（2026-05-25）
   - 背景計時器依 `care` 頻率觸發主動訊息
   - `auto-interrupt` 模式：使用者打字時自動中斷生成
4. ✅ **自動生成觸發引擎** — P50（2026-05-25）
   - 每日首次開啟 App 時背景靜默生成日記與貼文
   - 防重複機制（日記查當日是否已存在）

> ⚠️ **待辦**：階段 A 所有功能均在 `dev` 分支，尚未在測試版完整驗收。測試重點：記憶抽屜 toggle、主動訊息計時觸發、auto-interrupt 打斷、每日自動生成。確認無誤後再推 `main`。

### 🔵 階段 B：世界觀與玩法擴展（中期目標）← 下一階段
5. 🟢 **世界觀設定書 (World Book) 📖**
   - 與角色設定脫鉤的專屬詞條庫，提供客觀設定給 AI
6. 🟢 **定位系統 📍 & 任務系統 ✓**
   - 增加每日登入與互動的遊戲化機制
7. 🟢 **劇本 / 小說體驗 🎭**
   - AVG 選項分支與長篇協作創作模組

### 🟣 階段 C：系統底層重構與打磨 (長期目標 - Phase 5)
8. 🔵 **多世界系統 (平行世界切換) 🌍**
   - IndexedDB 架構翻新，全域加入 `worldId` 隔離資料
9. 🔵 **完整的 PWA 離線體驗與推播**
   - 實作 Service Worker 快取與系統級推播
   - 評估 App Store / Google Play 上架

---

---

## ⏳ 開發階段總覽 (Phase History)

> 💡 **提示**：為了保持文件整潔，部分超過百行的詳細除錯日誌（如 P14-P18 鍵盤排錯）已被折疊隱藏，您可以點擊展開查看原始除錯細節。

## ✅ Phase 1: 核心功能開發 (P1-P9)

### P1: 基礎架構
**完成日期**: 2025 年底

**核心功能**:
- ✅ 手機 UI 框架（390x844px 桌面預覽）
- ✅ 六大主題系統：
  - 🌸 奶白 (cream)
  - 📜 暖米 (warm)
  - 🌙 深夜 (dark)
  - 🩶 霧灰 (gray)
  - 🌊 海霧 (ocean)
  - 🌿 抹茶 (matcha)
- ✅ 密碼鎖系統
- ✅ 頁面導航系統 (SPA 架構)
- ✅ IndexedDB 資料庫

**技術細節**:
```javascript
資料表設計:
- characters    // 角色資料
- messages      // 聊天訊息
- memories      // Heart Voice 內心話
- moments       // 貼文
- diary         // 日記
- dreams        // 夢境
- groups        // 群組
- group_messages // 群組訊息
- settings      // 系統設定
```

---

### P2: 角色系統
**完成日期**: 2026-01

**核心功能**:
- ✅ 角色管理（新增/編輯/刪除）
- ✅ 5 個 Tab 分頁設定：
  1. **基本資訊** - 名字、年齡、職業、居住地
  2. **個性背景** - 個性描述、性格標籤、背景故事
  3. **說話方式** - 說話風格、口頭禪、話量傾向
  4. **關係與規範** - 關係類型、禁止話題、行為規範
  5. **回覆設定** - 回覆模式、AI 參數、自動功能
- ✅ 頭像系統（Emoji + 圖片上傳）
- ✅ 背景故事系統：
  - 5 個預設章節（童年、求學、感情、轉折、現在）
  - 無限自訂章節
- ✅ 全局「我的設定」

**參數設定**:
```javascript
AI 參數:
- 記憶條數: 5-100 條 (預設 20)
- 溫度: 0.0-2.0 (預設 0.8)
- 回覆延遲: 0-30 秒 (預設 1)
- 回覆條數: 1-8 條 (預設 1-3)

自動功能:
- 時間感 (預設開啟)
- Heart Voice (預設關閉)
- 自動日記 (預設關閉)
- 自動貼文 (預設關閉)
```

---

### P3-P4: 聊天系統
**完成日期**: 2026-02

**核心功能**:
- ✅ 單人聊天室
- ✅ 群組聊天（2+ 角色）
- ✅ 訊息顯示系統：
  - 連續訊息縮排（同角色 < 2 分鐘）
  - 頭像顯示邏輯
  - 時間戳記
- ✅ 打字動畫（三點跳動）
- ✅ 三種回覆模式：
  - 手動：用戶送出才回覆
  - 自動：角色主動傳訊息
  - 自動可打斷：用戶說話時停止輸入

**訊息格式**:
```javascript
message = {
  id: 'msg_timestamp',
  charId: 'char_xxx',
  role: 'user' | 'assistant',
  content: '訊息內容',
  createdAt: 1778072084727
}
```

---

### P5: API 整合
**完成日期**: 2026-02

**支援的 AI 服務商**:

#### 1. OpenAI
- **模型**:
  - GPT-5.5（最新旗艦，複雜推理）
  - GPT-5.4（專業推薦）
  - GPT-5.4 mini（速度快、費用低）
  - GPT-5.4 nano（最省成本）
- **端點**: `https://api.openai.com/v1`
- **取得 API Key**: https://platform.openai.com

#### 2. Anthropic (Claude)
- **模型**:
  - Claude Opus 4.7 (最新旗艦，4/16 發布)
  - Claude Opus 4.6 (推薦，穩定)
  - Claude Sonnet 4.6 (日常使用推薦)
  - Claude Haiku 4.5 (最快最省)
- **端點**: `https://api.anthropic.com/v1`
- **取得 API Key**: https://console.anthropic.com

#### 3. Google (Gemini)
- **模型**:
  - Gemini 2.5 Pro（旗艦，複雜推理）
  - Gemini 2.5 Flash（推薦，速度與能力平衡）
  - Gemini 2.5 Flash-Lite（最省成本，高吞吐量）
- **端點**: `https://generativelanguage.googleapis.com/v1beta/openai`
- **取得 API Key**: https://aistudio.google.com
- **注意**: Gemini 1.5 系列已於 2025-04-29 停用

**功能**:
- ✅ 自訂 API 位址（支援代理服務）
- ✅ 模型選擇器
- ✅ 連線測試

---

### P6: 社群功能
**完成日期**: 2026-03

**貼文系統**:
- ✅ AI 自動生成貼文（100-180 字）
- ✅ 標籤系統（2-4 個標籤）
- ✅ 按讚功能
- ✅ 留言系統：
  - 用戶留言
  - AI 自動回覆留言（30 字以內）
- ✅ 角色篩選器

**生成邏輯**:
```javascript
貼文生成 Prompt:
- 參考角色個性
- 參考最近對話
- 考慮當前時間
- 輸出 JSON 格式：
  {
    "content": "貼文內容",
    "tags": ["標籤1", "標籤2"]
  }
```

---

### P7: 生活記錄
**完成日期**: 2026-03

**日記系統**:
- ✅ AI 生成角色日記（200-300 字）
- ✅ 格式：
  ```
  第一行：有畫面感的標題
  
  日記正文（第一人稱，具體細節）
  
  最後：心情 emoji
  ```
- ✅ 日期追蹤（每天一篇）
- ✅ 心情標記

**夢境系統**:
- ✅ AI 生成詩意夢境（150-220 字）
- ✅ 具體感官細節（顏色、聲音、溫度）
- ✅ 可關聯最近對話主題

**黑盒子 (Heart Voice)**:
- ✅ 智慧觸發：每 5 輪強制一次，或情緒關鍵字命中時提早觸發
- ✅ 說不出口的真實情感（50 字以內）
- ✅ 聊天室內即時顯示（淡入卡片），不需要跳回首頁
- ✅ 角色篩選器

**通知中心**:
- ✅ 整合所有動態：
  - 📸 貼文通知
  - 📔 日記通知
  - 🌙 夢境通知
  - 💭 心聲通知
- ✅ 已讀/未讀狀態
- ✅ 點擊跳轉

---

### P8: 進階功能
**完成日期**: 2026-04

**已實作功能**:
- ✅ 多角色篩選（所有頁面統一體驗）
- ✅ 時間感系統：
  ```javascript
  現在時間：20:46，星期三
  // 角色會在對話中自然提及
  ```
- ✅ 記憶系統：
  - 可調整記憶條數（5-100）
  - AI 參考的歷史對話數量
- ✅ AI 參數完整調整：
  - 溫度 (Temperature)
  - 回覆延遲
  - 回覆條數
  - 話量傾向

---

### P9: 資料管理
**完成日期**: 2026-04

**匯出/匯入**:
- ✅ JSON 格式匯出
- ✅ 包含所有資料：
  - 角色設定
  - 聊天記錄
  - 系統設定
- ✅ 版本號標記
- ✅ 時間戳記

**匯出格式**:
```json
{
  "version": 2,
  "exportedAt": 1778072084727,
  "characters": [...],
  "messages": [...],
  "settings": [...]
}
```

**PWA 支援**:
- ✅ 可加入主畫面
- ✅ 動態生成 Icon（Canvas API）
- ✅ Manifest.json
- ⏳ Service Worker（計劃中）

---

## 🔧 Phase 2: Bug 修復與優化 (P10-P33)

### P10: Splash Screen 修復 ✅
**日期**: 2026-04-20  
**檔案**: `auris-p10-splash.html`

**問題**:
- 啟動畫面在密碼鎖上方顯示
- z-index 層級錯誤

**解決方案**:
```css
#splash { z-index: 9998; }
#lock { z-index: 9999; }
```

---

### P11: 聊天列表完整優化 ✅
**日期**: 2026-04-25  
**檔案**: `auris-p11-chatlist.html` (229KB)  
**GitHub**: https://github.com/sabine630/auris-app/blob/main/auris-p11-chatlist.html

**新增功能**:

#### 1. 搜尋系統
```javascript
功能：即時篩選角色名稱或對話內容
實作：oninput 事件 + filter()
```

#### 2. Tab 篩選
- 全部對話
- 僅顯示未讀

#### 3. 三種排序
- 📅 最近對話（預設）
- 🔤 角色名稱
- 💬 訊息數量

#### 4. 左滑操作
```javascript
手勢檢測：touchstart -> touchmove -> touchend
操作選項：
- 📌 置頂/取消置頂
- 🗑️ 清空對話記錄
- ❌ 刪除角色
```

#### 5. 批量管理
- 多選模式
- 全選功能
- 批量清空
- 批量刪除

#### 6. 其他功能
- 標記全部已讀
- 新增對話選擇器
- 對話預覽（最後一則訊息）
- 時間顯示（timeAgo 格式）

**同時修復的 Bug**:
- ✅ Tab 列位置錯誤
- ✅ PWA Icon 無法顯示
- ✅ 手機縮放問題（viewport-fit=cover）
- ✅ 時間格式優化（24 小時制）
- ✅ 未讀邏輯完善
- ✅ Markdown 顯示問題
- ✅ JSON 解析容錯
- ✅ Gemini 模型名稱修正
- ✅ 底部導覽列隱藏邏輯（聊天室頁面）
- ✅ 內容截斷問題

---

### P12: 未讀計數精確化 ✅
**日期**: 2026-05-01  
**檔案**: `auris-p12-fixes.html`

**核心改動**:

#### Before (布林值)
```javascript
character = {
  hasUnread: true  // 只知道有/沒有未讀
}
```

#### After (精確數字)
```javascript
character = {
  hasUnread: true,    // 保留相容性
  unreadCount: 15     // 精確未讀數量
}
```

**新增邏輯**:
```javascript
// AI 回覆時判斷用戶是否在聊天室
const isUserInRoom = 
  document.body.dataset.page === 'pg-chat-room' && 
  curCharId === c.id;

if (!isUserInRoom) {
  c.unreadCount = (c.unreadCount || 0) + 1;
  c.hasUnread = true;
  await dbPut('characters', c);
}
```

**顯示效果**:
- 首頁 badge: 顯示總未讀數（>99 顯示 "99+"）
- 聊天列表: 每個角色顯示精確數字

**函數重命名**:
```javascript
// 避免命名衝突
markAllRead() → markAllNotifRead()
// HTML 第 1347 行同步更新
```

**頁面追蹤系統**:
```javascript
// 在 nav_() 和 back() 中加入
document.body.dataset.page = pageId;
```

---

<details>
<summary><b>🔧 展開查看 P12 幾十項 Bug 詳細修復清單</b></summary>

### P12-bugfix: 全面 Bug 修復 + Heart Voice 重設計 + Prompt 升級 ✅
**日期**: 2026-05-10  
**檔案**: `auris-p12-bugfix.html`

#### 🔴 嚴重 Bug 修復（4 個）

**1. deleteChar() 函數名稱衝突**
```javascript
// 問題：空殼版（無 charId）覆蓋實際版，導致角色刪不掉
async function deleteChar(){confirmDeleteChar()}  // ← 已移除

// 保留：完整版（有 charId）
async function deleteChar(charId){ ... }
```

**2. markAllRead() 函數名稱衝突**
```javascript
// 聊天列表版改名，避免與通知頁版衝突
markAllRead() → markAllChatsRead()
// HTML onclick 同步更新
```

**3. 進入聊天室未清零 unreadCount**
```javascript
// startChat() 補上
c.hasUnread = false;
c.unreadCount = 0;  // ← 新增，避免 badge 殘留舊數字
await dbPut('characters', c);
```

**4. 首頁 badge 顯示角色數而非訊息數**
```javascript
// Before：顯示「有未讀的角色人數」，判斷條件也用舊欄位
const unreadChars = chars.filter(c => c.hasUnread !== false);
badge.textContent = unreadChars.length;

// After：顯示「總未讀訊息數」，支援 99+
const totalUnread = chars.reduce((sum,c) => sum + (c.unreadCount||0), 0);
badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
```

#### 🟡 中等 Bug 修復（5 個）

**5. 離開聊天室 aiTyping / grpTyping 狀態殘留**
```javascript
// back() 補上重置邏輯，避免下次進聊天室按鈕永遠 disabled
if(leaving === 'pg-chat-room'){
  aiTyping = false;
  I('chat-send').disabled = false;
  I('typing')?.remove();  // 清除殘留 typing indicator
}
```

**6. swipe 手勢監聽器重複綁定（記憶體洩漏）**
```javascript
// Before：每次 render 對每個 .chat-item 各綁三個事件
items.forEach(item => { item.addEventListener('touchstart', ...) })

// After：Event Delegation，容器層只綁一次，_swipeReady 旗標防重複
container.addEventListener('touchstart', e => {
  const item = e.target.closest('.chat-item'); ...
}, {passive: true});
```

**7. 群組 sendGroupMsg 外層無 finally**
```javascript
// 加外層 try/finally，任何異常都保證清除 typing 殘留並恢復按鈕
} finally {
  grpTyping = false;
  I('grp-send').disabled = false;
  document.querySelectorAll('[id^="grp-typing-"]').forEach(el => el.remove());
}
```

**8. 刪除角色 / 清空對話未清除相關資料**
```javascript
// 三個刪除路徑（單刪 / 批刪 / 角色編輯頁）統一清除所有關聯資料
const stores = ['messages', 'memories', 'diary', 'dreams', 'moments'];
for(const store of stores){
  const items = await dbIdx(store, 'charId', charId);
  for(const item of items) await dbDel(store, item.id);
}
// clearChat / batchClearChats 也補上清除 memories
```

**9. 群組頭像渲染 XSS 漏洞**
```javascript
// Before：直接插入未過濾的字串
(avA?.avatar || '🌸')

// After：經過 esc() 過濾
esc(avA?.avatar || '🌸')
```

#### 🔵 小問題修復（1 個）

**10. 首頁黑盒子計數包含已刪除角色的孤立資料**
```javascript
// updateBBHomeSub 改為交叉比對現有角色，過濾孤立心聲
const charIds = new Set(chars.map(c => c.id));
const valid = all.filter(m => charIds.has(m.charId));
sub.textContent = `${valid.length} 則心聲`;
```

#### 💜 Heart Voice 系統重設計

**觸發機制（之前：每次 AI 回覆都觸發，大量浪費 token）**
```javascript
// After：智慧觸發，兩個條件任一命中才發 API
const HV_INTERVAL = 5;  // 每 5 輪 AI 回覆強制觸發一次

const HV_EMOTION_WORDS = [
  '喜歡','愛','討厭','難過','想念','孤單','幸福',
  '心跳','臉紅','說不出','不敢', ... // 共 35 個詞
];

function shouldTriggerHV(allMsgs, aiText){
  const aiCount = allMsgs.filter(m => m.role === 'assistant').length;
  if(aiCount > 0 && aiCount % HV_INTERVAL === 0) return true;
  const combined = allMsgs.slice(-3).map(m => m.content).join('') + aiText;
  return HV_EMOTION_WORDS.some(w => combined.includes(w));
}
```

**聊天室內即時顯示（之前：只能去首頁點黑盒子才看得到）**
```javascript
// 心聲生成後，若用戶仍在該聊天室，直接插入訊息列表末尾
function insertHVInline(text){
  const el = document.createElement('div');
  el.className = 'hv-inline';  // 淡入動畫 + 玫瑰左線樣式
  el.innerHTML = `<div class="hv-label">heart voice</div>
                  <div class="hv-text">${esc(text)}</div>`;
  container.appendChild(el);
}
```

#### 📝 Prompt 品質全面升級

| 功能 | max_tokens | 字數要求 | 主要改動 |
|------|-----------|---------|---------|
| 聊天回覆 | 600（不變） | 不變 | 加「回覆品質要求」區塊，禁止空洞回應和通用句型 |
| 貼文 | 500 → **800** | 80-150 → **100-180 字** | 要求具體場景細節，禁止廢話模板 |
| 日記 | 500 → **800** | 150-250 → **200-300 字** | 禁止空洞結語，提供對話原文而非摘要 |
| 夢境 | 450 → **800** | 120-200 → **150-220 字** | 要求感官細節（顏色/聲音/溫度），禁止陳腔濫調 |

---

</details>


### P13: UI 細節修復 ✅
**日期**: 2026-05-02  
**檔案**: `auris-p13-ui-fixes.html`

**修復項目**:

#### 1. 設定頁標題置中
**問題**: 缺少右側佔位元素

```html
<!-- Before -->
<div class="ph">
  <div class="ph-back">返回</div>
  <div class="ph-title">設定</div>
  <div></div>  <!-- 空 div，無 class -->
</div>

<!-- After -->
<div class="ph">
  <div class="ph-back">返回</div>
  <div class="ph-title">設定</div>
  <div class="ph-act"></div>  <!-- 加入 ph-act class -->
</div>
```

#### 2. Gemini API 404 錯誤診斷
**檢查結果**: 
- 端點路徑正確：`/v1beta/openai/chat/completions`
- OpenAI 相容格式正確
- 無需修改

**完整路徑**:
```
https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
```

#### 3. 導覽列高度微調
```css
/* Before */
.nav { 
  height: 80px; 
  padding-top: 10px; 
}

/* After */
.nav { 
  height: 68px; 
  padding-top: 8px; 
}
```
**效果**: 減少 12px，讓底部更緊湊

---

<details>
<summary><b>🔧 展開查看 P14-P18 PWA 底部白邊除錯完整日誌</b></summary>

### P14-P18: PWA 底部空隙問題 ⚠️ → ✅ P28 已解決
**日期**: 2026-05-03 ~ 2026-05-06  
**狀態**: 未解決  
**GitHub 最新**: https://github.com/sabine630/auris-app/blob/main/index.html

#### 問題描述
- **平台**: iPhone (iOS 15+)
- **模式**: PWA 全螢幕模式（加入主畫面後）
- **症狀**: 導覽列與螢幕底部之間有 40-50px 空隙
- **影響**: 視覺不美觀，底部留白過多
- **觸發條件**: 
  - 從 Safari 加入主畫面
  - 以獨立 App 方式開啟
  - 適用於 `@media (display-mode: standalone)`

#### 診斷截圖
- 設定頁面底部空隙: 約 45px
- 導覽列 (60px) + 空隙 (45px) = 總高度 105px
- 預期: 導覽列應緊貼螢幕底部

---

#### P14 嘗試
**日期**: 2026-05-03  
**檔案**: `auris-p14-pwa-fix.html`  
**策略**: 在容器和導覽列都加入 safe-area-inset

```css
@media (display-mode:standalone) {
  .phone {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  .nav { 
    height: 60px;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
}
```

**結果**: ❌ 失敗
- **問題**: 雙重處理底部安全區
- **計算**: 34px (phone) + 34px (nav) = 68px 總空隙
- **診斷**: 兩個元素都加 padding 造成累加

---

#### P15 嘗試
**日期**: 2026-05-04  
**檔案**: `auris-p15-final-fix.html`  
**策略**: 只在 nav 處理，移除 phone 的 padding

```css
@media (display-mode:standalone) {
  .phone {
    padding-bottom: 0;  /* 移除容器 padding */
  }
  .nav { 
    height: calc(60px + env(safe-area-inset-bottom, 0));
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
}
```

**結果**: ❌ 失敗
- **問題**: 仍有大片空隙
- **可能原因**: `calc()` 計算可能有誤，或被其他 CSS 覆蓋

---

#### P16 嘗試
**日期**: 2026-05-05  
**檔案**: `auris-p16-ultimate.html`  
**策略**: 移除 calc()，使用 auto height

```css
@media (display-mode:standalone) {
  .phone {
    padding-bottom: 0;
  }
  .nav {
    height: auto;           /* 自動高度 */
    min-height: 60px;       /* 最小值 */
    padding-bottom: env(safe-area-inset-bottom);
    flex-shrink: 0;         /* 防止被壓縮 */
  }
}
```

**結果**: ❌ 失敗
- **問題**: 空隙依然存在
- **診斷**: 可能是 flex 佈局的問題

---

#### P17 嘗試
**日期**: 2026-05-05  
**檔案**: `auris-p17-flexfix.html`  
**策略**: 修正 flex 佈局，讓內容區域正確填滿

```css
@media (display-mode:standalone) {
  .screen {
    flex-grow: 1;           /* 填滿剩餘空間 */
    overflow-y: auto;
    overflow-x: hidden;
  }
  .nav {
    height: auto;
    min-height: 60px;
    padding-bottom: env(safe-area-inset-bottom);
    flex-shrink: 0;
  }
}
```

**結果**: ❌ 失敗
- **問題**: `.screen` 已有 `flex: 1`，修改無效
- **診斷**: 問題不在 flex 佈局

---

#### P18 嘗試（最新）
**日期**: 2026-05-06  
**檔案**: `auris-p18-fixed-bottom.html`  
**策略**: 使用 position: fixed 強制貼底

```css
@media (display-mode:standalone) {
  .nav {
    position: fixed;        /* 固定定位 */
    bottom: 0;              /* 強制貼底 */
    left: 0;
    right: 0;
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 100;
  }
  .screen {
    /* 給導覽列預留空間 */
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
  }
}
```

**結果**: ❌ 失敗（用戶實測後仍有空隙）

---

#### 技術分析總結

**嘗試過的方案**:
1. ✅ 移除 `.phone` 的 `padding-bottom`
2. ✅ 使用 `height: auto` + `min-height`
3. ✅ 移除所有 `calc()` 計算
4. ✅ 調整 flex 佈局屬性
5. ✅ 使用 `position: fixed`

**可能的根本原因**:
1. ❓ **iOS WebKit bug**: `env(safe-area-inset-bottom)` 在 PWA 模式下計算錯誤
2. ❓ **PWA 渲染機制**: 獨立 App 模式有特殊的視窗管理
3. ❓ **CSS 層疊問題**: 其他規則在 standalone 模式下被覆蓋
4. ❓ **快取問題**: 
   - GitHub Pages CDN 快取
   - 手機端 PWA 強快取
   - 可能實際上沒載入最新版本

**待驗證假設**:
```css
/* 假設 1: env() 函數在 PWA 模式失效 */
/* 解決: 使用固定像素值 */
padding-bottom: 34px;  /* iPhone 標準底部安全區 */

/* 假設 2: 容器高度計算錯誤 */
/* 解決: 直接設定 100vh - 不依賴 flex */
.phone {
  height: 100vh;
  display: block;  /* 不使用 flex */
}

/* 假設 3: 視窗計算基準錯誤 */
/* 解決: 使用 dvh (dynamic viewport height) */
height: 100dvh;  /* CSS 新單位，2023+ */
```

---

#### 下一步建議

**方案 A: 深度診斷**
1. 在 Safari 開發者工具檢查 computed styles
2. 確認 `env(safe-area-inset-bottom)` 的實際計算值
3. 檢查是否有其他 CSS 規則覆蓋
4. 使用 `getComputedStyle()` 動態讀取

**方案 B: 固定像素方案**
```css
@media (display-mode:standalone) {
  .nav {
    position: fixed;
    bottom: 0;
    padding-bottom: 34px;  /* 固定值 */
  }
  
  /* iPhone 機型偵測 */
  @supports (padding: max(0px)) {
    .nav {
      padding-bottom: max(34px, env(safe-area-inset-bottom));
    }
  }
}
```

**方案 C: JavaScript 動態計算**
```javascript
// 在 PWA 模式下動態調整
if (window.matchMedia('(display-mode: standalone)').matches) {
  const safeAreaBottom = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--sab')
  ) || 34;
  
  document.querySelector('.nav').style.paddingBottom = 
    safeAreaBottom + 'px';
}
```

**方案 D: 暫時接受**
- 功能上不影響使用
- 視覺上雖不完美但可接受
- 先開發其他功能，之後再回來修復

---

</details>


### P19-P27: 中間版本 📝
**日期**: 2026-05-07 ~ 2026-05-14（推估）
**狀態**: 內容不詳（未在進度文件記錄）

#### 概況
此區間共 9 個版本未紀錄細節。從 P28 結果回推，期間應有以下類型的工作：
- PWA 底部空隙的多輪嘗試（最終於 P28 用 pad vars 方案解決）
- 鍵盤遮蔽處理（後續 P32「鍵盤再修」表示這條線一直在改）
- 各類 UI 細節與 prompt 微調

> 備註：若日後需要回溯，可從版本檔名（auris-pXX-xxx.html）的後綴看出主題。

---

### P28: PWA 底部空隙最終解決 ✅
**日期**: 2026-05-15（推估）
**檔名**: `auris-p28-pad-vars.html`
**狀態**: 已解決（P14-P18 困擾多輪的問題）

#### 解決方案：CSS 變數驅動的 padding
透過動態 CSS 變數 `--kb-offset` 與 `safe-area-inset-bottom` 配合，讓 `.phone` 容器的 padding-bottom 能即時反映鍵盤狀態與系統安全區，徹底告別硬編碼空隙。

#### 配套機制
- `setupViewportTracking()`：監聽 `visualViewport` 動態更新 `--kb-offset`
- 鍵盤彈出時收緊 padding、收起時還原
- 與 PWA standalone 模式的 safe-area 共存

---

### P29-P31: 中間版本 📝
**日期**: 2026-05-16 ~ 2026-05-17（推估）
**狀態**: 內容不詳（未在進度文件記錄）

---

### P32: 鍵盤再修 + 複製同步化 + 長篇放寬 + 貼文按鈕重構 ✅
**日期**: 2026-05-17
**檔名**: `auris-p32-bugfix.html`
**狀態**: 部分問題殘留（由 P33 接續修復）

#### 主要改動
1. **鍵盤遮蔽再優化**：`.phone` 加入 `padding-bottom:var(--kb-offset,0px)` 與 transition
2. **複製功能同步化**：訊息複製改為同步觸發，避免 iOS 拒絕
3. **長篇生成放寬**：sendMsg 引入動態 `max_tokens`
   - 偵測到長篇關鍵字（故事/小說/字數要求）→ 8000 tokens
   - 其他 → 2000 tokens
   - 並偵測 `finish_reason==='length'` / `stop_reason==='max_tokens'` 標示為截斷
4. **貼文按鈕重構**：引入 `needPick` 機制，多角色時跳出 picker 選擇

#### 殘留問題（→ P33）
- 長篇 regex 不認中文數字與口語動詞（「說個五百字的故事」不觸發長篇模式）
- Heart Voice `max_tokens=400` 太寬鬆，模型會把對話續寫成長故事
- 貼文/日記/夢境的「生成」按鈕點擊無反應（根因 P33 才查明）

---

### P33: 三 Bug 修復 + Gemini 相容性 ✅
**日期**: 2026-05-18 ~ 2026-05-19
**檔名**: `auris-p33-bugfix-v3.html`（最終版）
**狀態**: 已解決

#### Bug 1：聊天訊息被截斷
**根因**：P32 的長篇偵測 regex 只認「寫」+ 阿拉伯數字字數，使用者打「**說個五百字的故事**」不匹配，落到 2000 tokens 短模式。

**修法**：擴充 regex
```js
const longFormTriggers=/(
  \d{2,}\s*字|\d{2,}\s*words?|
  [一二三四五六七八九兩幾]百\s*字|     // 中文百位字數
  [一二兩三]千\s*字|
  [一二三四五六七八九十兩]+\s*萬\s*字|
  (寫|說|講|來|編|想|聽|給我).{0,6}(  // 擴充動詞
    故事|小說|文章|信|詩|散文|劇本|演講|
    報告|論文|介紹|長篇|短篇|童話|寓言|
    傳記|日記|劇情
  )|
  睡前故事|床邊故事|長一?點|詳細|完整|
  具體說明|長篇|大綱
)/i;
```
16 個測試案例全通過。

#### Bug 2：Heart Voice 變成續寫故事
**根因（雙層）**：
1. `max_tokens=400`（中文約 600 字餘裕），模型不遵守 50 字限制
2. 餵 6 條對話歷史當情境，當最後一條是「半截故事」時，模型誤判為「續寫故事」

**修法**：
- `max_tokens` 從 400 → 120 → **80**（兩次調整）
- prompt 從「50 字內」改成「**30 字內**」，加強範例與禁止延續故事的明示
- 情境只保留 user/AI 最後一句（各取前 150 字）
- 後處理找**最後一個句尾標點**截斷（原本找第一個逗號，導致前 9 字就被砍）

#### Bug 3：貼文/日記/夢境「生成」按鈕無反應
**真正根因**（由瀏覽器版 Claude 偵錯抓到 HTTP 400 回應確認）：
> Gemini 的 OpenAI 相容端點**不支援** `frequency_penalty` 與 `presence_penalty` 參數，直接回 400。App 沒處理錯誤導致看起來「沒反應」。

**修法**：改成動態 payload，**只在 OpenAI 時加 penalty 參數**
```js
const payload={model,max_tokens:2500,temperature:0.78,messages:[...]};
if(provider==='openai'){
  payload.frequency_penalty=0.5;
  payload.presence_penalty=0.2;
}
```
三處（貼文/日記/夢境）都套上。

#### 配套強化
- `showDiaryGenPanel()` 補上 `updateDiaryGenBtn()` 呼叫（原本面板開了 charId 還是空）
- 進入貼文/日記/夢境頁時主動清零鎖（解決 PWA 從背景恢復鎖卡住）
- 所有「靜默 return」改成可見 toast，並把 toast 預設時長從 2.4s → 4.5s（關鍵訊息 5.5~6.5s）
- 新增 `fetchWithTimeout()` 90 秒逾時保險
- 三個生成函式的 catch 區塊處理逾時錯誤更友善

#### 偵錯方法的省思
P33 Bug 3 的根因（Gemini API 不相容）**無法從讀 code 推測出來**，因為 sendMsg/HV/評論這些用同一個 base URL 都正常，只有生成系列壞掉，看程式碼會以為是邏輯問題。最後是讓瀏覽器版 Claude 在實機 Network panel 抓到 HTTP 400 + 完整錯誤訊息才確認。

**結論**：未來遇到「靜默失敗」類 bug，第一步是**抓網路請求**，而不是讀 code。

---

### P34: 群組點名 + 貼文留言區佈局修復 ✅
**日期**: 2026-05-19
**檔案**: `auris-p34-bugfix.html`

#### Bug 1：群組裡點名某角色，那個角色卻不回應
**症狀**：在群組裡使用者點名某角色，被點名角色沉默不回應，反而是其他角色搶先發言。

**根因**：`sendGroupMsg` 雖對每個角色跑迴圈，但 sysPrompt 完全沒告訴 AI「使用者剛剛點名了你」，被點名角色從自身視角看不到任何強制回應的提示。

**修法**：
```javascript
// 1. 偵測點名
const mentionedIds = new Set();
for(const c of validChars){
  if(c.name && content.includes(c.name)) mentionedIds.add(c.id);
}
// 2. 被點名優先排序
const orderedChars = [
  ...validChars.filter(c => mentionedIds.has(c.id)),
  ...validChars.filter(c => !mentionedIds.has(c.id))
];
// 3. 被點名一定回，不走 70% 機率
const willReply = isMentioned || validChars.length<=2 || Math.random()>0.3;
// 4. sysPrompt 塞點名提示
const mentionHint = isMentioned
  ? `\n⚠️ 注意：使用者在訊息裡直接點名了你（${c.name}），請務必正面回應。`
  : '';
```

#### Bug 2：貼文詳情頁留言輸入框下方有大片空白
**根因**：`.post-comment-bar` 用 `position:sticky;bottom:0`，但內容短時 sticky 黏在「內容自然結尾」而非 viewport 底部。

**修法**：仿照聊天室改成 flex 直欄，`<input>` 換成 `<textarea>` 支援多行。

---

### P35: 鍵盤拉起隱藏 nav + 群組角色越界修復 ✅
**日期**: 2026-05-20（上午）
**檔案**: `auris-p35-bugfix.html`

#### Bug 1：iOS 鍵盤拉起時輸入框上方仍有大塊空白
**修法**：鍵盤拉起時直接隱藏底部 tab bar（LINE/Instagram 標準做法），加 `focusin/focusout` 雙重保險。

```css
.nav.kb-hidden{ height:0; padding:0; border:none; overflow:hidden; }
.nav.kb-hidden .ni{ opacity:0; pointer-events:none; }
```

#### Bug 2：群組角色幫使用者說話（自編對話）
**修法（三層防禦）**：
1. 改寫歷史格式：user 訊息直接給原文；其他角色包裝成「（XX 剛剛說：xxx）」
2. 強化 prompt 禁令：4 條【絕對禁止】
3. 輸出後加清洗邏輯（P36 後調整為保守版）

**踩坑**：P35 清洗邏輯太兇——只要輸出裡出現「角色名：」就截斷，導致合法對話被誤殺，引發 P36。

---

### P36: 群組清洗邏輯過度誤殺修復 ✅
**日期**: 2026-05-20（下午）
**檔案**: `auris-p36-bugfix.html`

#### Bug：群組跑完 typing 動畫後畫面無任何訊息
**根因**：P35 清洗把所有含「角色名：」的輸出截成空字串（包含 AI 自然提及對方名字的合法回覆）。

**修法：保守版清洗 + 保險絲**：
```javascript
// 只砍最開頭的自己名字前綴
const selfPrefix = new RegExp('^[「『\\s]*' + escape(c.name) + '[」』]?\\s*[：:]\\s*', '');
cleaned = cleaned.replace(selfPrefix, '');

// 只在「換行 + 其他角色名：」才截斷（多人對話切換的強特徵）
const re = new RegExp('\\n\\s*' + escape(n) + '\\s*[：:]');

// 保險絲：清洗後為空就 fallback 回原始輸出
const final = cleaned || rawText;
```

**學到的教訓**：
1. 規則要極度保守——寧可漏異常，不誤殺合法輸出
2. 要有保險絲——清洗後空字串必須 fallback
3. 換行+名字+冒號 比 字串內含名字+冒號 強得多
4. 本機先跑「正常輸出」測試案例，不只測異常案例

---

## ✅ Phase 3: Vue 3 架構重構 (P37-P38)

> **背景**：HTML 單檔版本（P36）功能完整，但隨著功能增多維護成本急速上升。P37 起正式遷移至 Vue 3 + Vite，進入元件化開發模式。

---

### P37: Vue 3 全面架構重構 ✅
**日期**: 2026-05-20
**Git 分支**: `main`（`auris-vue/` 子目錄）

#### 重構範圍
- ✅ 從 Vanilla JS 單 HTML（5,489 行）完整遷移至 Vue 3 + Vite
- ✅ 21 個獨立 View 元件（對應原 19 個頁面 + 2 個新頁面）
- ✅ Vue Router 4 路由系統（取代原本的 `nav_()` SPA 切換）
- ✅ Pinia-style 全局 Store（`globalStore`）
- ✅ IndexedDB 服務層抽離（`services/db.js`、`services/api.js`、`services/contentEngine.js`）

#### 新增功能（HTML 版沒有）
- ✅ **Onboarding 新手引導**：4 步驟引導（歡迎 → API → 建角色 → 完成）
- ✅ **底部 nav 智能亮起**：聊天室、群組、貼文詳情等頁面都正確高亮對應 tab
- ✅ **LockView 佔位**：開發模式鎖定頁（正式版移除）

#### Vue 檔案結構
```
auris-vue/src/
├── App.vue                  # 根元件（clock、nav 控制）
├── router/index.js          # 21 條路由
├── store/index.js           # 全局狀態（角色、主題、鍵盤偏移）
├── services/
│   ├── db.js               # IndexedDB CRUD
│   ├── api.js              # fetchWithTimeout
│   └── contentEngine.js    # 日記/夢境/貼文 AI 生成
├── components/
│   └── BottomNav.vue       # 底部導航
└── views/ (21 個)
    ├── HomeView.vue
    ├── ChatListView.vue / ChatRoomView.vue
    ├── MomentsView.vue / PostDetailView.vue
    ├── DiaryView.vue / DiaryDetailView.vue
    ├── DreamView.vue / DreamDetailView.vue
    ├── BlackboxView.vue
    ├── GroupListView.vue / GroupCreateView.vue / GroupRoomView.vue
    ├── CharManageView.vue / CharEditView.vue
    ├── NotificationsView.vue
    ├── MeView.vue / SettingsView.vue / ApiView.vue
    ├── OnboardingView.vue   ← 新增
    └── LockView.vue         ← 開發模式佔位
```

---

### P38: Vue 版 UI 修復（首次全面比對） ✅
**日期**: 2026-05-20
**Commits**: `9b39266`, `f48f980`

#### 六項 UI 修復
| # | 問題 | 修復 |
|---|------|------|
| 1 | 角色設定頁模態框（新增章節/刪除確認）顯示為行內內容 | `main.css` 補上完整 modal CSS（`.modal-overlay`/`.modal-box`/`.modal-btn` 等） |
| 2 | 聊天頁無角色時「新增角色」按鈕深色 | `btn-primary` → `empty-cta`（玫瑰色） |
| 3 | 日記頁無角色時點＋仍顯示「請先在上方選擇角色」 | gen panel 加 `&& characters.length > 0` 條件 |
| 4 | 貼文頁同上 | 同上 |
| 5 | 夢境初始頁同時顯示生成區和空狀態（雙層重複） | 空狀態只在有角色但無夢境時顯示 |
| 6 | 群組聊天空狀態按鈕深色 | `btn-primary` → `empty-cta` |

#### 導航修復
- **底部「對話」tab** 原本連到 `/chat`（聊天室），改連到 `/chat-list`（聊天列表）——對齊 HTML 版行為
- **active 狀態邏輯重寫**：改用 `useRoute` computed，「對話」tab 在 chat-list / chat / group-list / group-create / group-room 均正確高亮

#### API 模型更新
| 服務商 | 舊版 | 新版（P38） |
|--------|------|------------|
| OpenAI | gpt-4o-mini, gpt-4o | GPT-5.5 / 5.4 / 5.4-mini / 4o |
| Anthropic | claude-3-5-sonnet-20240620, claude-3-haiku-20240307 | Opus 4.7 / 4.6、Sonnet 4.6、Haiku 4.5 |
| Google | gemini-1.5-flash, gemini-1.5-pro | Gemini 2.5 Flash / Flash-Lite / Pro / 3 Flash（預覽） |

模型選擇 UI 也從 tag-button 改為 radio 列表（顯示名稱 + 說明文字）。

---

### P39: 7 大 Bug 修復與 PWA 動態圖示支援 ✅
**日期**: 2026-05-21

#### 功能優化
- **動態 PWA/Favicon 圖示**：在 `App.vue` 中透過 `<canvas>` 動態產生符合當前主題的「A」字 PWA 圖示（並同步作為 Favicon），同時動態寫入 `manifest.json` 與 `theme-color`。

#### Bug 修復
| # | 問題 | 修復 |
|---|------|------|
| 1 | GitHub Pages 重新載入 404 | 新增 `public/404.html` 做 SPA redirect，`index.html` 還原路由 |
| 2 | AI 聊天/日記/夢境內容太短 | 調整提示詞最低字數要求（如貼文 60~200、日記 300~500），並提高 `max_tokens` 至 4000 |
| 3 | 群組 typing 無訊息 | 修正 `chatEngine.js` 中角色名稱 Regex Escape，並加入重試機制 |
| 4 | 貼文回覆失效 | 修正 Anthropic API `system` prompt 分離，並加入回覆載入中（typing）的提示動畫 |
| 5 | 不能刪除角色 | 於角色管理頁面新增刪除按鈕與確認彈窗，並連帶清除所有記憶、貼文、日誌等資料 |
| 6 | 群組不能修改名稱與成員 | 於群組聊天室 `...` 按鈕加入群組設定選單，支援 inline 改名與 checkbox 選取成員 |
| 7 | 聊天視窗 `...` 按鈕錯誤 | 改為開啟底部選單（提供角色資訊、清除聊天記錄、匯出聊天記錄功能） |

---

### P40: 群組聊天第三方 Proxy 偵錯與防護機制 ✅
**日期**: 2026-05-22

#### 功能優化與修復
- **問題追蹤**：群組聊天功能在 P39 遷移至 Vue 3 後，於特定第三方 API Proxy 下發生靜默失效（回傳空白）。
- **實作對話流級別偵錯**：捨棄易被覆蓋的 Toast 提示，改將底層 API 拋出的 Exception 或空字串直接封裝為 `【系統偵錯】` 訊息，寫入 `group_messages` 資料庫並渲染於聊天室畫面，大幅提升開發者與使用者的除錯能力。
- **Proxy 相容性提升**：
  - 修正了 `chatEngine.js` 中對 API 回傳錯誤格式的捕捉邏輯，支援第三方 Proxy 常見的陣列格式（如 `[{"error": ...}]`）。
  - 將群組聊天的 `max_tokens` 從 800 放寬至 4000，以規避部分非官方節點對小額 `max_tokens` 的強制截斷 (`finish_reason: length` 且 `completion_tokens: 0`) 錯誤。

---

### P41: UI Bug 修復 — 夢境雙月亮、鍵盤空白、群組多人回覆 ✅

### P47: 聊天室 Streaming 串流輸出（一對一 + 群組）✅
**日期**: 2026-05-24
**核心改動**:
1. **SSE 串流解析器**：於 `chatEngine.js` 新增 `parseSSEStream(response, provider, onChunk)` 共用工具，相容 Anthropic（`content_block_delta` 事件）與 OpenAI/Gemini（`data: [DONE]` 終止符）兩種 SSE 格式，支援截斷偵測。
2. **一對一串流 API**：新增 `generateAIResponseStream(charId, allMsgs, { onChunk })`，擷取共用設定邏輯至 `buildAIChatSetup()`，支援角色 delay、長文偵測、Heart Voice 觸發，並正確將 `stream: true` 傳入各 provider。
3. **群組串流 API**：新增 `generateGroupAIResponseStream(groupId, charId, allMsgs, members, { onChunk, onStart })`，`onStart` 在 HTTP 回應到達後立即回調（保留三點動畫至第一個 token），`onChunk` 逐字更新，完成後仍執行 `cleanGroupAIText` 清洗。
4. **ChatRoomView UI**：`sendMsg` 與 `doRegenerate` 改用串流，首個 token 到達前顯示三點動畫，到達後立即切換為逐字成長的訊息 bubble，含 `▍` 閃爍游標動畫；僅在使用者靠近底部時自動捲動。
5. **GroupRoomView UI**：同步改為串流，`onStart` 時將三點動畫切換為角色 bubble，多角色輪替順序與延遲邏輯不變。

**受影響檔案**:
| 檔案 | 說明 |
|------|------|
| `auris-vue/src/services/chatEngine.js` | 新增 `parseSSEStream`、`buildAIChatSetup`、`buildGroupChatSetup`、`generateAIResponseStream`、`generateGroupAIResponseStream` |
| `auris-vue/src/views/ChatRoomView.vue` | sendMsg、doRegenerate 改串流，加游標 CSS |
| `auris-vue/src/views/GroupRoomView.vue` | sendMsg 改串流，加游標 CSS |
| `auris-vue/src/views/SettingsView.vue` | 版號更新 P46 → P47 |

---

### P50: 自動生成觸發引擎 ✅
**日期**: 2026-05-25
**核心改動**:
1. **每日首次開啟自動生成**（`App.vue`）：`onMounted` 後在背景呼叫 `runDailyAutoGen()`，讀取 `last_auto_gen_date` 設定值；若與今日不同，遍歷所有角色，對 `autoDiary: true` 的角色呼叫 `generateDiary`（先確認當日日記不存在以防重複），對 `autoPost: true` 的角色呼叫 `generatePost`；生成後 toast 告知使用者。
2. **完全靜默背景執行**：不 `await`，不阻塞 UI；API 失敗只 console.warn，不影響 App 啟動。

**受影響檔案**:
| 檔案 | 說明 |
|------|------|
| `auris-vue/src/App.vue` | 加入 `runDailyAutoGen()` + import contentEngine |
| `auris-vue/src/views/SettingsView.vue` | 版號更新 P48 → P50 |

---

### P49: 動態回覆模式實作 ✅
**日期**: 2026-05-25
**核心改動**:
1. **主動訊息串流函式**（`chatEngine.js`）：新增 `generateProactiveMessageStream(charId, allMsgs, { onChunk, signal })`，在 system prompt 後附加【主動訊息】上下文，確保 history 末尾為 user role（若末尾為 assistant 則補 `（沉默中）` 訊息），使用外部傳入的 `AbortSignal` 支援打斷，儲存訊息時 id 加 `_pro` 後綴區分。
2. **背景計時器**（`ChatRoomView.vue`）：`scheduleProactive()` 根據角色 `care` 設定（`rarely` 12-25 分鐘、`sometimes` 4-10 分鐘、`often` 1-4 分鐘）計算隨機間隔；扣除上則訊息的已過時間，最短 3 秒觸發；mount 時啟動，unmount 時清除。
3. **自動可打斷**（`ChatRoomView.vue`）：`handleInput()` 取代原本的 `autoResize()`，在 `auto-interrupt` 模式下偵測使用者打字時呼叫 `proactiveController.abort()`，中止進行中的主動訊息生成。
4. **計時器重設**：`sendMsg` 的 finally 及 `triggerProactive` 的 finally 均呼叫 `scheduleProactive()` 確保每次對話後都重新計算下次主動訊息時機。

**受影響檔案**:
| 檔案 | 說明 |
|------|------|
| `auris-vue/src/services/chatEngine.js` | 新增 `generateProactiveMessageStream` |
| `auris-vue/src/views/ChatRoomView.vue` | proactive timer、triggerProactive、handleInput、CARE_INTERVALS |

---

### P48: 長期記憶與總結助手（記憶抽屜）✅
**日期**: 2026-05-24
**核心改動**:
1. **IndexedDB 升至 v5**：於 `db.js` 新增 `chat_memories` 資料表（索引 `charId`），並加入 export/import ALL_STORES。
2. **AI 總結函式**：於 `chatEngine.js` 新增 `summarizeToMemory(charId, messages, count)`，呼叫 LLM 將近期對話濃縮成 100～200 字摘要，儲存為記憶條目，相容 OpenAI / Anthropic / Google 三種 provider。
3. **記憶注入 System Prompt**：`buildAIChatSetup` 讀取該角色已啟用的記憶條目，以 `【長期記憶】` 區塊插入 system prompt，讓 AI 記住跨對話的重要資訊。
4. **記憶抽屜 UI**：`ChatRoomView.vue` 標題列新增記憶腦波圖示（已啟用時顯示紅點徽章），點擊展開滑入式抽屜面板：AI 總結按鈕、記憶列表（含開關 toggle、展開詳情、刪除）、token 消耗估算。

**受影響檔案**:
| 檔案 | 說明 |
|------|------|
| `auris-vue/src/services/db.js` | DB 升 v5，新增 `chat_memories` store |
| `auris-vue/src/services/chatEngine.js` | 新增 `summarizeToMemory`，`buildAIChatSetup` 注入記憶 |
| `auris-vue/src/views/ChatRoomView.vue` | 記憶抽屜 UI、state、CRUD 函式 |
| `auris-vue/src/views/SettingsView.vue` | 版號更新 P47 → P48 |

---

### P46: 對話長按選單復刻與 UX 優化 ✅
**日期**: 2026-05-23
**核心改動**:
1. **對話長按選單復刻與 Vue3 優化**：於 `ChatRoomView.vue` 加入長按手勢偵測（含桌面端滑鼠支援），重現舊版四大功能。並將「編輯」與「重新傳送」完美整合成「編輯並重傳」的無痛悔棋模式。
2. **Heart Voice 頻率調整**：於 `chatEngine.js` 中將保底間隔從 5 句延長為 15 句，且情緒關鍵字觸發附加 30% 機率，有效減少 Token 浪費並提升心聲驚喜感。
3. **動態按鈕文字**：優化 `MomentsView.vue`，生成按鈕會自動讀取選擇的角色名稱（例如：為傲嬌貓貓生成一則貼文）。
4. **Heart Voice 提示詞防呆**：修正 AI 產生「執行任務」的提示詞幻覺。

---

### P45: 架構統一與核心體驗修復 ✅
**日期**: 2026-05-23
**核心改動**:
1. **貼文留言回覆 503 錯誤修復**：全面捨棄舊版手動發送請求，改用新架構的 `sendLLMRequest` (來自 `api.js`)，合併為單一的 `user` 訊息，徹底解決代理伺服器解析失敗。
2. **iOS PWA 鍵盤白邊徹底修復**：修正 `App.vue` 與 `main.css` 寫法，遵守 `CLAUDE.md` 原則（`body` 加 `position: fixed` 防 iOS 偷捲 `visualViewport`）。
3. **初始登入 (Onboarding) 增加模型選擇**：在註冊流程第一步（設定 API 金鑰）加入模型下拉選單，與服務商連動，確保初始設定的完整性。

**日期**: 2026-05-22
**版本**: v1.0.42

#### 功能優化與修復
- **夢境頁面雙月亮**：`DreamView.vue` 空狀態同時顯示 hero 月亮（頁首裝飾）與 `bb-empty-ic` 月亮，移除後者，只保留頁首月亮。
- **貼文留言回覆靜默失敗**：`contentEngine.js` 的 `generateCommentReply` 將 API 錯誤完全吞掉，使用者看到打字中提示後卻無回覆。補上 `window.toast_` 錯誤回饋：失敗顯示「留言回覆失敗：...」，API 回傳空字串顯示「角色暫時沒有回應」。
- **輸入區與鍵盤之間的白色空白**：根本原因是 PWA 模式下 `.phone` 用 `min-height: 100dvh`，`App.vue` 動態加上的 `paddingBottom: keyboardOffset` 只會讓容器往下生長而非縮短內容區。改為 `height: 100dvh; box-sizing: border-box`，padding 才能正確縮短 flex 子元素 `.screen` 的高度，讓輸入框貼住鍵盤。
- **群組聊天只有單一角色回覆**：`GroupRoomView.vue` `sendMsg()` 原先隨機選一個角色回覆。改為：無 @點名時全員依隨機順序依序回覆，各角色間有 800–2000ms 自然延遲；有 @點名時只有被點名的角色回覆。

#### 受影響檔案
| 檔案 | 變動說明 |
|------|----------|
| `auris-vue/src/views/DreamView.vue` | 移除空狀態重複月亮圖示 |
| `auris-vue/src/services/contentEngine.js` | `generateCommentReply` 加入錯誤 toast |
| `auris-vue/src/assets/main.css` | `.phone` 改用 `height: 100dvh`，`body` 同步改為 `height` |
| `auris-vue/src/views/GroupRoomView.vue` | `sendMsg()` 改為全員依序回覆 |
| `auris-vue/src/views/SettingsView.vue` | 版號更新至 v1.0.42 |

---

### P42: Bug 修復 — 月亮位置、iOS 鍵盤空白根治、留言回覆 ✅
**日期**: 2026-05-22
**版本**: v0.43

#### 功能優化與修復
- **夢境月亮位置錯誤**：移除獨立的 `dream-hero` 月亮 hero 區塊，改將月亮圖示放入空狀態 `bb-empty-ic`，使月亮直接在「還沒有夢境紀錄」正上方，符合設計語意。
- **iOS PWA 鍵盤空白（根治）**：前一版用 `paddingBottom` 縮短 `.phone` 內容區的方式，在 iOS 上仍會因為系統主動捲動 `visualViewport` 造成整個 App 往上偏移、露出大片黑底。根本修法：PWA 媒體查詢的 `body` 加入 `position: fixed; width: 100%`，阻止 iOS 偷偷捲動 viewport；移除 `App.vue` 的 `paddingBottom` inline style；並在 `App.vue` `focusin` 監聽器裡於鍵盤動畫結束後（300ms）主動呼叫 `scrollIntoView`，確保輸入框可見。
- **貼文留言回覆無法生成（根治）**：前一版只補了錯誤 toast，但根本原因是 `generateCommentReply` 用獨立的 `fetchWithTimeout` 直接解析 API Response，解析路徑與實際格式不符導致永遠拿到空字串。改為使用 `sendLLMRequest`（與聊天功能相同的統一入口），解析邏輯完全一致，確保回覆正常生成。
- **修正預設 model 名稱錯誤**：`contentEngine.js` 的 OpenAI 預設 model 從不存在的 `gpt-5.4-mini` 修正為 `gpt-4o-mini`。

#### 受影響檔案
| 檔案 | 變動說明 |
|------|----------|
| `auris-vue/src/views/DreamView.vue` | 移除 `dream-hero`，月亮移入空狀態 `bb-empty-ic` |
| `auris-vue/src/services/contentEngine.js` | `generateCommentReply` 改用 `sendLLMRequest`；修正預設 model |
| `auris-vue/src/assets/main.css` | PWA body 加 `position: fixed; width: 100%` |
| `auris-vue/src/App.vue` | 移除 `paddingBottom` inline style；加 `focusin` scrollIntoView |
| `auris-vue/src/views/SettingsView.vue` | 版號更新至 v0.43 |

### P44: 根治貼文留言回覆無法生成 ✅
**日期**: 2026-05-22
**版本**: v0.45

#### 根本原因分析
`generateCommentReply` 是整個 codebase 唯一使用 `sendLLMRequest` 包裝層的函式。所有其他成功運作的函式（生成貼文、日記、夢境、聊天回覆、群組回覆）全部直接使用 `fetchWithTimeout`。`sendLLMRequest` 有兩個致命缺陷：
1. **不處理 Proxy Array 格式錯誤**：部分 Proxy 回傳 `[{"error":...}]` 陣列格式，`sendLLMRequest` 用 `data.error?.message` 讀不到（陣列沒有 `.error` 屬性），造成錯誤資訊丟失，顯示 `HTTP Error 503`。
2. **嚴格屬性存取**：`data.choices[0].message.content` 沒有 optional chaining，一旦 Proxy 回傳非標準格式就直接 crash。

#### 修法
完全移除 `sendLLMRequest`，改為與 `generatePost`、`generateDiary`、`generateDream` 完全一致的 `fetchWithTimeout` 直接呼叫模式。新增 Array 格式錯誤偵測（`Array.isArray(d) ? d[0]?.error : d.error`）與 optional chaining 保護。

#### 受影響檔案
| 檔案 | 變動說明 |
|------|----------|
| `auris-vue/src/services/contentEngine.js` | `generateCommentReply` 改用 `fetchWithTimeout` 直接呼叫，與其他生成函式模式一致 |
| `auris-vue/src/views/SettingsView.vue` | 版號更新至 v0.45 |

---

### P43: API 模型列表更新 + 自訂模型 ID 支援 ✅
**日期**: 2026-05-22
**版本**: v0.44

#### 功能優化
- **API 模型列表更新至最新（官方查證 2026-05-22）**：更新 `ApiView.vue` 的 MODELS 物件，對齊三家服務商最新已知模型：OpenAI（gpt-5.5, gpt-5.4, gpt-5.4-mini, gpt-5.4-nano, gpt-4o, gpt-4o-mini）、Anthropic（claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5-20251001）、Google（gemini-3.5-flash, gemini-3.1-flash-lite, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite）。
- **自訂模型 ID 支援**：模型列表底部新增「自訂模型」選項，選取後顯示文字輸入框，使用者可直接輸入代理伺服器或其他非列表中的模型 ID。`onMounted` 時若已儲存的 model ID 不在當前列表中，自動切換至自訂模式並填入。`saveApi` 儲存時使用自訂 ID；若選擇自訂但未填寫，阻止儲存並提示。

#### 受影響檔案
| 檔案 | 變動說明 |
|------|----------|
| `auris-vue/src/views/ApiView.vue` | 更新模型列表、新增自訂模型 UI 與邏輯 |
| `auris-vue/src/views/SettingsView.vue` | 版號更新至 v0.44 |

---

## 📁 檔案結構

```
專案根目錄（/Desktop/AI測試/auris-app/）
├─ auris-p36-bugfix.html        HTML 單檔終態版本（P36，5,489 行）
├─ auris-progress-update-P34-P36.md
├─ Auris 完整開發進度總覽.ini   ← 本文件
└─ auris-vue/                   Vue 3 重構版（P37 起，正式版）
   ├─ index.html
   ├─ public/
   │  └─ 404.html               SPA Redirect 處理
   ├─ vite.config.js
   ├─ package.json
   ├─ src/
   │  ├─ App.vue
   │  ├─ main.js
   │  ├─ assets/main.css       CSS Variables + 全域樣式
   │  ├─ router/index.js       21 條路由
   │  ├─ store/index.js        全局狀態
   │  ├─ services/
   │  │  ├─ db.js
   │  │  ├─ api.js
   │  │  └─ contentEngine.js
   │  ├─ components/
   │  │  └─ BottomNav.vue
   │  └─ views/（21 個 View）
   └─ dist/                    建置輸出
```

**GitHub 部署**:
```
https://github.com/Sabine630/auris-app/
├─ auris-vue/               Vue 3 原始碼（main 分支）
├─ .github/workflows/       自動建置 + 部署至 GitHub Pages
└─ 線上網址: https://sabine630.github.io/auris-app/
```

---

## 📈 功能完成度統計

### 已完成功能 (約 92%)

| 模組 | 完成度 | 說明 |
|------|--------|------|
| 核心聊天系統 | 100% | ✅ 完整（Vue 版） |
| 角色管理系統 | 100% | ✅ 完整（Vue 版） |
| API 整合 | 100% | ✅ 三大服務商，模型最新 |
| 社群功能 | 100% | ✅ 貼文/留言（Vue 版） |
| 生活記錄 | 100% | ✅ 日記/夢境/黑盒子（Vue 版） |
| 通知系統 | 100% | ✅ 完整（Vue 版） |
| 群組聊天 | 100% | ✅ 完整（Vue 版） |
| 資料管理 | 100% | ✅ 匯出/匯入（Vue 版） |
| 主題系統 | 100% | ✅ 6 大主題 |
| PWA 基礎 | 100% | ✅ 可加入主畫面 |
| PWA UI 適配 | 95% | ✅ iOS 鍵盤/底部空隙已解決 |
| Vue 架構重構 | 100% | ✅ P37 全面遷移完成 |
| 新手引導 | 100% | ✅ Onboarding 4 步驟（Vue 新增） |

### 已知問題

| 問題 | 狀態 | 解決方案 |
|------|------|----------|
| ~~iPhone PWA 底部空隙~~ | ✅ P28 已解決 | pad vars 方案 |
| ~~聊天訊息被截斷（長篇）~~ | ✅ P33 已解決 | regex 擴充 |
| ~~Heart Voice 變成續寫故事~~ | ✅ P33 已解決 | prompt + max_tokens |
| ~~貼文/日記/夢境生成無反應~~ | ✅ P33 已解決 | Gemini 相容性修復 |
| ~~群組點名角色不回應~~ | ✅ P34 已解決 | 點名偵測 + 強制回應 |
| ~~貼文留言區下方空白~~ | ✅ P34 已解決 | flex 直欄佈局 |
| ~~iOS 鍵盤拉起空白~~ | ✅ P35 已解決 | 鍵盤拉起隱藏 nav |
| ~~群組角色自編對話~~ | ✅ P35/P36 已解決 | 保守清洗 + 保險絲 |
| ~~Vue 版 modal 無樣式~~ | ✅ P38 已解決 | 補齊 modal CSS |
| ~~底部 對話 tab 導向錯誤~~ | ✅ P38 已解決 | /chat → /chat-list |
| ~~API 模型清單過舊~~ | ✅ P38 已解決 | 更新至 GPT-5.x / Claude 4.x / Gemini 2.5 |
| ~~未讀計數不精確~~ | ✅ P12 已修復 | - |
| ~~函數命名衝突~~ | ✅ P12-bugfix 已修復 | - |
| ~~Heart Voice 每次都觸發~~ | ✅ P12-bugfix 已重設計 | - |
| ~~GitHub Pages 重新載入 404~~ | ✅ P39 已解決 | 404.html redirect |
| ~~AI 內容太短~~ | ✅ P39 已解決 | prompt + max_tokens 提升 |
| ~~群組 typing 無訊息~~ | ✅ P39 已解決 | Regex escape + 重試機制 |
| ~~貼文回覆失效~~ | ✅ P39 已解決 | Anthropic system prompt |
| ~~不能刪除角色~~ | ✅ P39 已解決 | 新增刪除功能與關聯清理 |
| ~~群組不能編輯~~ | ✅ P39 已解決 | 新增修改名稱與成員功能 |
| ~~聊天 ... 按鈕無選項~~ | ✅ P39 已解決 | 改為選單支援匯出與清除 |
| ~~夢境頁面雙月亮~~ | ✅ P41 已解決 | 移除空狀態重複圖示 |
| ~~貼文留言回覆靜默失敗~~ | ✅ P41 已解決 | 加入錯誤 toast 回饋 |
| ~~鍵盤拉起輸入區與鍵盤間白色空白~~ | ✅ P41 已解決 | `.phone` 改用 `height: 100dvh` |
| ~~群組聊天只有單一角色回覆~~ | ✅ P41 已解決 | 全員依序回覆機制 |

---

### Phase 4: 進階功能 (計劃中)

**預計開發時間**: 2-3 個月

#### 1. 定位系統 📍
```javascript
功能設計:
- 角色地點記錄
- 地圖顯示（可能用 Leaflet.js）
- 時間軸記錄
- 地點標籤

資料結構:
location = {
  id, charId, place, lat, lng, 
  note, timestamp
}
```

#### 2. 劇本體驗 🎭
```javascript
功能設計:
- 互動式故事
- 選項分支
- AI 動態生成劇情
- 結局系統

資料結構:
script = {
  id, title, charIds, 
  nodes: [{id, content, choices}],
  progress
}
```

#### 3. 小說模式 📚
```javascript
功能設計:
- 長篇協作創作
- 章節管理
- AI 輔助續寫
- 角色視角切換

資料結構:
novel = {
  id, title, charIds,
  chapters: [{id, title, content, author}],
  createdAt, updatedAt
}
```

#### 4. 線下模式 🎮
```javascript
功能設計:
- IF (Interactive Fiction) 分支敘事
- 不依賴 AI，純劇本模式
- 存檔/讀檔系統
- 成就系統

資料結構:
ifGame = {
  id, title, script,
  saves: [{id, nodeId, choices, timestamp}]
}
```

#### 5. 寵物屋 🐾
```javascript
功能設計:
- 虛擬寵物系統
- 餵食/互動
- 寵物日記
- 與角色互動

資料結構:
pet = {
  id, name, type, avatar,
  hunger, happiness, health,
  diary: [{content, timestamp}]
}
```

#### 6. 任務系統 ✓
```javascript
功能設計:
- 每日任務
- 成就系統
- 獎勵機制
- 進度追蹤

資料結構:
quest = {
  id, type, title, desc,
  progress, target, completed,
  reward
}
```

---

### Phase 5: 多世界模式 (設計階段)

**預計開發時間**: 1-2 個月

#### 1. 多世界系統 🌍
```javascript
功能設計:
- 世界切換器
- 每個世界獨立資料
- 世界間複製角色
- 世界設定檔

資料結構:
world = {
  id, name, desc, icon,
  theme, createdAt
}

// IndexedDB 改造
worldId 作為所有資料的索引鍵
characters: {worldId, ...}
messages: {worldId, ...}
```

#### 2. 世界書 📖
```javascript
功能設計:
- 世界觀設定文件
- 歷史事件記錄
- 地點/物品/組織資料庫
- AI 參考世界書生成對話

資料結構:
worldBook = {
  id, worldId,
  entries: [{
    type: 'location' | 'item' | 'event',
    name, desc, tags
  }]
}
```

#### 3. 跨世界互動
```javascript
功能設計:
- 角色在世界間傳送門
- 不同世界的角色見面
- 跨世界群組聊天
- 平行世界劇情

技術挑戰:
- 資料同步
- 角色狀態管理
- 記憶隔離/共享
```

#### 4. 世界模板
```javascript
預設模板:
- 現代都市
- 奇幻世界
- 科幻未來
- 古代宮廷
- 校園青春

用戶可自訂世界模板並分享
```

---

## 🎨 技術棧詳細

### 前端技術
```javascript
框架: Vue 3.5（Composition API + <script setup>）
  - P37 起從 Vanilla JS 遷移
  - 單檔元件（SFC）架構
  - 聲明式渲染取代原生 DOM 操作

路由: Vue Router 4
  - 21 條路由（對應 21 個 View）
  - 歷史模式（createWebHistory）
  - 頁面切換 fade 動畫

建置工具: Vite 8
  - 極速 HMR 開發
  - 生產建置至 dist/

狀態管理: globalStore（Pinia-style 自製）
  - characters、theme、keyboardOffset

CSS:
  - CSS Variables（主題系統，6 大主題）
  - Flexbox + Grid
  - CSS Animations（slideUp、fadeIn）
  - Backdrop Filter（模糊玻璃效果）
  - safe-area-inset（iPhone 劉海/底部適配）
```

### 資料管理
```javascript
IndexedDB:
  - 版本: v3 (最新)
  - 資料表: 9 個
  - 索引: charId, groupId, date 等
  - 事務處理: read/write

localStorage:
  - 用途: 小型設定儲存
  - 項目: 
    - auris_ob_done (新手導覽完成)
    - auris_notif_read (通知已讀列表)
    - auris_local (密碼驗證)

sessionStorage:
  - 用途: 單次工作階段
  - 項目: au (密碼驗證狀態)
```

### API 整合
```javascript
支援格式: OpenAI Compatible API
  - Content-Type: application/json
  - Authorization: Bearer {API_KEY}
  
請求結構:
{
  model: 'gpt-5.5',
  max_tokens: 600,        // 聊天：600；日記/夢境/貼文：800
  temperature: 0.8,
  messages: [
    {role: 'system', content: '...'},
    {role: 'user', content: '...'}
  ]
}

// Anthropic 需額外帶：
// 'x-api-key': API_KEY
// 'anthropic-version': '2023-06-01'

回應處理:
- 串流支援: ✅ (P47 已實作，SSE 解析，三大 provider 相容)
- 錯誤處理: ✅
- 重試機制: ❌ (未實作)
```

### PWA 技術
```javascript
已實作:
- ✅ Manifest.json (動態生成)
- ✅ Apple Touch Icon (Canvas 生成)
- ✅ Theme Color
- ✅ Display: standalone
- ✅ Viewport: viewport-fit=cover

未實作:
- ⏳ Service Worker
- ⏳ 離線支援
- ⏳ 推送通知
- ⏳ 背景同步
```

### 部署架構
```
開發環境:
  - Claude (輔助開發)
  - 本地檔案系統

版本控制:
  - Git + GitHub
  - Repository: sabine630/auris-app
  - Branch: main

部署平台:
  - GitHub Pages（Production）：main 分支，手動 build + push
  - Vercel（Staging）：dev 分支，推送後自動部署

開發流程:
  - 新功能開發 → 推 dev → Vercel 自動部署測試版
  - 測試通過 → build → 推 main → GitHub Pages 更新正式版

線上網址:
  - 正式版: https://sabine630.github.io/auris-app/
  - 測試版: https://auris-app-git-dev-sabine630-6243s-projects.vercel.app
  - 均支援 HTTPS 與 PWA 安裝
```

---

## 📊 程式碼統計

### 檔案結構
```
auris-p12-bugfix.html (單一 HTML 檔案)
├─ HTML (約 1,200 行)
│  ├─ Meta Tags
│  ├─ SVG Icons
│  └─ Page Templates (15+ 頁面)
│
├─ CSS (約 1,450 行)
│  ├─ Theme Variables (150 行)
│  ├─ Components (820 行)
│  ├─ Responsive (200 行)
│  └─ PWA Overrides (250 行)
│
└─ JavaScript (約 1,980 行)
   ├─ 資料庫操作 (200 行)
   ├─ 頁面導航 (160 行)
   ├─ 角色管理 (400 行)
   ├─ 聊天系統 (520 行)
   ├─ API 整合 (320 行)
   ├─ 社群功能 (200 行)
   ├─ Heart Voice (80 行)
   └─ 工具函數 (150 行)

總行數: 約 4,634 行
```

### 複雜度分析
```javascript
函數總數: 約 125 個
平均函數長度: 15 行
最長函數: renderCharList() (約 80 行)
最複雜函數: sendMsg() (API 呼叫 + 多重邏輯)

資料表索引:
- characters: 1 primary key, 1 index (worldId)
- messages: 1 primary key, 2 indexes (charId, createdAt)
- moments: 1 primary key, 2 indexes (charId, createdAt)
- diary: 1 primary key, 2 indexes (charId, date)

最大資料量估算:
- 100 個角色
- 每個角色 1000 條訊息
- 總計: 100,000 條記錄
- 估計大小: 10-20 MB
```

---

## 🔗 重要參考網址

### 官方文件
| 服務 | 網址 | 說明 |
|------|------|------|
| OpenAI API | https://platform.openai.com/docs | API 文件 |
| OpenAI Models | https://platform.openai.com/docs/models | 模型列表 |
| Anthropic API | https://docs.anthropic.com/claude/reference/getting-started-with-the-api | Claude API |
| Anthropic Console | https://console.anthropic.com | API Key 管理 |
| Google AI Studio | https://aistudio.google.com | Gemini API |
| Google Gemini Docs | https://ai.google.dev/docs | Gemini 文件 |

### 開發工具
| 工具 | 網址 | 說明 |
|------|------|------|
| MDN Web Docs | https://developer.mozilla.org | Web 標準文件 |
| Can I Use | https://caniuse.com | 瀏覽器相容性 |
| IndexedDB API | https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API | 資料庫文件 |
| PWA Builder | https://www.pwabuilder.com | PWA 工具 |

### 社群資源
| 資源 | 網址 | 說明 |
|------|------|------|
| GitHub Repo | https://github.com/sabine630/auris-app | 專案原始碼 |
| GitHub Pages | https://docs.github.com/pages | 部署文件 |

---

## 📝 開發日誌

### 2025-12
- 啟動專案
- 完成 P1-P9 核心功能

### 2026-01
- 角色系統完善
- API 整合測試

### 2026-02
- 聊天系統上線
- 群組功能完成

### 2026-03
- 社群功能開發
- 生活記錄系統

### 2026-04
- Phase 1 完結
- 開始 Bug 修復階段
- P10-P11 修復與優化

### 2026-05
- P12-P18 持續優化
- iPhone PWA 底部空隙問題診斷，多次嘗試未完全解決
- **2026-05-10**：P12-bugfix
  - 修復 10 個 Bug（4 嚴重 / 5 中等 / 1 小問題）
  - Heart Voice 觸發機制重設計（智慧觸發 + 聊天室內即時顯示）
  - 全面升級 Prompt 品質（聊天 / 貼文 / 日記 / 夢境）
  - max_tokens 調整：貼文 / 日記 / 夢境 → 800
  - 列入待做：聊天室 Streaming 串流輸出
- **P19-P27**（內容不詳，未紀錄）
- **2026-05-15**：P28（推估）
  - PWA 底部空隙最終解決（pad vars 方案）
  - `--kb-offset` CSS 變數 + `visualViewport` 動態追蹤
- **P29-P31**（內容不詳，未紀錄）
- **2026-05-17**：P32
  - 鍵盤再修、複製同步化
  - sendMsg 引入動態 max_tokens（長篇 8000 / 一般 2000）
  - 貼文按鈕重構（needPick 機制）
- **2026-05-18 ~ 2026-05-19**：P33
  - Bug 1：長篇 regex 擴充（中文數字、口語動詞、更多載體）
  - Bug 2：Heart Voice 收緊（max_tokens 80、prompt 30 字、截斷找句尾）
  - Bug 3：**Gemini 相容性修復**——移除生成系列對 OpenAI 不相容端點的 `frequency_penalty` / `presence_penalty` 參數
  - 配套：toast 加長、靜默 return → 可見 toast、進頁面主動解鎖、fetchWithTimeout
  - 由瀏覽器版 Claude 在 Network panel 抓到 HTTP 400 完成偵錯

---

---

## 💾 備份與版本管理

### 版本命名規則
```
格式: auris-p{版本號}-{功能描述}.html

範例:
- auris-p11-chatlist.html       (聊天列表優化)
- auris-p12-fixes.html          (未讀計數精確化)
- auris-p12-bugfix.html         (全面 Bug 修復)
- auris-p18-fixed-bottom.html   (底部修復嘗試)
```

### 備份策略
```
本地開發:
  位置: /mnt/user-data/outputs/
  頻率: 每個版本一次
  保留: 全部檔案

線上版本:
  位置: GitHub Repository
  頻率: 功能完成後推送
  保留: Git 歷史記錄

重要里程碑:
  - P11: Phase 1 完整版 (基準線)
  - P12-bugfix: Bug 全面修復版 (當前)
```
```

### Git 提交訊息格式
```
類型: 簡短描述

詳細說明（可選）

範例:
feat: 新增聊天列表搜尋功能

- 即時篩選角色名稱
- 支援對話內容搜尋
- 優化搜尋性能
```

---

## 📄 授權與聲明

### 專案資訊
```
專案名稱: Auris
作者: Sabine
開發時間: 2025-12 ~ 至今
版本: Phase 2 (P12-bugfix)
```

### 第三方資源
```
字體:
- Outfit (Google Fonts)
- Cormorant Garamond (Google Fonts)
授權: Open Font License

Icons:
- 原生 SVG (自繪)
授權: 無版權問題

API 服務:
- OpenAI (付費服務)
- Anthropic (付費服務)
- Google AI (付費/免費額度)
```

### 隱私聲明
```
資料儲存:
- 所有資料存於用戶本地裝置
- 使用 IndexedDB + localStorage
- 無伺服器上傳

API 使用:
- API Key 由用戶自行提供
- 不經過中間伺服器
- 直接呼叫官方 API

資料安全:
- 密碼鎖保護
- 資料匯出功能
- 無第三方追蹤
```

---

## 📞 聯絡資訊

### 專案相關
- **GitHub**: https://github.com/sabine630/auris-app
- **Issues**: https://github.com/sabine630/auris-app/issues
- **線上版本**: https://sabine630.github.io/auris-app/

### 開發者
- **作者**: Sabine
- **開發助手**: Claude (Anthropic)

---

## 🎉 致謝

感謝以下資源與服務：

### AI 服務提供商
- **OpenAI** - GPT 系列模型
- **Anthropic** - Claude 系列模型
- **Google** - Gemini 系列模型

### 開發工具
- **GitHub** - 版本控制與部署
- **Claude** - 開發輔助與 Debug
- **Google Fonts** - 字體服務

### 靈感來源
- Character.AI - 角色聊天概念
- Replika - AI 陪伴應用
- Discord - UI/UX 參考

---

**文件版本**: 1.1  
**最後更新**: 2026-05-10  
**下次更新**: Streaming 實作完成時

---

## 附錄: 快速除錯檢查表

### PWA 底部空隙問題除錯
```bash
# 1. 確認線上版本
curl -sL "https://sabine630.github.io/auris-app/" | grep "position:fixed"

# 2. 清除手機快取
- 刪除主畫面 App
- Safari 設定 → 清除歷史記錄
- 重新加入主畫面

# 3. 版本號測試
?v=18
?cache=bust&t={timestamp}

# 4. 檢查 computed styles
Safari 開發者工具 → Elements → Computed
確認 padding-bottom 實際值

# 5. 檢查 safe-area-inset
console.log(
  getComputedStyle(document.documentElement)
    .getPropertyValue('--sab')
);
```

### 常見問題排查
```javascript
// Q1: API 無法連線
→ 檢查 API Key 是否正確
→ 測試連線功能
→ 查看 Console 錯誤訊息

// Q2: 資料消失
→ 檢查 IndexedDB (開發者工具 → Application)
→ 確認版本號是否正確
→ 嘗試匯入備份

// Q3: 樣式錯亂
→ 清除快取
→ 檢查主題設定
→ 確認 CSS Variables 載入

// Q4: PWA 無法安裝
→ 確認 HTTPS
→ 檢查 manifest.json
→ 查看 Console 警告
```

---

**🎯 專案目標**: 打造最自然、最有溫度的 AI 角色聊天體驗

**💪 開發信念**: 細節決定體驗，體驗決定情感連結

**🚀 持續前進**: Phase 3, 4 即將到來！
