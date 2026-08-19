// 剝除模型「把思考／計畫當正文吐出來」的外洩內容（P137）。
//
// 與 thinkingFilter.js 的分工：那支只認 <thinking>…</thinking> 這種**有標籤**的思考區塊。
// 2026-08 實機（google / gemini-3.5-flash）出現的是另一種——模型完全不帶標籤，直接把
// 一整段自言自語當成回覆內容送進 choices[0].delta.content：
//
//   thought (System hint):現在時間：2026/8/13（星期四）清晨 07:27。
//   上一句使用者傳送了：「…」
//   我必須完全融入角色「沈星回」，…
//   我需要：
//   1. 寵溺地回應她的「早安」…
//   訊息 1：回應早安、偷親。撒嬌與寵溺。
//   第一則：
//   <真正要說的話>
//
// 這段文字沒有被任何一道防線接住：SSE 只讀 delta.content（llm.js），推理通道的欄位
// 根本不會進來，所以它是走「正文」進來的；thinkingFilter 找不到 `<` 開頭的標籤就整段放行。
// 落庫後更糟——splitReply 依空行切泡泡，思考佔掉前面的泡泡、真正的回覆被擠到最後一顆；
// 而且這些內容留在對話歷史裡，下一輪原封不動送回模型（chatEngine 的最近 memory 則），
// 模型照抄自己上次的格式，比例會從偶發滾成每則都洩漏（實機：1/29 → 6/6）。
//
// ── 安全性設計：只在「回覆一開頭就是思考」時才動手 ─────────────────────────
// 這類過濾最怕誤砍正常演出。因此**進場條件很嚴**：整段文字的第一個段落必須以下列
// 標記開頭才啟動，否則原字串一個字都不改。角色正常回覆不會以「thought (System hint):」
// 「回應要點：」「我必須融入角色」開場，這個閘門就是誤砍率的保險。
// 啟動後也只往下吃「連續的思考段落」，一碰到正文就停手，後面完全不動。

// 段落開頭即代表「這段是思考／計畫」。逐條都要夠具體，不能寫成寬鬆的通配。
const META_PARA_RES = [
  /^(?:thought|thinking|reasoning)s?\s*[（(]?\s*(?:system\s*hint)?\s*[)）]?\s*[:：]/i,
  /^[（(]?\s*system\s*hint\s*[)）]?\s*[:：]/i,
  /^系統提示\s*[:：]/,
  /^我(?:必須|得|要|應該)(?:完全)?(?:融入|進入|扮演好?)角色/,
  /^我(?:需要|應該|打算|可以)\s*[:：]/,
  /^(?:回應|回覆)(?:要點|重點|方向|策略|方式|規劃)\s*[:：]/,
  /^對話模擬\s*[:：]/,
  /^(?:思路|分析|草稿|計畫|規劃|步驟)\s*[:：]/,
  // 「我（沈星回）目前的狀態：」「我（沈星回）要怎麼回應：」
  /^我(?:[（(][^）)\n]{0,20}[）)])?\s*(?:目前的狀態|現在的狀態|要怎麼回應|該怎麼回應)\s*[:：]/,
];

// 草稿標號。模型會用它把「計畫」與「真正要說的話」隔開，因此它同時是**邊界**：
// 標號之前的都是思考，標號之後才是內容。
const LABEL_SRC = '(?:第\\s*[一二三四五六七八九十百\\d]{1,3}\\s*則|訊息\\s*[一二三四五六七八九十\\d]{1,3})';
const LABEL_RE = new RegExp(`${LABEL_SRC}\\s*[:：]`);
// 整行只有標號（下一行才是內容）→ 只刪這一行，內容留著
const LABEL_LINE_RE = new RegExp(`^\\s*(?:${LABEL_SRC}|對話模擬)\\s*[:：]\\s*$`);
// 標號後面同一行就接著文字 → 這是「計畫摘要」那種寫法（訊息 1：回應早安、偷親。）
const PLAN_LINE_RE = new RegExp(`^\\s*${LABEL_SRC}\\s*[:：]\\s*\\S`);
// 串流時尾端可能是還沒收完的標號，先扣住不放行
const PARTIAL_LABEL_RE = /(?:第\s*[一二三四五六七八九十百\d]{0,3}\s*則?|訊息\s*[一二三四五六七八九十\d]{0,3})\s*[:：]?\s*$/;

function isMetaPara(para) {
  const head = para.trimStart();
  if (!head) return false;
  return META_PARA_RES.some(re => re.test(head));
}

// 整段每一行都是「標號＋同行摘要」→ 這段是計畫清單，不是內容
function isPlanListPara(para) {
  const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.length > 0 && lines.every(l => PLAN_LINE_RE.test(l));
}

// 段落內剝掉只有標號的那幾行；標號後同行還有字的，只拿掉標號本身。
function dropLabels(para) {
  return para
    .split('\n')
    .filter(line => !LABEL_LINE_RE.test(line))
    .map(line => line.replace(new RegExp(`^\\s*${LABEL_SRC}\\s*[:：]\\s*`), ''))
    .join('\n');
}

// 開頭就是草稿標號（第二則：／訊息 2：）也算——這是「洩漏的回覆被 splitReply 切成
// 好幾顆泡泡」之後的第二顆起。落庫路徑上過濾的是切割前的全文，碰不到這種形狀；
// 但歷史側過濾拿到的就是一顆一顆的舊泡泡，這個閘門讓那些殘留也清得掉。
const LABEL_HEAD_RE = new RegExp(`^\\s*(?:${LABEL_SRC})\\s*[:：]`);

// 判斷用（給 llm.js 決定要不要標記 emptyReason='meta_leak'，也給測試直接驗閘門）。
export function looksLikeMetaLeak(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  const first = text.split(/\n{2,}/)[0];
  return isMetaPara(first) || LABEL_HEAD_RE.test(first.trimStart());
}

// 回傳剝乾淨的文字。整段都是思考時回傳空字串——由呼叫端走既有的「空回應」路徑
// （UI 提示重新生成），這比把模型的自言自語端到使用者面前好。
export function stripMetaLeak(text) {
  if (!looksLikeMetaLeak(text)) return text;

  const paras = text.split(/\n{2,}/);
  const kept = [];
  let i = 0;

  for (; i < paras.length; i++) {
    const para = paras[i];
    const head = para.trimStart();
    if (!isMetaPara(head) && !isPlanListPara(head)) break;   // 碰到正文 → 停手

    // 整段都是「訊息 1：摘要」的計畫清單：沒有正文夾在裡面，整段丟掉
    if (isPlanListPara(head)) continue;

    // 思考寫到一半直接接上「第一則：<真正的話>」——切在標號處，後半留著
    const m = head.match(LABEL_RE);
    if (m) {
      const rest = head.slice(m.index + m[0].length).replace(/^[ \t]*\n?/, '');
      if (rest.trim()) kept.push(rest);
      i++;
      break;
    }
  }

  return [...kept, ...paras.slice(i)]
    .map(dropLabels)
    .filter(p => p.trim())
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── 串流用 ────────────────────────────────────────────────────────────────
// 落庫端有 stripMetaLeak 就夠「存進去的是乾淨的」，但使用者會眼睜睜看著一大段自言自語
// 在畫面上逐字打出來、回覆結束才被換掉。這支負責讓那段從頭到尾都不要出現。
//
// 三個狀態：
//   sniff — 還在看開頭像不像思考（字數不夠就先屯著，屯到能判斷為止）
//   drop  — 確定是思考，整段吞掉，等草稿標號出現才切回 pass
//   pass  — 正常放行（仍逐行濾掉只有標號的那幾行）
const SNIFF_MIN = 24;

export function createMetaLeakStreamFilter(onChunk) {
  if (typeof onChunk !== 'function') return { push: () => {}, flush: () => {} };
  let mode = 'sniff';
  let buf = '';

  // pass 模式：整行才判斷，半行先扣著（可能是還沒收完的標號）
  function drainLines(final) {
    let out = '';
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx + 1);
      buf = buf.slice(idx + 1);
      if (!LABEL_LINE_RE.test(line)) out += line;
    }
    if (buf && (final || !PARTIAL_LABEL_RE.test(buf))) { out += buf; buf = ''; }
    if (out) onChunk(out);
  }

  return {
    push(text) {
      if (typeof text !== 'string' || !text) return;
      buf += text;

      if (mode === 'sniff') {
        // 開頭空白不算字數；還看不出來就先屯著（最多屯到第一個換行）
        if (buf.trimStart().length < SNIFF_MIN && !buf.includes('\n')) return;
        mode = looksLikeMetaLeak(buf) ? 'drop' : 'pass';
      }

      if (mode === 'drop') {
        const m = buf.match(LABEL_RE);
        if (!m) {
          // 只留尾巴（可能是被切在 chunk 邊界的標號），其餘丟棄
          buf = buf.slice(-16);
          return;
        }
        buf = buf.slice(m.index + m[0].length).replace(/^[ \t]*\n?/, '');
        mode = 'pass';
      }

      drainLines(false);
    },
    flush() {
      // drop 模式下沒等到邊界＝整段都是思考，緩衝區直接丟掉，不補送
      if (mode === 'drop') { buf = ''; return; }
      if (mode === 'sniff') mode = looksLikeMetaLeak(buf) ? 'drop' : 'pass';
      if (mode === 'drop') { buf = ''; return; }
      drainLines(true);
    },
  };
}
