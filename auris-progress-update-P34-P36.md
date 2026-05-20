# 📝 進度文件增補：P34 ~ P36

> **用法**：把這份內容貼到 `____Auris_完整開發進度總覽.md` 的 P33 段落之後（約第 974 行 `---` 那條分隔線前面），  
> 並順手把文件最上方的「最後更新」「當前版本」欄位改成下面新的值。

---

## 🔝 文件頭部修改

把開頭三行改成：

```
**最後更新**: 2026-05-20  
**當前版本**: P36（群組點名修正 + 貼文留言釘底 + 清洗保險絲）  
**狀態**: 持續優化中
```

---

## ✅ P34: 群組點名 + 貼文留言區佈局修復（部分）

**日期**: 2026-05-19  
**檔案**: `auris-p34-bugfix.html`

### Bug 1：群組裡點名某角色，那個角色卻不回應

**症狀**：在「動物園」群組（傲嬌貓貓、暖心拉拉）裡，使用者送「貓貓要吃什麼？」，結果只有拉拉開口，貓貓沉默。

**根因**：`sendGroupMsg` 雖然把每個角色都跑一遍迴圈，但 sysPrompt 完全沒告訴 AI「使用者剛剛點名了你」。從貓貓的視角看到的 prompt 只是「群組裡有人說了一句話」，加上原本鼓勵語「可以回應其他人說的內容」，更容易讓被點名的角色觀望、讓話多型角色搶話。

**修法**：
```javascript
// 1. 偵測使用者訊息有沒有點名某個角色
const mentionedIds = new Set();
for(const c of validChars){
  if(c.name && content.includes(c.name)) mentionedIds.add(c.id);
}

// 2. 重排回應順序，被點名的優先
const orderedChars = [
  ...validChars.filter(c => mentionedIds.has(c.id)),
  ...validChars.filter(c => !mentionedIds.has(c.id))
];

// 3. 被點名一定回，不走 70% 機率
const willReply = isMentioned || validChars.length<=2 || Math.random()>0.3;

// 4. sysPrompt 多塞一段
const mentionHint = isMentioned
  ? `\n⚠️ 注意：使用者在訊息裡直接點名了你（${c.name}），請務必正面回應，不要躲在其他人後面。`
  : '';
```

### Bug 2：貼文詳情頁，留言輸入框下方有大片空白

**症狀**：在貼文詳情頁，沒留言時整頁很短，但底部的「留個言…」輸入列下方距離底部選單（首頁/聊天/貼文/我的）之間留出一大塊空白。

**根因**：`#pg-post-detail` 是 `position:absolute; inset:0; overflow-y:auto` 的標準 page。`.post-comment-bar` 寫了 `position:sticky; bottom:0`，但 sticky 要黏底必須整個容器有足夠內容可以滾動。內容短時，sticky bar 黏在「內容自然結尾」的位置而不是「viewport 底部」，下方就空出一大塊。

**修法**：仿照 `#pg-chat-room` 改成 flex 直欄：
```html
<div class="page" id="pg-post-detail" style="display:flex;flex-direction:column">
  <div class="ph">…</div>
  <div id="post-detail-content" style="flex:1;overflow-y:auto"></div>
  <div class="post-comment-bar">
    <textarea class="post-comment-in" rows="1" oninput="autoResize(this)"></textarea>
    …
  </div>
</div>
```

順手把 `<input>` 換成 `<textarea>` 支援多行（max-height:100px，超過就在輸入框內部捲動）。

---

## ✅ P35: 鍵盤拉起隱藏 nav + 群組角色越界修復（過度清洗，引發 P36）

**日期**: 2026-05-20（上午）  
**檔案**: `auris-p35-bugfix.html`

### Bug 1（接續 P34 Bug 2）：iOS 鍵盤拉起時，輸入框下方還是有大塊空白

**症狀**：P34 把貼文詳情頁改成 flex 後，桌面測試 OK，但實機 iOS 上一點輸入框，鍵盤拉起後輸入框上方還是空一大塊，後面才看到底部 nav。

**根因**：iOS 鍵盤上方還有「上一個 / 下一個 / 打勾」這條鍵盤協助列，加上 `.nav`（首頁/聊天/貼文/我的）本身的 80px。專案原本用 `padding-bottom:var(--kb-offset)` 想把 `.phone` 整個縮，但在某些 iOS 版本不夠靈敏，再加上 nav 本來就還在，所以才看到那塊大空白。

**修法**：iOS app 的標準做法——**鍵盤拉起時直接隱藏底部 tab bar**（LINE、Instagram、Threads 都這樣）。

```css
.nav{ transition: height .2s ease; }
.nav.kb-hidden{
  height: 0;
  padding: 0;
  border: none;
  overflow: hidden;
}
.nav.kb-hidden .ni{ opacity: 0; pointer-events: none; }
```

```javascript
function setupViewportTracking(){
  const nav = document.querySelector('.nav');
  const updateKB = () => {
    const kbOffset = Math.max(0, layoutH - visualH - offsetTop);
    if(nav){
      if(kbOffset > 80) nav.classList.add('kb-hidden');
      else nav.classList.remove('kb-hidden');
    }
  };
  // 雙重保險：visualViewport 不靈敏時，focusin/focusout 也切
  document.addEventListener('focusin', e => {
    if(['INPUT','TEXTAREA'].includes(e.target?.tagName) && e.target.id!=='lock-in'){
      nav?.classList.add('kb-hidden');
    }
  });
  document.addEventListener('focusout', e => {
    setTimeout(() => {
      const active = document.activeElement;
      if(!active || !['INPUT','TEXTAREA'].includes(active.tagName)){
        nav?.classList.remove('kb-hidden');
      }
    }, 100);
  });
}
```

同時移除 `padding-bottom:var(--kb-offset)`（會跟 nav 隱藏衝突）。

### Bug 2：群組裡角色幫使用者說話（自編對話）

**症狀**：群組對話，AI 回覆裡直接出現「使用者：拉拉喜歡吃什麼呀？」這種「角色名稱：內容」的前綴混進來，看起來就像角色幫使用者代言。

**根因**：`recentHistory` 餵歷史時用了 `${me.name||'你'}：${m.content}` 這種格式。AI 看到所有歷史都長這樣，**把「角色名：內容」當成輸出範本**，自然在回覆裡仿造，甚至演完自己後接著演使用者。

**修法（三層防禦）**：

1. **改寫歷史格式**：user 訊息直接給原文不加前綴；其他角色說過的話包裝成「（XX 剛剛說：xxx）」的對話描述格式，而不是「XX：xxx」
2. **強化 prompt 禁令**：列出 4 條【絕對禁止】，禁止名字前綴、禁止幫使用者說話、禁止輸出多角色對話片段
3. **輸出後做清洗**（事後最後一道防線）

**踩到的坑**：P35 的清洗邏輯太兇——只要 AI 輸出裡出現「角色名：」字串，無論在哪裡都從那裡截斷。這在以下情境會誤殺：

- AI 自然回應「拉拉：你呢？想吃什麼」（單行內的合理對話） → 整段被砍光
- 使用者沒設名字，fallback `'使用者'`，AI 叫使用者「使用者：xxx」也被砍光

結果線上看到「兩個角色都跑 typing 動畫，但結束後一條訊息都沒出來」——就是 AI 真的有產出，被清洗成空字串而已。引發 P36 緊急修復。

---

## ✅ P36: 群組清洗邏輯過度誤殺修復

**日期**: 2026-05-20（下午）  
**檔案**: `auris-p36-bugfix.html`

### Bug：群組回應跑完 typing 動畫，卻沒有任何訊息顯示出來

**症狀**：在群組裡發訊息，角色 A 顯示「輸入中」→ 角色 B 顯示「輸入中」→ 結束，但畫面上看不到任何新訊息。

**根因**：P35 加進去的「輸出清洗」邏輯太兇，把以下兩種情況的回覆全部砍成空字串：

| AI 輸出 | P35 清洗結果 | 期望結果 |
|---------|-------------|---------|
| `拉拉：你呢？想吃什麼` | `""`（被砍光） | `拉拉：你呢？想吃什麼` |
| `使用者：你決定吧`（me.name 為空） | `""`（被砍光） | `使用者：你決定吧` |

P35 的判斷標準是「`indexOf('角色名：') >= 0` 就從那裡截斷」——這個條件太寬，根本無法區分「AI 自然回應對方」跟「AI 失控自編對話」。

### 解法

清洗邏輯改保守版，並加保險絲：

```javascript
const rawText = aiText.trim();
let cleaned = rawText;

// 1) 只砍最開頭的「自己名字：」前綴
const selfPrefix = new RegExp('^[「『\\s]*' + escape(c.name) + '[」』]?\\s*[：:]\\s*', '');
cleaned = cleaned.replace(selfPrefix, '');

// 2) 只在「換行 + 其他角色/使用者名：」出現時截斷
//    （這才是「AI 開始自編對話」的特徵，單行內含「XX：」不算）
const cutNames = [me.name||'使用者', '使用者', '你', ...otherCharNames];
let cutAt = cleaned.length;
for(const n of cutNames){
  const re = new RegExp('\\n\\s*' + escape(n) + '\\s*[：:]');
  const m = cleaned.match(re);
  if(m && m.index < cutAt) cutAt = m.index;
}
cleaned = cleaned.substring(0, cutAt).trim();

// 3) 保險絲：清洗後為空就 fallback 回原始輸出
const final = cleaned || rawText;
```

### 學到的教訓

P35 的核心錯誤是「事後規則」設計太理想化，沒考慮 AI 自然生成內容裡會合理出現的「對方名字 + 冒號」（這在中文對話裡其實滿常見的，像「拉拉：你呢」「凱莉：你想吃什麼」）。

**通用原則**：對 LLM 輸出做事後清洗時：

1. **規則要極度保守**——寧可漏掉一些異常輸出，也別誤殺合法輸出
2. **要有保險絲**——清洗後變空字串時必須 fallback，避免「靜默吞掉」
3. **特徵要夠強**——「換行 + 名字 + 冒號」（多人對話切換）比「字串裡包含名字 + 冒號」（可能只是自然提及）強得多
4. **本機要先打測試案例**——尤其是「正常輸出」案例，不只測異常案例

P35→P36 這次 9 個測試案例全過，但這個習慣應該在 P35 就建立。

### Bug 修復對照表

| 問題 | 狀態 | 解決方案 |
|------|------|----------|
| ~~群組點名沒人理~~ | ✅ P34 已解決 | 偵測點名 + 強制回應 + prompt 提示 |
| ~~貼文留言區下方空白~~ | ✅ P34 已解決 | page 改 flex 直欄 |
| ~~iOS 鍵盤拉起仍有空白~~ | ✅ P35 已解決 | 鍵盤拉起時隱藏 .nav |
| ~~角色幫使用者說話~~ | ✅ P35/P36 已解決 | 改寫歷史格式 + prompt 禁令 + 保守清洗 |
| ~~群組訊息變空~~ | ✅ P36 已解決 | 清洗保險絲 + 規則收斂 |

---
