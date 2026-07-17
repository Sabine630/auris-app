import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cssPath = fileURLToPath(new URL('../../assets/main.css', import.meta.url));
const css = readFileSync(cssPath, 'utf8');

describe('mobile shell keyboard compositor fix', () => {
  it('keeps the production mobile body static while preserving viewport clipping', () => {
    expect(css).toContain('body{position:static;width:100%}');
    expect(css).toMatch(/body\s*\{[\s\S]*?height:\s*100dvh\s*!important;[\s\S]*?overflow:\s*hidden\s*!important;[\s\S]*?position:\s*static\s*!important;/);
    expect(css).not.toContain('body{position:fixed;width:100%}');
  });

  it('retains the old fixed body only as an explicit reverse diagnostic control', () => {
    expect(css).toContain('html.diag-kbshell-fixed body{position:fixed!important}');
  });
});