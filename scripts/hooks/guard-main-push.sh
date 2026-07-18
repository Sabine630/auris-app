#!/bin/bash
# PreToolUse(Bash) hook：凡是會更新 main 的指令，一律轉為向使用者確認。
# 兩條路徑都要攔：
#   1. git push 到 main（舊流程／繞道直推）
#   2. 合併 dev→main PR（PR 流程下的正式發布動作：GitHub merge API 或 gh pr merge）
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

ask_confirm() {
  cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"⚠️ 此指令會更新 main（對外正式版 GitHub Pages）。請確認使用者已在本次對話明確同意發布正式版，再放行。"}}
EOF
}

# PR 合併：GitHub REST（PUT …/pulls/{n}/merge）或 gh pr merge
if printf '%s' "$cmd" | grep -qE 'pulls/[0-9]+/merge|gh[[:space:]]+pr[[:space:]]+merge'; then
  ask_confirm
  exit 0
fi

# shellcheck source=scripts/hooks/lib.sh
. "$(dirname "$0")/lib.sh"
git_cmd_has_subcommand "$cmd" push || exit 0

project_dir="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$project_dir" ]; then
  project_dir=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
fi
branch=$(git -C "$project_dir" branch --show-current 2>/dev/null)

if printf '%s' "$cmd" | grep -qE '(^|[^[:alnum:]_-])main([^[:alnum:]_-]|$)' || [ "$branch" = "main" ]; then
  ask_confirm
fi
exit 0
