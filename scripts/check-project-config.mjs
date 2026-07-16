import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const failures = [];

function read(path) {
  return readFileSync(new URL(path, root), 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const path of ['.claude/settings.json', '.codex/hooks.json', 'vercel.json']) {
  try {
    JSON.parse(read(path));
  } catch (error) {
    failures.push(`${path} 不是合法 JSON：${error.message}`);
  }
}

const claudeSettings = read('.claude/settings.json');
const codexHooks = read('.codex/hooks.json');
for (const hook of ['guard-main-push.sh', 'check-version-bump.sh', 'check-secret-leak.sh']) {
  assert(claudeSettings.includes(`scripts/hooks/${hook}`), `.claude/settings.json 未指向共用 ${hook}`);
  assert(codexHooks.includes(`scripts/hooks/${hook}`), `.codex/hooks.json 未指向共用 ${hook}`);
  read(`scripts/hooks/${hook}`);
}

for (const path of ['README.md', 'docs/README.md', 'docs/ROADMAP.md']) read(path);

const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: new URL('.', root), encoding: 'utf8' })
  .split('\0')
  .filter(path => path && existsSync(new URL(path, root)));

for (const path of tracked) {
  if (path.startsWith('archive/')) continue;
  let content;
  try {
    content = read(path);
  } catch {
    continue;
  }
  if (content.includes('\0')) {
    // 文字程式檔含 NUL：Git 會視為 binary——diff 不可讀、secret 掃描也掃不到新增行，
    // 等於在金鑰防線上開盲點（2026-07-15 復查實測），直接列為失敗。
    if (/\.(js|mjs|cjs|ts|vue|css|html|md|json|ya?ml|sh)$/i.test(path)) {
      failures.push(`${path} 含 NUL 位元組（Git 視為 binary，diff 與金鑰掃描失效）`);
    }
    continue;
  }
  if (/\/Users\/[A-Za-z0-9._-]+\//.test(content) || /[A-Za-z]:\\Users\\[^\\]+\\/.test(content)) {
    failures.push(`${path} 含個人絕對路徑`);
  }
  if (/登入密碼\s*\|/.test(content)) failures.push(`${path} 含 tracked 登入密碼欄位`);
}

const legacyHooks = tracked.filter(path => /^\.(?:claude|codex)\/hooks\/.*\.sh$/.test(path));
assert(legacyHooks.length === 0, `仍有重複 hook 腳本：${legacyHooks.join(', ')}`);

if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  process.exit(1);
}

console.log('✓ project config checks passed');
