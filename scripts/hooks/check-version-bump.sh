#!/bin/bash
# PreToolUse(Bash) hook：git commit 前把關版更 checklist。
# 只有 staged 內容含 auris-vue/src/ 才檢查；[skip-ver] 是明確逃生口。
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

# shellcheck source=scripts/hooks/lib.sh
. "$(dirname "$0")/lib.sh"
git_cmd_has_subcommand "$cmd" commit || exit 0
case "$cmd" in
  *"[skip-ver]"*) exit 0 ;;
esac

project_dir="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$project_dir" ]; then
  project_dir=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
fi
cd "$project_dir" || exit 0
staged=$(git -c core.quotepath=false diff --cached --name-only)

printf '%s\n' "$staged" | grep -q '^auris-vue/src/' || exit 0

problems=""
git diff --cached -U0 -- auris-vue/src/version.js 2>/dev/null | grep -q "^+.*APP_VERSION = 'P" \
  || problems="${problems}①version.js 的 APP_VERSION 未 +1；"

printf '%s\n' "$staged" | grep -qF 'Auris 完整開發進度總覽.md' \
  || problems="${problems}②「Auris 完整開發進度總覽.md」未加入本次 commit；"

count=$(grep -c '當前版本' 'Auris 完整開發進度總覽.md' 2>/dev/null)
[ "$count" != "2" ] && problems="${problems}③「當前版本」在進度總覽出現 ${count} 次（應為 2：檔頭＋最新節）；"

if [ -n "$problems" ]; then
  reason="版更 checklist 未完成：${problems}請先完成版更（可執行 /bump），或於 commit 訊息加 [skip-ver] 略過本檢查。"
  jq -cn --arg r "$reason" '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$r}}'
fi
exit 0
