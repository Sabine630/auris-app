#!/bin/bash
# PreToolUse(Bash) hook：凡是會推送到 main 的指令，一律轉為向使用者確認。
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

# shellcheck source=scripts/hooks/lib.sh
. "$(dirname "$0")/lib.sh"
git_cmd_has_subcommand "$cmd" push || exit 0

project_dir="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$project_dir" ]; then
  project_dir=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
fi
branch=$(git -C "$project_dir" branch --show-current 2>/dev/null)

if printf '%s' "$cmd" | grep -qE '(^|[^[:alnum:]_-])main([^[:alnum:]_-]|$)' || [ "$branch" = "main" ]; then
  cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"⚠️ 此指令會推送到 main（對外正式版 GitHub Pages）。請確認使用者已在本次對話明確同意發布正式版，再放行。"}}
EOF
fi
exit 0
