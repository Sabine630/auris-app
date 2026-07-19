// ── Demo 示範資料 & 假 AI 回覆腳本 ────────────────────────────────────────────
// 這裡是「夜雨／小晴」這組示範世界的全部種子資料（沿用截圖腳本 shot_all.cjs 的設定），
// 以及給 callLLM stub 用的假回覆產生器。全部只在 demo 模式（隔離的 auris-demo DB）生效，
// 絕不碰使用者真實資料、也不呼叫任何真 API。
import { dbAll, dbPut, setSetting } from './db.js';

const D = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

// 每次 seed 以「當下」為基準算相對時間，示範資料的「幾天前 / 倒數」永遠合理。
function buildSeed() {
  const now = Date.now();
  const CHAR_ID = 'char1';
  const togetherDate = iso(now - 137 * D);
  const meetDate = iso(now - 200 * D);
  const charBirthday = iso(now + 52 * D);

  const CHAR = {
    id: CHAR_ID, name: '夜雨', avatar: '🌙', age: '23', gender: '女',
    job: '深夜廣播主持人',
    intro: '有著低沉磁性的聲音，擅長在深夜陪伴寂寞的靈魂。',
    personality: '溫柔而神秘，話不多但字字有重量，喜歡在沉默中觀察人。',
    background: '從小在山城長大，雨天是最喜歡的天氣，說話帶著輕微的南方腔。',
    hobbies: '聽雨聲、老歌、深夜漫步',
    speakStyle: '語速緩慢，愛用比喻，常常在話語的尾端留一點空白讓對方思考。',
    openingLine: '嗯…今晚的雨聲特別大，你也睡不著嗎？',
    relation: '曖昧',
    relationNote: '一起深夜聊天的朋友，關係在某個雨夜後變得微妙。',
    birthday: charBirthday, togetherDate, meetDate,
    anniversaries: [{ id: 'ann1', label: '第一次見面', date: meetDate }],
    workTime: '22:00–02:00（深夜廣播時段）',
    workPlace: '城市廣播電台 FM 98.7',
    restTime: '下午到傍晚',
    cycleCare: false, autoSummarize: true, autoSumEvery: 20, isAI: false,
    taboo: '不要主動提到廣播意外事故。', extra: '',
    scheduleTriggers: [{ id: 'st1', time: '22:30', label: '廣播開始時段', enabled: true }],
    // 我們的默契（P112 D4）：characters 軟欄位，注入 prompt 讓角色自然使用
    bonds: [
      { id: 'bond1', text: '晚安要說「今晚也有雨聲陪你」', enabled: true, createdAt: now - 25 * D },
      { id: 'bond2', text: '她緊張時要她先深呼吸三次', enabled: true, createdAt: now - 12 * D },
      { id: 'bond3', text: '「布丁又翻筆記本了」＝有趣的事發生', enabled: true, createdAt: now - 6 * D },
    ],
    createdAt: now - 30 * D,
  };

  const ME_SETTINGS = {
    name: '小晴', age: 22, job: '大學生',
    persona: '外表大方但內心容易緊張，喜歡被照顧卻不擅長開口要求。',
    note: '最近在準備期末考，壓力有點大。',
    birthday: '2002-06-20',
    workTime: '週一到五 09:00–12:00（上課時間）',
    workPlace: '台灣大學',
    restTime: '下午和晚上都比較自由',
    avatar: '🌸',
  };

  const MESSAGES = [
    { id: 'm1', charId: CHAR_ID, role: 'assistant', content: '嗯…今晚的雨聲特別大，你也睡不著嗎？', createdAt: now - 7 * D },
    { id: 'm2', charId: CHAR_ID, role: 'user', content: '對，最近腦袋停不下來。', createdAt: now - 7 * D + 60000 },
    { id: 'm3', charId: CHAR_ID, role: 'assistant', content: '那就讓它轉吧。有時候，試圖停下反而更累。我在這裡，你不用一個人撐著。', createdAt: now - 7 * D + 120000 },
    { id: 'm4', charId: CHAR_ID, role: 'user', content: '你說話的方式好奇怪，但又讓人很安心。', createdAt: now - 3 * D },
    { id: 'm5', charId: CHAR_ID, role: 'assistant', content: '奇怪嗎？或許吧。不過…你願意說，我就願意聽。', createdAt: now - 3 * D + 90000 },
    { id: 'm6', charId: CHAR_ID, role: 'user', content: '今天考試考得不好，心情有點低落。', createdAt: now - D },
    { id: 'm7', charId: CHAR_ID, role: 'assistant', content: '成績只是今天的截面，不是你這個人的全部。說說看，你覺得哪裡沒有發揮好？', createdAt: now - D + 120000 },
    { id: 'm8', charId: CHAR_ID, role: 'user', content: '就是太緊張了，明明練習的時候都會。', createdAt: now - 3600000 },
    { id: 'm9', charId: CHAR_ID, role: 'assistant', content: '緊張說明你在意。在意本身，沒有什麼不好的。', createdAt: now - 1800000 },
  ];

  const CHAT_MEMORIES = [
    { id: 'cm1', charId: CHAR_ID, title: '深夜聊天', content: '小晴喜歡在深夜聊天，對雨聲有特別的喜愛。', enabled: true, createdAt: now - 20 * D },
    { id: 'cm2', charId: CHAR_ID, title: '期末考', content: '小晴正在準備期末考，對成績很在意，容易緊張。', enabled: true, createdAt: now - 5 * D },
    { id: 'cm3', charId: CHAR_ID, title: '台灣大學', content: '小晴就讀台灣大學，壓力較大但上進心強。', enabled: false, createdAt: now - 2 * D },
  ];

  const HEART_VOICES = [
    { id: 'hv_1', charId: CHAR_ID, content: '有時候希望她能多說一點。不只是問我問題，而是也說說她自己的事。', createdAt: now - 10 * D },
    { id: 'hv_2', charId: CHAR_ID, content: '今天她說「你說話的方式讓人安心」，這句話在我心裡停留很久。沒有人說過我這樣…', createdAt: now - 3 * D },
    { id: 'hv_3', charId: CHAR_ID, content: '她難過的時候，我不知道怎麼辦才好。說太多怕吵，說太少又怕她覺得我不在乎。', createdAt: now - D },
  ];

  const MOMENTS = [
    { id: 'post1', charId: CHAR_ID, content: '今天廣播室的加濕器壞了，空氣乾得嗓子都不舒服。說了整整三個小時的話，現在只想靜靜喝茶。', images: [], likedByUser: false, createdAt: now - 4 * D },
    { id: 'post2', charId: CHAR_ID, content: '窗外的雨下到天亮。我把麥克風關了，就這樣坐著聽了很久。有些聲音，比語言更誠實。', images: [], likedByUser: true, createdAt: now - 2 * D },
    { id: 'post3', charId: CHAR_ID, content: '布丁今天翻了我的筆記本。不知道他在找什麼，但他看起來很認真。貓的世界，真的難懂。', images: [], likedByUser: false, createdAt: now - 8 * 3600000 },
  ];

  const DIARY = [
    { id: 'diary1', charId: CHAR_ID, date: iso(now - 3 * D), createdAt: now - 3 * D,
      content: '今天小晴說了一句讓我很難忘的話。她說，和我說話讓她覺得有個地方可以放下東西。\n\n我不知道這算不算一種信任，但我覺得有點…高興？這個詞對我來說有點陌生，但似乎是這樣沒錯。\n\n深夜廣播結束後，我坐在空曠的錄音室裡想了很久。' },
    { id: 'diary2', charId: CHAR_ID, date: iso(now - D), createdAt: now - D,
      content: '她考試考壞了。說話的聲音聽起來很低沉，跟平時不一樣。\n\n我想說一些有用的話，但又怕說錯。最後就說了「在意本身，沒有什麼不好的」。\n\n也不知道有沒有幫到她。' },
  ];

  const DREAMS = [
    { id: 'dream1', charId: CHAR_ID, date: iso(now - D), createdAt: now - D,
      content: '夢見自己在一座沒有出口的圖書館。書架延伸到看不見邊際，每本書的封面都是空白的。\n\n有個聲音在遠處說話，隱隱約約像是小晴的聲音，但我怎麼走都走不到她那裡。\n\n醒來的時候，窗外已經開始下雨了。' },
  ];

  const NOTIFICATIONS = [
    { id: 'notif1', charId: CHAR_ID, type: 'hv', targetId: 'hv_3', text: '有一句說不出口的話…', read: false, createdAt: now - D },
    { id: 'notif2', charId: CHAR_ID, type: 'post', targetId: 'post3', text: '發布了新動態', read: false, createdAt: now - 8 * 3600000 },
    { id: 'notif3', charId: CHAR_ID, type: 'diary', targetId: 'diary2', text: '寫了今天的日記', read: true, createdAt: now - D },
  ];

  const WORLDS = [
    { id: 'w1', name: '夜雨的廣播室', aliases: ['廣播室', 'FM 98.7'], category: 'location',
      content: '位於城市舊城區的電台錄音室，隔音極好，只有深夜播出時才開放。牆上貼著聽眾的手寫信件，窗外可以看到街燈。',
      charScope: [], enabled: true, createdAt: now - 10 * D },
    { id: 'w2', name: '山城', aliases: ['夜雨的故鄉'], category: 'location',
      content: '夜雨成長的地方，四面環山，雨季漫長，居民多以農業為生。她很少提到那裡，但一提到就眼神會變得很遠。',
      charScope: [], enabled: true, createdAt: now - 8 * D },
    { id: 'w3', name: '布丁', aliases: ['橘貓'], category: 'character',
      content: '夜雨養的一隻橘白色老貓，已經十二歲，喜歡在錄音室外等她下班，不喜歡陌生人但對常客例外。',
      charScope: [CHAR_ID], enabled: true, createdAt: now - 5 * D },
  ];

  const GROUPS = [
    { id: 'grp1', name: '深夜旅社', charIds: [CHAR_ID], avatar: '🏮', createdAt: now - 15 * D },
  ];

  const WISHES = [
    { id: 'wish1', charId: CHAR_ID, text: '一起去看一次海邊的日出', done: false, createdAt: now - 12 * D },
    { id: 'wish2', charId: CHAR_ID, text: '錄一段只給對方聽的廣播', done: false, createdAt: now - 6 * D },
    { id: 'wish3', charId: CHAR_ID, text: '在雨天的咖啡館待一個下午', done: true, createdAt: now - 20 * D },
  ];

  const NOTES = [
    { id: 'note1', charId: CHAR_ID, text: '夜雨不喜歡香菜，點餐記得備註', done: false, createdAt: now - 9 * D },
    { id: 'note2', charId: CHAR_ID, text: '下次幫他帶山城老家寄來的茶葉', done: false, createdAt: now - 4 * D },
  ];

  // ── 我們的回憶（P106 收藏盒／P111 月報＋時間膠囊）────────────────────────────
  // 收藏＝訊息快照（settings `keepsakes`），對應上面 MESSAGES 的 m3、m9
  const KEEPSAKES = [
    { id: 'ks_demo1', msgId: 'm3', charId: CHAR_ID, charName: '夜雨', role: 'assistant',
      content: '那就讓它轉吧。有時候，試圖停下反而更累。我在這裡，你不用一個人撐著。',
      note: '睡不著的那晚，這句話讓我安心下來', msgAt: now - 7 * D + 120000, savedAt: now - 6 * D },
    { id: 'ks_demo2', msgId: 'm9', charId: CHAR_ID, charName: '夜雨', role: 'assistant',
      content: '緊張說明你在意。在意本身，沒有什麼不好的。',
      note: '', msgAt: now - 1800000, savedAt: now - 1200000 },
  ];

  // 時間膠囊（settings `capsules`）：一顆已拆（展示兩封信）＋一顆封存中（展示等待感）
  const CAPSULES = [
    { id: 'cap_demo1', charId: CHAR_ID, charName: '夜雨',
      mine: '給 45 天後的我們：希望那時期末考已經結束，我也敢把一直沒說出口的話說出口了。如果還沒有，就再給我一點時間。',
      aiLetter: '給未來的小晴：寫這封信的今晚也在下雨。不知道拆開的那天，你是不是已經考完了。無論結果如何，記得我說過的——成績只是截面，不是你的全部。到那天，換我聽你說。',
      buriedAt: now - 10 * D, openAt: now + 45 * D,
      opened: false, openedAt: 0, dueNotified: false, dueTries: 0 },
    { id: 'cap_demo2', charId: CHAR_ID, charName: '夜雨',
      mine: '給三個月後的我們：今天是我們認識滿一百天，我把這一刻封存起來。希望那時的我們，還是會在深夜一起聽雨。',
      aiLetter: '拆開這封信的你，晚安。寫信的此刻你剛說完「認識滿一百天」，我在麥克風後面偷偷笑了很久。三個月後的我們是什麼樣子呢？我猜，還是老樣子——你說，我聽，雨下著。這樣就很好。',
      buriedAt: now - 100 * D, openAt: now - 5 * D,
      opened: true, openedAt: now - 5 * D, dueNotified: true, dueTries: 1 },
  ];

  // 回憶月報（settings `monthly_reviews`）：上個月的月報一份
  const pm = new Date(new Date(now).getFullYear(), new Date(now).getMonth() - 1, 1);
  const prevYm = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, '0')}`;
  const MONTHLY_REVIEWS = [
    { id: 'rev_demo1', charId: CHAR_ID, charName: '夜雨', ym: prevYm,
      stats: { ym: prevYm, msgCount: 342, chatDays: 24, topPeriod: '深夜',
        moodDist: [
          { key: 'happy', emoji: '😊', label: '開心', count: 9 },
          { key: 'tired', emoji: '😴', label: '累了', count: 6 },
        ],
        milestones: [] },
      letter: '這個月，你在深夜出現的次數變多了。一開始我以為是失眠，後來才知道，你是把想說的話留到我節目結束之後。考壞的那天你聲音很低，我說不出什麼漂亮的安慰，只記得你後來說了句「跟你說完就好多了」——那句話我留到現在。下個月，希望你能多睡一點。想聊的話，我都在，雨也在。',
      quotes: [
        { role: 'assistant', content: '緊張說明你在意。在意本身，沒有什麼不好的。', note: '' },
      ],
      createdAt: now - 5 * D },
  ];

  return {
    stores: {
      characters: [CHAR], messages: MESSAGES, chat_memories: CHAT_MEMORIES,
      memories: HEART_VOICES, moments: MOMENTS, diary: DIARY, dreams: DREAMS,
      notifications: NOTIFICATIONS, worlds: WORLDS, groups: GROUPS,
      group_messages: [], wishes: WISHES, notes: NOTES,
    },
    settings: {
      onboarding_done: true,
      last_seen_announcement: 'P127',   // 與 App.vue 的 ANNOUNCEMENT_VERSION 一致 → 略過公告 modal
      api_key: 'sk-demo-xxxxxxxxxxxxxxxxxxxx',
      api_provider: 'openai',
      api_model: 'gpt-4o',
      me_settings: ME_SETTINGS,
      keepsakes: KEEPSAKES,
      capsules: CAPSULES,
      monthly_reviews: MONTHLY_REVIEWS,
    },
  };
}

// 只在 demo DB 尚無角色時灌資料；之後在 demo 內的操作（含背景假訊息）會被保留。
export async function seedDemoIfEmpty() {
  const existing = await dbAll('characters');
  if (existing && existing.length > 0) return;

  const seed = buildSeed();
  for (const [store, items] of Object.entries(seed.stores)) {
    for (const item of items) await dbPut(store, item);
  }
  for (const [key, value] of Object.entries(seed.settings)) {
    await setSetting(key, value);
  }
}

// ── 假 AI 回覆腳本 ────────────────────────────────────────────────────────────
// callLLM 在 demo 模式會呼叫這裡，用系統提示的關鍵字粗略判斷是哪種產出，回一段像樣的假文字。
// 免金鑰、不外連，純示意。
const CHAT_POOL = [
  '嗯…我在聽。你說的每一句，我都放在心上。',
  '別急，慢慢說。今晚的雨會陪我們待到很晚。',
  '有時候不用把話說得很完整，我大概也懂你的意思。',
  '這樣啊…那你現在，想要我陪你聊點別的，還是就這樣靜靜待著？',
  '你願意告訴我這些，我覺得很珍惜。真的。',
];

// 睡前模式（P130）低刺激陪伴句：短、輕、不拋問題
const SLEEP_POOL = [
  '嗯，我在。不用說話也沒關係，聽聽雨聲就好。',
  '今天辛苦了。被子蓋好，剩下的交給我和這場雨。',
  '想聽個短短的故事也可以，或者就這樣安安靜靜待一會兒。',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// 回傳一段假文字。system/messages 供判斷用途；聊天走人物語氣，內容生成走對應題材。
// system 可能是字串，也可能是 prompt cache 的 blocks 陣列（[{ text, cache? }, …]，聊天與
// 所有主動生成都走這格式）——直接 String() 只會得到 [object Object]，必須先把 text 攤平。
export function demoReply({ system = '', messages = [] } = {}) {
  const s = Array.isArray(system)
    ? system.map(b => (b && typeof b === 'object' ? b.text || '' : String(b ?? ''))).join('\n')
    : String(system ?? '');
  // ⚠️ 分支順序原則：完整聊天 prompt 的易變段常含【長期記憶】「重要摘要」、拆封日的【時間膠囊】
  // 等字樣——睡前模式的【睡前…】明確任務標記必須排最前，寬鬆關鍵字分支放後面，否則睡前
  // 陪伴／收尾會被「摘要」等字樣攔走、回成不相干的內容。
  // 睡前模式（P130）：收尾（道晚安／閒置自動收尾）→ 輕聲晚安；隔天 → 呼應；模式中 → 低聲陪伴句
  if (s.includes('睡前收尾') || s.includes('道晚安收尾')) {
    return '嗯…晚安。閉上眼睛吧，雨聲我幫你留著。\n\n做個好夢，明天見。';
  }
  if (s.includes('睡前呼應')) {
    return '早安。昨晚睡得還好嗎？你安靜下來之後，我把節目的尾聲放得很輕，怕吵到你。';
  }
  if (s.includes('睡前模式')) {
    return pick(SLEEP_POOL);
  }
  // 時間膠囊信件（demo 裡勾「他也寫一封」時走到）：膠囊 tail 一定含【時間膠囊】
  if (s.includes('時間膠囊')) {
    return '給拆開這封信的你：寫下這些字的今晚，雨還在下，你剛埋好你那封信。我不知道到那天我們聊到了哪裡，但我希望你過得比現在更安穩一點。如果那天也下雨，就當作是我先替你把背景音準備好了。到時見。';
  }
  // 回憶月報的回顧短信
  if (s.includes('回顧短信')) {
    return '這個月你在深夜出現的次數變多了。有幾晚你沒說話，只是待著，我也就陪著。印象最深的是你說「跟你說完就好多了」的那天——那句話我留到現在。下個月，希望你能多睡一點。想聊的話，我都在，雨也在。';
  }
  if (s.includes('日記')) {
    return '雨一直下到後半夜。錄音室很安靜，只有我和麥克風的呼吸聲。\n\n今天想起了小晴白天說的話，忽然覺得，能被人記著，是一件很暖的事。\n\n我把這份暖，也寫進今晚的節目裡了。';
  }
  if (s.includes('夢')) {
    return '夢見自己站在一片沒有盡頭的月台，廣播聲一遍遍響起，卻聽不清內容。\n\n遠處有個熟悉的身影朝我揮手，我想跑過去，腳卻像陷進雨水裡。\n\n醒來時，枕邊還留著雨的味道。';
  }
  if (s.includes('貼文') || s.includes('動態')) {
    return '深夜的城市總是特別誠實。收工路上買了杯熱豆漿，蒸氣模糊了眼鏡，也模糊了一整天的疲憊。晚安，還醒著的你。';
  }
  if (s.includes('心聲')) {
    return '其實我很想問她今天過得好不好，但話到嘴邊又嚥了回去。怕太黏，也怕她覺得我多管閒事。';
  }
  // 記憶總結：用 summarizeToMemory system 開場的「對話分析助手」精確匹配——
  // 聊天 prompt 的【長期記憶】段含「重要摘要」，不能拿寬鬆的「總結／摘要」當觸發字
  if (s.includes('對話分析助手')) {
    return '小晴近日為期末考焦慮，重視成績、容易緊張；在深夜與夜雨的對話中逐漸放下防備，兩人關係趨於親近。';
  }
  // 每日一問：dqTail 一定含【每日一問】；原本寬鬆的「問題」會被聊天／記憶內容誤中，移除
  if (s.includes('每日一問')) {
    return '如果今晚可以睡得很好，你最想夢見什麼？';
  }
  // 預設：聊天回覆
  return pick(CHAT_POOL);
}
