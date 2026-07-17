import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const labPath = fileURLToPath(new URL('../../../public/keyboard-lab.html', import.meta.url));
const html = readFileSync(labPath, 'utf8');

describe('plain keyboard lab isolation', () => {
  it('keeps the control page outside the Auris Vue shell', () => {
    expect(html).not.toContain('/src/main.js');
    expect(html).not.toMatch(/class=["'][^"']*(?:phone|screen|page)/);
    expect(html).not.toContain('keyboardViewport');
  });

  it('avoids compositor-affecting shell CSS in the control page', () => {
    expect(html).not.toMatch(/position\s*:\s*(?:fixed|absolute)/i);
    expect(html).not.toMatch(/(?:backdrop-filter|transform|animation)\s*:/i);
    expect(html).toContain('min-height:100dvh');
  });

  it('reports iOS standalone and visual viewport signals', () => {
    expect(html).toContain('navigator.standalone');
    expect(html).toContain('window.visualViewport');
    expect(html).toContain('id="plain-input"');
  });
});
