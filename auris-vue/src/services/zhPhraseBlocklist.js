// zh-tw 輸出正規化用的 OpenCC twp 詞表「誤觸發」排除名單。
//
// 純資料模組：不依賴 DOM，Worker（zhTwWorker.js）與主執行緒退路
// （outputLanguage.js 的 convertOnMainThread）共用同一份規則，行為才會一致。
//
// ── 為什麼需要這張表 ──────────────────────────────────────────────────────
// normalizeCharacterOutput 落庫前跑 OpenCC 的 twp（台灣詞彙）轉換，把供應商偶爾
// 吐出的簡體／中國用語轉成台灣繁體與慣用詞（网络→網路、软件→軟體…）。但 twp 的
// TWPhrases 詞表裡混了一批「短音譯碎片」條目——本意是把常見西方姓氏／地名裡的字
// 換成台灣慣用字（格拉斯→葛拉斯、布爾→布林…），碎片本身很短，只要它剛好是某個
// 更長專有名詞的一部分，就會在該名字內部誤觸發，把本來就正確的繁體名字改壞。
//
// 實測（2026-08）：15 個含這些碎片的名字，14 個被改壞。使用者回報案例：打
// 「格林格拉斯家的秘密」，角色回覆落庫後變成「格林葛拉斯家的秘密」——這不是模型
// 打錯字，是我們自己的正規化改的（串流當下顯示是對的，落庫後才變，因為
// normalizeCharacterOutput 是在 persistReplySegments 那一步才跑）。
//
// 曾考慮改用字級的 tw（拿掉整個詞彙層）迴避這個問題，但那樣會讓「網絡／信息／
// 軟件／屏幕」之類的中國用語留著不轉——使用者明確要保留這個模組原本的在地化
// 價值，故仍用 twp，只挖掉會誤觸發的碎片條目。
//
// ── 排除清單（比對的是 TWPhrases 每行「來源 目標」裡的來源那半）─────────────
//   格拉斯 → 格林格拉斯／道格拉斯／格拉斯哥         （twp: 格拉斯→葛拉斯）
//   布爾   → 伊斯坦布爾／布爾什維克／尼布爾         （twp: 布爾→布林）
//   歐拉   → 歐拉夫                                （twp: 歐拉→尤拉）
//   拉莫   → 拉莫斯                                （twp: 拉莫→拉摩）
//   加納   → 加納利群島                            （twp: 加納→迦納）
//   薩蒂   → 薩蒂亞                                （twp: 薩蒂→薩提）
//   凱奇   → 凱奇亞                                （twp: 凱奇→凱吉）
//   拉洛   → 拉洛克                                （twp: 拉洛→拉羅）
//   香農   → 香農（人名／地名，不是中國用語）        （twp: 香農→夏農）
//
// 注意：肖邦→蕭邦是正確的台灣譯名，刻意不在這張清單裡，不要一起砍掉。
//
// ── 之後要新增排除詞時 ──────────────────────────────────────────────────
// 只要把新的「來源詞」加進下面的 DROP_SOURCES 集合，並在
// __tests__/zhPhraseBlocklist.test.js 補一條迴歸測試即可，不必動任何轉換邏輯。
export const DROP_SOURCES = new Set([
  '格拉斯',
  '布爾',
  '歐拉',
  '拉莫',
  '加納',
  '薩蒂',
  '凱奇',
  '拉洛',
  '香農',
]);

// opencc-js/to/twp 的預設匯出結構是：
//   [[TWPhrases], [TWVariantsPhrases, TWVariants]]
// TWPhrases 是一個大字串，每條「來源 目標」用單一空白分隔，條目之間用 '|' 分隔。
// 這裡把來源命中 DROP_SOURCES 的條目整條拿掉，其餘（包含 TWVariantsPhrases／
// TWVariants 那組字級對應表）原封不動——只濾詞彙層，不動字級層。
//
// 只走公開匯出路徑，不 import opencc-js 套件內部的 dist/esm-lib/dict/* 檔案，
// 避免升版時套件內部結構變動就壞掉。
//
// 防禦：若 toTwp 的結構不如預期（不是陣列、詞表不是字串等，代表套件版本已變），
// 一律原樣回傳傳入的 toTwp——退回「未濾字典」的舊行為。最壞情況等於改版前
// （會誤觸發那批碎片），也不能讓轉換整個掛掉或吐出空字典。
export function filterPhraseDict(toTwp) {
  try {
    if (!Array.isArray(toTwp) || toTwp.length === 0) return toTwp;
    const [first, ...rest] = toTwp;
    if (!Array.isArray(first) || typeof first[0] !== 'string') return toTwp;

    const filtered = first[0]
      .split('|')
      .filter(entry => !DROP_SOURCES.has(entry.split(' ')[0]))
      .join('|');

    return [[filtered, ...first.slice(1)], ...rest];
  } catch {
    return toTwp;
  }
}
