#!/bin/bash
# PreToolUse(Bash) hook：凡是會推送到 main 的指令，一律轉為向使用者確認。
# 依據 CLAUDE.md：「絕對不可在未經確認的情況下推送到 main」。
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)

if printf '%s' "$cmd" | grep -qE '(^|[^[:alnum:]_-])main([^[:alnum:]_-]|$)' || [ "$branch" = "main" ]; then
  cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"⚠️ 此指令會推送到 main（對外正式版 GitHub Pages）。請確認使用者已明確同意發布正式版，再放行。"}}
EOF
fi
exit 0
