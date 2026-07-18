// ── scripts/hooks/ 行為測試 ─────────────────────────────────────────────────
// 背景：舊版 hook 只比對連續字串 "git push"／"git commit"，`git -C <repo> push`
// 會整個繞過防線（2026-07-15 復查實測）。這裡用臨時 git repo 驗證三支 hook 對
// 「標準形式」與「git -C／-c 全域選項形式」都會觸發，且逃生口與負案例正確放行。
// 依賴 bash／git／jq（開發機與 CI ubuntu 皆有）。
import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hooksDir = fileURLToPath(new URL('../../../../scripts/hooks/', import.meta.url));

function runHook(script, command, projectDir) {
  const input = JSON.stringify({ tool_input: { command } });
  const r = spawnSync('bash', [join(hooksDir, script)], {
    input,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  });
  return r.stdout.trim();
}

function initRepo(dir) {
  execSync('git init -q -b dev && git -c user.email=t@t.t -c user.name=t commit -q --allow-empty -m init', { cwd: dir, shell: '/bin/bash' });
}

let devRepo;     // 乾淨 repo（dev 分支）
let unbumped;    // 有 auris-vue/src 異動 staged、但未做版更的 repo
let leaky;       // staged 內容含假金鑰的 repo

beforeAll(() => {
  devRepo = mkdtempSync(join(tmpdir(), 'auris-hook-dev-'));
  initRepo(devRepo);

  unbumped = mkdtempSync(join(tmpdir(), 'auris-hook-ver-'));
  initRepo(unbumped);
  mkdirSync(join(unbumped, 'auris-vue', 'src'), { recursive: true });
  writeFileSync(join(unbumped, 'auris-vue', 'src', 'foo.js'), 'export const x = 1;\n');
  execSync('git add .', { cwd: unbumped });

  leaky = mkdtempSync(join(tmpdir(), 'auris-hook-sec-'));
  initRepo(leaky);
  // 假金鑰用組字串避免本測試檔自己觸發 secret 掃描
  writeFileSync(join(leaky, 'leak.js'), `const k = '${'sk-' + 'a'.repeat(24)}';\n`);
  execSync('git add .', { cwd: leaky });
});

describe('guard-main-push', () => {
  it('標準形式：git push origin main → 要求確認', () => {
    expect(runHook('guard-main-push.sh', 'git push origin main', devRepo)).toContain('"permissionDecision":"ask"');
  });

  it('git -C <repo> push origin main → 同樣要求確認（舊版繞過案例）', () => {
    expect(runHook('guard-main-push.sh', `git -C ${devRepo} push origin main`, devRepo)).toContain('"permissionDecision":"ask"');
  });

  it('git -c key=val push origin main → 同樣要求確認', () => {
    expect(runHook('guard-main-push.sh', 'git -c core.editor=true push origin main', devRepo)).toContain('"permissionDecision":"ask"');
  });

  it('長參數分離形式 --git-dir .git --work-tree . → 同樣要求確認（第二輪復查繞過案例）', () => {
    expect(runHook('guard-main-push.sh', 'git --git-dir .git --work-tree . push origin main', devRepo)).toContain('"permissionDecision":"ask"');
  });

  it('旗標型長參數 --no-pager 不被誤吞為參數 → 仍要求確認', () => {
    expect(runHook('guard-main-push.sh', 'git --no-pager push origin main', devRepo)).toContain('"permissionDecision":"ask"');
  });

  it('推 dev／非 git 指令／字串裡剛好有 push 字樣 → 放行', () => {
    expect(runHook('guard-main-push.sh', 'git push origin dev', devRepo)).toBe('');
    expect(runHook('guard-main-push.sh', 'npm run build', devRepo)).toBe('');
    expect(runHook('guard-main-push.sh', 'echo git pushover', devRepo)).toBe('');
  });

  // PR 流程（2026-07-18 起）：合併 dev→main PR＝發正式版，merge 指令同樣要攔
  it('GitHub merge API：數字與變數 PR 編號 → 都要求確認（變數形式為復查繞過案例）', () => {
    expect(runHook('guard-main-push.sh', 'curl -X PUT https://api.github.com/repos/Sabine630/auris-app/pulls/1/merge', devRepo)).toContain('"permissionDecision":"ask"');
    expect(runHook('guard-main-push.sh', 'curl -X PUT https://api.github.com/repos/Sabine630/auris-app/pulls/$PR_NUMBER/merge', devRepo)).toContain('"permissionDecision":"ask"');
    expect(runHook('guard-main-push.sh', 'curl -X PUT "https://api.github.com/repos/Sabine630/auris-app/pulls/${N}/merge"', devRepo)).toContain('"permissionDecision":"ask"');
  });

  it('gh pr merge：含 -R／--repo 全域參數 → 都要求確認（全域參數形式為復查繞過案例）', () => {
    expect(runHook('guard-main-push.sh', 'gh pr merge 1 --merge', devRepo)).toContain('"permissionDecision":"ask"');
    expect(runHook('guard-main-push.sh', 'gh -R Sabine630/auris-app pr merge 1', devRepo)).toContain('"permissionDecision":"ask"');
    expect(runHook('guard-main-push.sh', 'gh --repo Sabine630/auris-app pr merge 1 --merge', devRepo)).toContain('"permissionDecision":"ask"');
  });

  it('gh 唯讀指令／查看 PR 的 API → 放行', () => {
    expect(runHook('guard-main-push.sh', 'gh pr view 1', devRepo)).toBe('');
    expect(runHook('guard-main-push.sh', 'gh pr list', devRepo)).toBe('');
    expect(runHook('guard-main-push.sh', 'gh run list --branch dev -L 3', devRepo)).toBe('');
    expect(runHook('guard-main-push.sh', 'curl https://api.github.com/repos/Sabine630/auris-app/pulls/1', devRepo)).toBe('');
  });
});

describe('check-version-bump', () => {
  it('標準形式：src 有異動未版更 → 擋下', () => {
    expect(runHook('check-version-bump.sh', 'git commit -m "Fix: x"', unbumped)).toContain('"permissionDecision":"deny"');
  });

  it('git -C <repo> commit → 同樣擋下（舊版繞過案例）', () => {
    expect(runHook('check-version-bump.sh', `git -C ${unbumped} commit -m "Fix: x"`, unbumped)).toContain('"permissionDecision":"deny"');
  });

  it('長參數分離形式 --git-dir <path> commit → 同樣擋下', () => {
    expect(runHook('check-version-bump.sh', 'git --git-dir .git commit -m "Fix: x"', unbumped)).toContain('"permissionDecision":"deny"');
  });

  it('[skip-ver] 逃生口／非 commit 指令 → 放行', () => {
    expect(runHook('check-version-bump.sh', 'git commit -m "wip [skip-ver]"', unbumped)).toBe('');
    expect(runHook('check-version-bump.sh', 'git push origin dev', unbumped)).toBe('');
  });
});

describe('check-secret-leak', () => {
  it('標準形式：staged 含金鑰 → 擋下並點名檔案', () => {
    const out = runHook('check-secret-leak.sh', 'git commit -m "x"', leaky);
    expect(out).toContain('"permissionDecision":"deny"');
    expect(out).toContain('leak.js');
  });

  it('git -C <repo> commit → 同樣擋下（舊版繞過案例）', () => {
    expect(runHook('check-secret-leak.sh', `git -C ${leaky} commit -m "x"`, leaky)).toContain('"permissionDecision":"deny"');
  });

  it('長參數分離形式 --git-dir <path> commit → 同樣擋下', () => {
    expect(runHook('check-secret-leak.sh', 'git --git-dir .git commit -m "x"', leaky)).toContain('"permissionDecision":"deny"');
  });

  it('[skip-secret] 逃生口／乾淨 staged → 放行', () => {
    expect(runHook('check-secret-leak.sh', 'git commit -m "x [skip-secret]"', leaky)).toBe('');
    expect(runHook('check-secret-leak.sh', 'git commit -m "x"', unbumped)).toBe('');
  });
});
