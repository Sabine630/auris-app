#!/bin/bash
# PreToolUse(Bash) hook：git commit 前掃描 staged 新增行有無 API 金鑰／私鑰。
# BYOK 專案最常見的資安事故就是測試金鑰誤 commit——推上公開 repo 等於金鑰作廢。
# 只報「哪個檔案」，絕不把疑似金鑰內容本身寫進訊息。
# 逃生口：確認是假金鑰／文件範例時，commit 訊息加 [skip-secret]。
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

case "$cmd" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac
case "$cmd" in
  *"[skip-secret]"*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# 金鑰特徵：Anthropic/OpenAI/OpenRouter（sk-…）、Google（AIza…）、私鑰區塊、
# GitHub token、AWS access key、Slack token
pattern='sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|xox[bap]-[0-9A-Za-z-]{20,}'

bad_files=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  # sk-demo- 是示範模式的刻意假金鑰（demoData.js），屬已知白名單
  git diff --cached -U0 -- "$f" | grep '^+' | grep -v 'sk-demo-' | grep -qE "$pattern" \
    && bad_files="${bad_files}「${f}」"
done <<EOF
$(git -c core.quotepath=false diff --cached --name-only -- . ':(exclude).claude/hooks')
EOF

if [ -n "$bad_files" ]; then
  reason="🔑 疑似 API 金鑰／私鑰出現在本次 commit 的新增內容：${bad_files}。請移除金鑰（改用設定頁 BYOK 或環境變數）再 commit；若確認是假金鑰或文件範例，可於 commit 訊息加 [skip-secret] 略過。"
  jq -cn --arg r "$reason" '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$r}}'
fi
exit 0
