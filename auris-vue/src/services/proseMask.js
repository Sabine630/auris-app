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
