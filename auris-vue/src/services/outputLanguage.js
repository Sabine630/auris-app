// 使用者可見的角色輸出語言防線。
// Prompt 規則負責降低模型混用語言的機率；zh-tw 輸出在落庫前再經本機 OpenCC 正規化，
// 避免供應商忽略 prompt 時把簡體中文永久存進聊天、貼文、日記等內容。

let zhTwConverterPromise = null;

export function characterLanguageInstruction(lang = 'zh-tw') {
  const rules = {
    'zh-tw': '【輸出語言】所有一般中文內容必須使用自然的繁體中文（台灣用語），不得混入簡體中文；專有名詞、網址、程式碼與忠實原文引述可保留原樣。',
    'zh-cn': '【输出语言】所有一般中文内容必须使用自然的简体中文；专有名词、网址、代码与忠实原文引用可保留原样。',
    ja: '【出力言語】自然な日本語で書いてください。固有名詞、URL、コード、正確な原文引用のみ原文のまま残せます。',
    ko: '【출력 언어】자연스러운 한국어로 작성하세요. 고유명사, URL, 코드, 정확한 원문 인용만 원문 그대로 유지할 수 있습니다.',
    en: '【Output language】Write in natural English. Only proper nouns, URLs, code, and faithful quotations may remain in their original language.',
  };
  return rules[lang] || rules['zh-tw'];
}

async function getZhTwConverter() {
  if (!zhTwConverterPromise) {
    zhTwConverterPromise = Promise.all([
      import('opencc-js/core'),
      import('opencc-js/from/cn'),
      import('opencc-js/to/twp'),
    ])
      .then(([{ ConverterFactory }, { default: fromCn }, { default: toTwp }]) =>
        ConverterFactory(...fromCn, ...toTwp))
      .catch((error) => {
        zhTwConverterPromise = null;
        throw error;
      });
  }
  return zhTwConverterPromise;
}

function convertInlineProse(text, converter) {
  const protectedPart = /https?:\/\/[^\s<>\"'`]+|`[^`\r\n]*`/g;
  let result = '';
  let cursor = 0;
  for (const match of text.matchAll(protectedPart)) {
    result += converter(text.slice(cursor, match.index));
    result += match[0];
    cursor = match.index + match[0].length;
  }
  return result + converter(text.slice(cursor));
}

// 保留 Markdown fenced code block、inline code 與網址，避免轉換破壞可執行內容或連結。
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

export async function normalizeCharacterOutput(text, lang = 'zh-tw') {
  if (lang !== 'zh-tw' || typeof text !== 'string' || !text) return text;
  const converter = await getZhTwConverter();
  return convertVisibleProse(text, converter);
}
