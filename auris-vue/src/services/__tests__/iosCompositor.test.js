import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcRoot = fileURLToPath(new URL('../../', import.meta.url));

function source(relativePath) {
  return readFileSync(new URL(relativePath, `file://${srcRoot}/`), 'utf8');
}

describe('iOS PWA compositor regression guard', () => {
  it('輸入中與生成中圓點不可使用無限 CSS 動畫', () => {
    const css = source('assets/main.css');
    const typingRule = css.match(/\.tdot\{[^}]*\}/)?.[0] || '';
    const generatingRule = css.match(/\.gen-dot\{[^}]*\}/)?.[0] || '';

    expect(typingRule).not.toMatch(/animation|transform/);
    expect(generatingRule).not.toMatch(/animation|transform/);
    expect(css).not.toContain('@keyframes tb');
  });

  it('聊天室串流游標不可使用無限閃爍動畫', () => {
    for (const view of ['views/ChatRoomView.vue', 'views/GroupRoomView.vue']) {
      const css = source(view);
      const cursorRule = css.match(/\.msg-bubble\.streaming::after\s*\{[^}]*\}/)?.[0] || '';

      expect(cursorRule).not.toMatch(/animation|transform/);
      expect(css).not.toContain('@keyframes blink-cursor');
    }
  });

  it('常駐 PWA 畫面不得留下無限 CSS 動畫', () => {
    for (const file of ['assets/main.css', 'views/ChatRoomView.vue', 'views/GroupRoomView.vue']) {
      expect(source(file)).not.toMatch(/animation\s*:[^;}]*(?:infinite)/i);
    }
  });
});
