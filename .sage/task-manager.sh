#!/usr/bin/env bash
# .sage/task-manager.sh — Agent 任务 Registry 管理
# 用法:
#   ./task-manager.sh add <task-id> <agent> <model> <description>
#   ./task-manager.sh update <task-id> <field> <value>
#   ./task-manager.sh status [task-id]
#   ./task-manager.sh check              # cron 调用：扫描所有任务状态

set -euo pipefail

SAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
REGISTRY="$SAGE_DIR/active-tasks.json"
PROJECT_ROOT="$(cd "$SAGE_DIR/.." && pwd)"

# TTY 颜色
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  GREEN=''; YELLOW=''; RED=''; CYAN=''; NC=''
fi

log()  { printf "%b✓%b %s\n" "$GREEN" "$NC" "$*"; }
warn() { printf "%b⚠%b %s\n" "$YELLOW" "$NC" "$*"; }
err()  { printf "%b✗%b %s\n" "$RED" "$NC" "$*" >&2; }
info() { printf "%b→%b %s\n" "$CYAN" "$NC" "$*"; }

# 确保 registry 存在
[[ -f "$REGISTRY" ]] || echo '{"tasks":[]}' > "$REGISTRY"

# 需要 jq
command -v jq &>/dev/null || { err "需要 jq，请安装: brew install jq"; exit 1; }

action="${1:-help}"
shift || true

case "$action" in
  add)
    task_id="${1:-}"; agent="${2:-}"; model="${3:-}"; description="${4:-}"
    
    if [[ -z "$task_id" || -z "$agent" || -z "$model" || -z "$description" ]]; then
      err "用法: $0 add <task-id> <agent> <model> <description>"
      exit 1
    fi

    [[ "$task_id" =~ ^[a-zA-Z0-9._-]+$ ]] || { err "task-id 只允许 [a-zA-Z0-9._-]"; exit 1; }
    [[ "$agent" =~ ^(claude-code|codex)$ ]] || { err "agent 必须是 claude-code 或 codex"; exit 1; }

    # 检查是否已存在
    existing=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .id' "$REGISTRY")
    if [[ -n "$existing" ]]; then
      err "任务已存在: $task_id"
      exit 1
    fi

    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    worktree_base="$(dirname "$PROJECT_ROOT")"

    jq --arg id "$task_id" \
       --arg branch "feat/$task_id" \
       --arg wt "$worktree_base/sage-$task_id" \
       --arg agent "$agent" \
       --arg model "$model" \
       --arg desc "$description" \
       --arg now "$now" \
       '.tasks += [{
         id: $id, branch: $branch, worktree: $wt,
         agent: $agent, model: $model, sessionKey: null,
         description: $desc, relatedDocs: [], ac: [],
         startedAt: $now, completedAt: null,
         status: "running", pr: null,
         checks: { ciPassed: null, codexReview: null, opusReview: null },
         retries: 0, maxRetries: 2, note: null
       }]' "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"

    log "任务已注册: $task_id ($agent/$model)"
    ;;

  update)
    task_id="${1:-}"; field="${2:-}"; value="${3:-}"

    if [[ -z "$task_id" || -z "$field" ]]; then
      err "用法: $0 update <task-id> <field> <value>"
      exit 1
    fi

    # 验证任务存在
    existing=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .id' "$REGISTRY")
    [[ -n "$existing" ]] || { err "任务不存在: $task_id"; exit 1; }

    # 根据字段类型处理值
    case "$field" in
      status|sessionKey|note|codexReview|opusReview)
        jq --arg id "$task_id" --arg f "$field" --arg v "$value" \
          '(.tasks[] | select(.id == $id))[$f] = $v' "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
        ;;
      pr|retries)
        jq --arg id "$task_id" --arg f "$field" --argjson v "$value" \
          '(.tasks[] | select(.id == $id))[$f] = $v' "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
        ;;
      ciPassed)
        jq --arg id "$task_id" --argjson v "$value" \
          '(.tasks[] | select(.id == $id)).checks.ciPassed = $v' "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
        ;;
      *)
        err "未知字段: $field (支持: status, sessionKey, pr, retries, note, ciPassed, codexReview, opusReview)"
        exit 1
        ;;
    esac

    log "已更新: $task_id.$field = $value"
    ;;

  status)
    task_id="${1:-}"

    if [[ -n "$task_id" ]]; then
      jq --arg id "$task_id" '.tasks[] | select(.id == $id)' "$REGISTRY"
    else
      echo "📋 Agent 任务 Registry"
      echo ""
      total=$(jq '.tasks | length' "$REGISTRY")
      running=$(jq '[.tasks[] | select(.status == "running")] | length' "$REGISTRY")
      reviewing=$(jq '[.tasks[] | select(.status == "reviewing")] | length' "$REGISTRY")
      ready=$(jq '[.tasks[] | select(.status == "ready")] | length' "$REGISTRY")
      
      printf "总任务: %d | 运行中: %d | 审查中: %d | 待合并: %d\n" "$total" "$running" "$reviewing" "$ready"
      echo ""

      if [[ "$total" -gt 0 ]]; then
        jq -r '.tasks[] | "  \(.status | if . == "running" then "🔄" elif . == "ready" then "✅" elif . == "reviewing" then "🔍" elif . == "failed" then "❌" else "⬜" end) \(.id) [\(.agent)/\(.model)] — \(.description)"' "$REGISTRY"
      fi
    fi
    ;;

  check)
    # cron 调用：扫描所有 running/pr_created 任务
    info "开始任务状态扫描..."
    cd "$PROJECT_ROOT"

    changes=0
    for task_id in $(jq -r '.tasks[] | select(.status == "running" or .status == "pr_created") | .id' "$REGISTRY"); do
      branch=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .branch' "$REGISTRY")
      status=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .status' "$REGISTRY")

      # 检查是否有 PR
      pr_num=$(gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null || echo "")

      if [[ -n "$pr_num" && "$status" == "running" ]]; then
        # 发现新 PR
        jq --arg id "$task_id" --argjson pr "$pr_num" \
          '(.tasks[] | select(.id == $id)) |= (.status = "pr_created" | .pr = $pr)' \
          "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
        log "$task_id: 发现 PR #$pr_num"
        changes=$((changes + 1))
      fi

      if [[ -n "$pr_num" ]]; then
        # 检查 CI 状态
        ci_status=$(gh pr checks "$pr_num" --json state --jq '.[].state' 2>/dev/null | sort -u || echo "")
        if echo "$ci_status" | grep -q "FAILURE"; then
          jq --arg id "$task_id" '(.tasks[] | select(.id == $id)).checks.ciPassed = false' \
            "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
          warn "$task_id: CI 失败"
          changes=$((changes + 1))
        elif echo "$ci_status" | grep -q "SUCCESS"; then
          jq --arg id "$task_id" '(.tasks[] | select(.id == $id)).checks.ciPassed = true' \
            "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
          log "$task_id: CI 通过"
          changes=$((changes + 1))
        fi

        # 检查是否所有 checks 通过 → ready
        all_pass=$(jq -r --arg id "$task_id" '
          .tasks[] | select(.id == $id) |
          if .checks.ciPassed == true and .checks.codexReview == "pass" and .checks.opusReview == "pass"
          then "yes" else "no" end
        ' "$REGISTRY")

        if [[ "$all_pass" == "yes" ]]; then
          jq --arg id "$task_id" '(.tasks[] | select(.id == $id)).status = "ready"' \
            "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
          log "$task_id: ✅ 全部通过，Ready to merge!"
          changes=$((changes + 1))
        fi
      fi
    done

    if [[ $changes -eq 0 ]]; then
      echo "无状态变更"
    else
      log "扫描完成，$changes 项更新"
    fi
    ;;

  remove)
    task_id="${1:-}"
    [[ -n "$task_id" ]] || { err "用法: $0 remove <task-id>"; exit 1; }

    jq --arg id "$task_id" '.tasks = [.tasks[] | select(.id != $id)]' \
      "$REGISTRY" > "$REGISTRY.tmp" && mv "$REGISTRY.tmp" "$REGISTRY"
    log "任务已移除: $task_id"
    ;;

  help|*)
    echo "用法: $0 <action> [args...]"
    echo ""
    echo "Actions:"
    echo "  add <id> <agent> <model> <desc>   注册新任务"
    echo "  update <id> <field> <value>        更新任务字段"
    echo "  status [id]                        查看任务状态"
    echo "  check                              cron: 扫描所有任务"
    echo "  remove <id>                        移除任务记录"
    ;;
esac
