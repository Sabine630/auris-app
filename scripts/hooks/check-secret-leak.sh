#!/bin/bash
# PreToolUse(Bash) hook：git commit 前掃描 staged 新增行有無 API 金鑰／私鑰。
# 只報檔名，不輸出疑似憑證內容；[skip-secret] 是確認誤報後的逃生口。
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

# shellcheck source=scripts/hooks/lib.sh
. "$(dirname "$0")/lib.sh"
git_cmd_has_subcommand "$cmd" commit || exit 0
case "$cmd" in
  *"[skip-secret]"*) exit 0 ;;
esac

project_dir="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$project_dir" ]; then
  project_dir=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
fi
cd "$project_dir" || exit 0

pattern='sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[bap]-[0-9A-Za-z-]{20,}'

bad_files=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  git diff --cached -U0 -- "$f" | grep '^+' | grep -v 'sk-demo-' | grep -qE "$pattern" \
    && bad_files="${bad_files}「${f}」"
done <<EOF
$(git -c core.quotepath=false diff --cached --name-only)
EOF

if [ -n "$bad_files" ]; then
  reason="🔑 疑似 API 金鑰／私鑰出現在本次 commit 的新增內容：${bad_files}。請移除金鑰再 commit；若確認是假金鑰或文件範例，可於 commit 訊息加 [skip-secret] 略過。"
  jq -cn --arg r "$reason" '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$r}}'
fi
exit 0
