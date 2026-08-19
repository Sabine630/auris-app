// 「只轉一般文字」的遮罩：Markdown fenced code block、inline code 與網址原樣保留，
// 避免簡繁轉換破壞可執行內容或連結。主執行緒與 zh-tw 轉換 Worker 共用同一份規則。

function convertInlineProse(text, converter) {
  const protectedPart = /https?:\/\/[^\s<>"'`]+|`[^`\r\n]*`/g;
  let result = '';
  let cursor = 0;
  for (const match of text.matchAll(protectedPart)) {
    result += converter(text.slice(cursor, match.index));
    result += match[0];
    cursor = match.index + match[0].length;
  }
  return result + converter(text.slice(cursor));
}

export function convertVisibleProse(text, converter) {
  const lines = String(text ?? '').split(/(\r?\n)/);
  let fence = null;
  let result = '';

  for (const part of lines) {
    if (part === '\n' || part === '\r\n') {
      result += part;
      continue;
    }

    const marker = part.match(/^\s*(`{3,}|~{3,})/)?.[1] || null;
    if (fence) {
      result += part;
      if (marker?.[0] === fence) fence = null;
      continue;
    }
    if (marker) {
      fence = marker[0];
      result += part;
      continue;
    }
    result += convertInlineProse(part, converter);
  }
  return result;
}

// ── 專有名詞保護（P137）────────────────────────────────────────────────────
// OpenCC 的詞表不只 twp 那層會誤傷名字：cn→t 的 s2t 詞表裡也有「星回 星迴」「低回 低迴」
// 這類短詞條，而角色名「沈星回」剛好整個被命中——實機案例是使用者的角色每則回覆落庫後
// 都被改成「沈星迴」。zhPhraseBlocklist 只濾得到 twp 那份字典（filterPhraseDict(toTwp)），
// 對 fromCn 側無效，所以逐詞封鎖在這一類上是修不完的。
//
// 改成「轉換前先把名字換成字典不可能命中的佔位符，轉完再換回來」：角色名與使用者名
// 是我們自己知道的字串，直接整個保護起來比事後補詞表可靠，也自動涵蓋往後所有名字。
// 佔位符用私有使用區（PUA）字元包起來，OpenCC 的任何字典都不含這些碼位。
const MASK_OPEN = '\uE000';
const MASK_CLOSE = '\uE001';

// 單字名字不保護：一個字的名字（例如「回」）會把文中所有同字都鎖住，
// 反而讓該轉的簡體用語轉不成，得不償失。
export function maskNames(text, names = []) {
  const list = [...new Set(names.filter(n => typeof n === 'string' && n.trim().length >= 2).map(n => n.trim()))]
    .sort((a, b) => b.length - a.length);
  let out = String(text ?? '');
  list.forEach((name, i) => { out = out.split(name).join(`${MASK_OPEN}${i}${MASK_CLOSE}`); });
  return { text: out, list };
}

export function unmaskNames(text, list = []) {
  let out = String(text ?? '');
  list.forEach((name, i) => { out = out.split(`${MASK_OPEN}${i}${MASK_CLOSE}`).join(name); });
  return out;
}

// 遮罩 → 轉換 → 還原。Worker 與主執行緒退路共用同一支，行為才會一致。
export function convertProtectedProse(text, converter, names = []) {
  const { text: masked, list } = maskNames(text, names);
  return unmaskNames(convertVisibleProse(masked, converter), list);
}
