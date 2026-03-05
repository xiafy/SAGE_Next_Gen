#!/usr/bin/env bash
# .sage/auto-review.sh — 自动化双路 Code Review (DEC-075 Step 3)
# 由 cron 或 SAGE 手动调用
# 流程: 检测 pr_created 任务 → spawn Codex + Opus 审查 → 更新 registry
#
# 用法:
#   ./auto-review.sh scan          检测并触发审查
#   ./auto-review.sh review <task-id> <pr-num>   手动触发单任务审查
#   ./auto-review.sh prompt <pr-num>             生成审查 prompt（调试用）

set -euo pipefail

SAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
REGISTRY="$SAGE_DIR/active-tasks.json"
PROJECT_ROOT="$(cd "$SAGE_DIR/.." && pwd)"
TASK_MGR="$SAGE_DIR/task-manager.sh"

if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  GREEN=''; YELLOW=''; RED=''; CYAN=''; NC=''
fi

log()  { printf "%b✓%b %s\n" "$GREEN" "$NC" "$*"; }
warn() { printf "%b⚠%b %s\n" "$YELLOW" "$NC" "$*"; }
err()  { printf "%b✗%b %s\n" "$RED" "$NC" "$*" >&2; }
info() { printf "%b→%b %s\n" "$CYAN" "$NC" "$*"; }

command -v jq &>/dev/null || { err "需要 jq"; exit 1; }
command -v gh &>/dev/null || { err "需要 gh CLI"; exit 1; }

# 生成审查 prompt
generate_review_prompt() {
  local pr_num="$1"
  local reviewer="$2"  # codex | opus
  local task_desc="${3:-}"

  cd "$PROJECT_ROOT"

  # 获取 PR diff
  local diff
  diff=$(gh pr diff "$pr_num" --patch 2>/dev/null || echo "")
  if [[ -z "$diff" ]]; then
    err "无法获取 PR #$pr_num 的 diff"
    return 1
  fi

  # 获取 PR 信息
  local pr_title pr_body
  pr_title=$(gh pr view "$pr_num" --json title --jq '.title' 2>/dev/null || echo "Unknown")
  pr_body=$(gh pr view "$pr_num" --json body --jq '.body' 2>/dev/null || echo "")

  # 获取变更文件列表
  local files_changed
  files_changed=$(gh pr view "$pr_num" --json files --jq '.files[].path' 2>/dev/null || echo "")

  # 是否涉及 UI（.tsx 文件）
  local has_ui="false"
  echo "$files_changed" | grep -q '\.tsx$' && has_ui="true"

  # 是否涉及 Worker
  local has_worker="false"
  echo "$files_changed" | grep -q '^worker/' && has_worker="true"

  # 是否涉及 shared types
  local has_types="false"
  echo "$files_changed" | grep -q 'shared/types' && has_types="true"

  case "$reviewer" in
    codex)
      cat << PROMPT
你是 SAGE 项目的代码审查员（Codex 角色）。请严格审查以下 PR。

## PR 信息
- **标题**: $pr_title
- **描述**: $pr_body
- **任务**: $task_desc
- **涉及 UI**: $has_ui
- **涉及 Worker**: $has_worker
- **涉及 shared/types**: $has_types

## 审查重点（Codex 职责）
1. **逻辑正确性**：边界 case、race condition、状态机死路
2. **类型一致性**：shared/types.ts 变更是否前后端同步
3. **错误处理**：API 失败、网络超时、用户输入异常
4. **性能**：不必要的重渲染、内存泄漏、O(n²) 算法

## 变更文件
$files_changed

## Diff
\`\`\`diff
$diff
\`\`\`

## 输出格式
请严格按以下 JSON 格式输出（不要输出其他内容）：

\`\`\`json
{
  "verdict": "pass" 或 "critical",
  "critical": ["问题描述1", "问题描述2"],
  "major": ["问题描述"],
  "minor": ["建议"],
  "score": 7,
  "summary": "一句话总结"
}
\`\`\`

如果没有 critical 问题，verdict 为 "pass"。
如果有任何 critical 问题，verdict 为 "critical"。
PROMPT
      ;;
    opus)
      cat << PROMPT
你是 SAGE 项目的代码审查员（Opus 角色）。请审查以下 PR，重点关注产品规格一致性和安全性。

## PR 信息
- **标题**: $pr_title
- **描述**: $pr_body
- **任务**: $task_desc

## 审查重点（Opus 职责）
1. **PRD AC 一致性**：变更是否符合产品需求（参考 docs/product/prd.md）
2. **安全性**：API Key 暴露、XSS、CSRF、输入未校验
3. **UX 一致性**：移动端适配、品牌色 #6366F1、交互模式统一
4. **文档同步**：代码变更是否需要同步更新文档

## 变更文件
$files_changed

## Diff
\`\`\`diff
$diff
\`\`\`

## 输出格式
请严格按以下 JSON 格式输出（不要输出其他内容）：

\`\`\`json
{
  "verdict": "pass" 或 "critical",
  "critical": ["问题描述1"],
  "major": ["问题描述"],
  "minor": ["建议"],
  "score": 7,
  "summary": "一句话总结"
}
\`\`\`

如果没有 critical 问题，verdict 为 "pass"。
PROMPT
      ;;
  esac
}

# 发起审查（输出 prompt 供 SAGE 的 sessions_spawn 使用）
do_review() {
  local task_id="$1"
  local pr_num="$2"
  local task_desc="${3:-}"

  info "生成审查 prompt: $task_id (PR #$pr_num)"

  # 更新状态为 reviewing
  bash "$TASK_MGR" update "$task_id" status reviewing

  # 生成 prompt 文件
  local codex_prompt opus_prompt
  codex_prompt="$SAGE_DIR/review-prompts/${task_id}-codex.md"
  opus_prompt="$SAGE_DIR/review-prompts/${task_id}-opus.md"
  mkdir -p "$SAGE_DIR/review-prompts"

  generate_review_prompt "$pr_num" "codex" "$task_desc" > "$codex_prompt"
  generate_review_prompt "$pr_num" "opus" "$task_desc" > "$opus_prompt"

  log "Codex prompt: $codex_prompt"
  log "Opus prompt: $opus_prompt"

  # 输出供 SAGE 使用的 sessions_spawn 指令
  echo ""
  echo "📋 请 SAGE 执行以下命令触发审查:"
  echo ""
  echo "  # Codex 审查"
  echo "  sessions_spawn model=codex mode=run label=review-${task_id}-codex task=\$(cat $codex_prompt)"
  echo ""
  echo "  # Opus 审查"
  echo "  sessions_spawn model=opus mode=run label=review-${task_id}-opus task=\$(cat $opus_prompt)"
  echo ""
  echo "  # 审查完成后更新 registry:"
  echo "  task-manager.sh update $task_id codexReview pass|critical"
  echo "  task-manager.sh update $task_id opusReview pass|critical"
}

action="${1:-help}"

case "$action" in
  scan)
    info "扫描待审查的任务..."
    
    # 先运行 check 更新 PR 状态
    bash "$TASK_MGR" check

    # 查找 pr_created 状态（有 PR 但还没审查）的任务
    tasks_to_review=$(jq -r '.tasks[] | select(.status == "pr_created") | "\(.id)\t\(.pr)\t\(.description)"' "$REGISTRY")

    if [[ -z "$tasks_to_review" ]]; then
      echo "没有待审查的任务"
      exit 0
    fi

    count=0
    while IFS=$'\t' read -r tid pr desc; do
      [[ -z "$tid" ]] && continue
      info "发现待审查任务: $tid (PR #$pr)"
      do_review "$tid" "$pr" "$desc"
      count=$((count + 1))
    done <<< "$tasks_to_review"

    log "共 $count 个任务待审查"
    ;;

  review)
    task_id="${2:-}"; pr_num="${3:-}"
    [[ -z "$task_id" || -z "$pr_num" ]] && { err "用法: $0 review <task-id> <pr-num>"; exit 1; }
    desc=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .description' "$REGISTRY" 2>/dev/null || echo "")
    do_review "$task_id" "$pr_num" "$desc"
    ;;

  prompt)
    pr_num="${2:-}"; reviewer="${3:-codex}"
    [[ -z "$pr_num" ]] && { err "用法: $0 prompt <pr-num> [codex|opus]"; exit 1; }
    generate_review_prompt "$pr_num" "$reviewer"
    ;;

  help|*)
    echo "用法: $0 <action> [args...]"
    echo ""
    echo "Actions:"
    echo "  scan                        扫描并触发所有待审查任务"
    echo "  review <task-id> <pr-num>   手动触发单任务审查"
    echo "  prompt <pr-num> [reviewer]  生成审查 prompt（调试用）"
    ;;
esac
