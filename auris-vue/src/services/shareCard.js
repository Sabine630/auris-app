// ── 對話分享卡（P106 F1）─────────────────────────────────────────────────────
// canvas 生成對話美圖卡：泡泡長按「分享成卡片」→ 預覽 → navigator.share／下載。
// 配色讀當前主題 CSS 變數（6 款主題自動跟色）；浮水印「Auris」＋網址（小字淡色）。
// V1 僅文字訊息；D1 月報存圖未來共用此引擎。

const CARD_W = 1080;           // 輸出寬（px），高度依內容動態
const PAD = 84;                // 卡片外距
const BUBBLE_PAD_X = 44;
const BUBBLE_PAD_Y = 34;
const BUBBLE_GAP = 36;         // 不同說話者的泡泡間距
const BUBBLE_GAP_RUN = 14;     // 同角色連發泡泡間距（收緊成同一段話，P109）
const BUBBLE_MAX_W = CARD_W - PAD * 2 - 120; // 泡泡最大寬（留對側空隙）
const FONT_STACK = '-apple-system, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
const SITE_URL = 'sabine630.github.io/auris-app';

// 讀當前主題色（跟著 6 款主題走）。
// 注意：主題變數是掛在 #phone-container 的 [data-theme] 覆寫，不在 :root——
// 讀 documentElement 只會拿到預設奶白色（P107 修正）。
function themeColors() {
  const cs = getComputedStyle(document.getElementById('phone-container') || document.documentElement);
  const v = (name, fallback) => (cs.getPropertyValue(name) || '').trim() || fallback;
  return {
    bg: v('--bg', '#f7f5f2'),
    surface: v('--surface', '#ffffff'),
    text: v('--text', '#2a2420'),
    text3: v('--text-3', '#8a7d76'),
    rose: v('--rose', '#c9887a'),
    border: v('--border-2', 'rgba(42,36,32,0.15)'),
  };
}

// CJK 為主的逐字貪婪換行（連續拉丁字串盡量不拆）
function wrapLine(ctx, line, maxW) {
  const out = [];
  let cur = '';
  const tokens = line.match(/[A-Za-z0-9]+|\s|./gs) || [];
  for (const t of tokens) {
    const test = cur + t;
    if (ctx.measureText(test).width > maxW && cur) {
      out.push(cur);
      cur = t === ' ' ? '' : t;
    } else {
      cur = test;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

function wrapText(ctx, text, maxW) {
  return text.split('\n').flatMap(line => wrapLine(ctx, line, maxW));
}

function roundRect(ctx, x, y, w, h, radii) {
  const [tl, tr, br, bl] = radii;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

// 生成分享卡 canvas。
// messages: [{ role: 'user'|'assistant', text }]（依時間順序，最多一問一答）
// charName: 角色顯示名（匿名時傳入代稱如「某個他」）；dateText: 顯示日期字串
export function renderShareCard({ messages, charName, dateText }) {
  const c = themeColors();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const msgFont = `400 40px ${FONT_STACK}`;
  const lineH = 62;

  // 先量高：header（名字＋日期）＋泡泡們＋footer 浮水印
  ctx.font = msgFont;
  const blocks = messages.map(m => {
    const lines = wrapText(ctx, m.text, BUBBLE_MAX_W - BUBBLE_PAD_X * 2);
    const w = Math.min(BUBBLE_MAX_W, Math.max(...lines.map(l => ctx.measureText(l).width)) + BUBBLE_PAD_X * 2);
    const h = lines.length * lineH + BUBBLE_PAD_Y * 2;
    return { ...m, lines, w, h };
  });
  const headerH = 150;
  const footerH = 130;
  const gapAfter = (i) => (i >= blocks.length - 1 ? 0 : (blocks[i].role === blocks[i + 1].role ? BUBBLE_GAP_RUN : BUBBLE_GAP));
  const bodyH = blocks.reduce((s, b, i) => s + b.h + gapAfter(i), 0);
  const cardH = PAD + headerH + bodyH + footerH + PAD;

  canvas.width = CARD_W;
  canvas.height = cardH;

  // 底
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, CARD_W, cardH);

  // header：名字＋日期（置中）
  ctx.textAlign = 'center';
  ctx.fillStyle = c.text;
  ctx.font = `600 46px ${FONT_STACK}`;
  ctx.fillText(charName, CARD_W / 2, PAD + 52);
  ctx.fillStyle = c.text3;
  ctx.font = `300 30px ${FONT_STACK}`;
  ctx.fillText(dateText, CARD_W / 2, PAD + 106);

  // 泡泡（同角色連發只在最後一顆做小圓角尾巴，間距收緊）
  ctx.textAlign = 'left';
  let y = PAD + headerH;
  blocks.forEach((b, i) => {
    const isMe = b.role === 'user';
    const lastOfRun = i === blocks.length - 1 || blocks[i + 1].role !== b.role;
    const x = isMe ? CARD_W - PAD - b.w : PAD;
    const tail = lastOfRun ? 8 : 36;
    ctx.fillStyle = isMe ? c.rose : c.surface;
    roundRect(ctx, x, y, b.w, b.h, isMe ? [36, 36, tail, 36] : [36, 36, 36, tail]);
    ctx.fill();
    if (!isMe) { ctx.strokeStyle = c.border; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.fillStyle = isMe ? '#ffffff' : c.text;
    ctx.font = msgFont;
    b.lines.forEach((line, li) => {
      ctx.fillText(line, x + BUBBLE_PAD_X, y + BUBBLE_PAD_Y + lineH * li + 44);
    });
    y += b.h + gapAfter(i);
  });

  // footer 浮水印（小字淡色）
  ctx.textAlign = 'center';
  ctx.fillStyle = c.text3;
  ctx.globalAlpha = 0.75;
  ctx.font = `500 30px ${FONT_STACK}`;
  ctx.fillText('Auris', CARD_W / 2, cardH - PAD - 44);
  ctx.font = `300 24px ${FONT_STACK}`;
  ctx.fillText(SITE_URL, CARD_W / 2, cardH - PAD - 4);
  ctx.globalAlpha = 1;

  return canvas;
}

// ── 月報卡面（P111 D1，與對話卡共用引擎）────────────────────────────────────
// 「我們的這個月」存圖：標題＋統計列＋角色回顧短信＋（可選）金句。
// stats: { msgCount, chatDays, topPeriod, moodDist }（reviewEngine.computeStats 的輸出）
export function renderMonthCard({ title, charName, stats, letter, quote }) {
  const c = themeColors();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const bodyFont = `400 38px ${FONT_STACK}`;
  const lineH = 60;
  const boxW = CARD_W - PAD * 2;
  const boxPad = 52;

  // 統計欄位（有值才放）
  const tiles = [
    { v: String(stats?.msgCount ?? 0), l: '則訊息' },
    { v: String(stats?.chatDays ?? 0), l: '天有聊天' },
    stats?.topPeriod ? { v: stats.topPeriod, l: '最常聊' } : null,
    stats?.moodDist?.[0] ? { v: stats.moodDist[0].emoji, l: `最常${stats.moodDist[0].label}` } : null,
  ].filter(Boolean);

  // 先量高：header＋統計列＋信＋金句＋footer
  ctx.font = bodyFont;
  const letterLines = letter ? wrapText(ctx, letter, boxW - boxPad * 2) : [];
  const quoteLines = quote ? wrapText(ctx, `「${quote}」`, boxW - boxPad * 2) : [];
  const headerH = 190;
  const tilesH = tiles.length ? 200 : 0;
  const letterH = letterLines.length ? letterLines.length * lineH + boxPad * 2 : 0;
  const quoteH = quoteLines.length ? quoteLines.length * lineH + boxPad * 2 : 0;
  const gap = 44;
  const footerH = 130;
  const cardH = PAD + headerH + tilesH + (letterH ? letterH + gap : 0) + (quoteH ? quoteH + gap : 0) + footerH + PAD;

  canvas.width = CARD_W;
  canvas.height = cardH;

  // 底
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, CARD_W, cardH);

  // header：月份標題＋角色名
  ctx.textAlign = 'center';
  ctx.fillStyle = c.text;
  ctx.font = `600 58px ${FONT_STACK}`;
  ctx.fillText(title, CARD_W / 2, PAD + 66);
  ctx.fillStyle = c.text3;
  ctx.font = `300 32px ${FONT_STACK}`;
  ctx.fillText(charName, CARD_W / 2, PAD + 128);

  // 統計列：等寬 tile，值大字＋標籤小字
  let y = PAD + headerH;
  if (tiles.length) {
    const tileW = boxW / tiles.length;
    tiles.forEach((t, i) => {
      const cx = PAD + tileW * i + tileW / 2;
      ctx.fillStyle = c.rose;
      ctx.font = `600 64px ${FONT_STACK}`;
      ctx.fillText(t.v, cx, y + 84);
      ctx.fillStyle = c.text3;
      ctx.font = `300 28px ${FONT_STACK}`;
      ctx.fillText(t.l, cx, y + 140);
    });
    y += tilesH;
  }

  // 角色回顧短信（surface 圓角卡）
  ctx.textAlign = 'left';
  if (letterLines.length) {
    ctx.fillStyle = c.surface;
    roundRect(ctx, PAD, y, boxW, letterH, [36, 36, 36, 36]);
    ctx.fill();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = c.text;
    ctx.font = bodyFont;
    letterLines.forEach((line, li) => {
      ctx.fillText(line, PAD + boxPad, y + boxPad + lineH * li + 42);
    });
    y += letterH + gap;
  }

  // 金句（rose 底白字，同對話卡使用者泡泡的視覺重量）
  if (quoteLines.length) {
    ctx.fillStyle = c.rose;
    roundRect(ctx, PAD, y, boxW, quoteH, [36, 36, 36, 36]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = bodyFont;
    quoteLines.forEach((line, li) => {
      ctx.fillText(line, PAD + boxPad, y + boxPad + lineH * li + 42);
    });
    y += quoteH + gap;
  }

  // footer 浮水印（與對話卡一致）
  ctx.textAlign = 'center';
  ctx.fillStyle = c.text3;
  ctx.globalAlpha = 0.75;
  ctx.font = `500 30px ${FONT_STACK}`;
  ctx.fillText('Auris', CARD_W / 2, cardH - PAD - 44);
  ctx.font = `300 24px ${FONT_STACK}`;
  ctx.fillText(SITE_URL, CARD_W / 2, cardH - PAD - 4);
  ctx.globalAlpha = 1;

  return canvas;
}

// 分享（navigator.share 檔案分享）→ 不支援就下載 fallback。回傳 'shared'|'downloaded'|'cancelled'
export async function shareCardImage(canvas, filename = 'auris-card.png') {
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'; // 使用者收掉分享面板，不當錯誤
      // 其餘失敗落下載 fallback
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
