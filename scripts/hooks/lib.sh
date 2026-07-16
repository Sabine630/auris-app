#!/bin/bash
# 共用：判斷指令字串是否含「git [全域選項…] <子指令>」。
# 舊版只比對連續字串 "git push"／"git commit"，`git -C <repo> push origin main`
# 這類帶全域選項的寫法會整個繞過防線（實測確認）。這裡允許子指令前出現：
#   - -C <path>、-c key=val（含單／雙引號值）
#   - 會吃下一個 token 的長參數分離形式：--git-dir <path>、--work-tree <path>、
#     --namespace <name>、--super-prefix <p>、--config-env <k>=<env>
#     （復查實測 `git --git-dir .git push` 可繞過 --long[=val] 寫法，故明列；
#     不能「所有 --long 都吞下一個 token」——`--no-pager push` 的 push 會被
#     當成參數吃掉，反而漏擋）
#   - 其他 --long 或 --long=val、-x 短旗標
# 誤判方向偏保守：字串裡引用到 "git push" 之類文字頂多多問一次，不會漏擋。
# 用法：git_cmd_has_subcommand "$cmd" push
git_cmd_has_subcommand() {
  _gchs_cmd=$1
  _gchs_sub=$2
  _gchs_tok='("[^"]*"|'\''[^'\'']*'\''|[^[:space:]]+)'
  _gchs_opt='(-C[[:space:]]+'"${_gchs_tok}"'|-c[[:space:]]+'"${_gchs_tok}"'|--(git-dir|work-tree|namespace|super-prefix|config-env)([[:space:]]+'"${_gchs_tok}"'|=[^[:space:]]*)|--[A-Za-z0-9-]+(=[^[:space:]]*)?|-[A-Za-z0-9])'
  printf '%s' "$_gchs_cmd" | grep -qE "(^|[;&|[:space:](])git([[:space:]]+${_gchs_opt})*[[:space:]]+${_gchs_sub}([[:space:]]|\$|;|&|\|)"
}
