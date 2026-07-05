#!/bin/bash
# PreToolUse(Bash) hook：git commit 前把關版更 checklist（CLAUDE.md 第 1、2 項＋防呆原則 1）。
# 只有 commit 內含 auris-vue/src/ 的異動才檢查；純文件 commit 直接放行。
# 逃生口：commit 訊息含 [skip-ver] 時跳過（例如 WIP、還原類 commit）。
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

case "$cmd" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac
case "$cmd" in
  *"[skip-ver]"*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
staged=$(git -c core.quotepath=false diff --cached --name-only)

printf '%s\n' "$staged" | grep -q '^auris-vue/src/' || exit 0

problems=""

git diff --cached -U0 -- auris-vue/src/views/SettingsView.vue 2>/dev/null | grep -q '^+.*Auris · P' \
  || problems="${problems}①SettingsView.vue 版號未 +1；"

printf '%s\n' "$staged" | grep -qF 'Auris 完整開發進度總覽.md' \
  || problems="${problems}②「Auris 完整開發進度總覽.md」未加入本次 commit；"

count=$(grep -c '當前版本' 'Auris 完整開發進度總覽.md' 2>/dev/null)
[ "$count" != "2" ] && problems="${problems}③「當前版本」在進度總覽出現 ${count} 次（應為 2：檔頭＋最新節）；"

if [ -n "$problems" ]; then
  reason="版更 checklist 未完成：${problems}請先完成版更（可執行 /bump），或於 commit 訊息加 [skip-ver] 略過本檢查。"
  jq -cn --arg r "$reason" '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$r}}'
fi
exit 0
