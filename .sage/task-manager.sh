#!/usr/bin/env bash
# .sage/task-manager.sh — Agent 任务 Registry 管理 (v2, post-review)
set -euo pipefail

SAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
REGISTRY="$SAGE_DIR/active-tasks.json"
LOCKDIR="$REGISTRY.lock"
PROJECT_ROOT="$(cd "$SAGE_DIR/.." && pwd)"

if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  GREEN=''; YELLOW=''; RED=''; CYAN=''; NC=''
fi

log()  { printf "%b✓%b %s\n" "$GREEN" "$NC" "$*"; }
warn() { printf "%b⚠%b %s\n" "$YELLOW" "$NC" "$*"; }
err()  { printf "%b✗%b %s\n" "$RED" "$NC" "$*" >&2; }
info() { printf "%b→%b %s\n" "$CYAN" "$NC" "$*"; }

[[ -f "$REGISTRY" ]] || echo '{"tasks":[]}' > "$REGISTRY"
command -v jq &>/dev/null || { err "需要 jq: brew install jq"; exit 1; }

# [C1+C2] mkdir 原子锁 (macOS 兼容)
acquire_lock() {
  local i=0
  while ! mkdir "$LOCKDIR" 2>/dev/null; do
    i=$((i + 1))
    [[ $i -ge 10 ]] && { err "锁超时: $LOCKDIR"; return 1; }
    sleep 1
  done
}
release_lock() { rm -rf "$LOCKDIR"; }

# 原子写：加锁 → jq → mktemp → mv → 解锁
# 用法: atomic_jq '<filter>' --arg k v ...
atomic_jq() {
  local filter="$1"; shift
  acquire_lock
  local tmpfile
  tmpfile=$(mktemp "${REGISTRY}.XXXXXX")
  if jq "$filter" "$@" "$REGISTRY" > "$tmpfile"; then
    mv "$tmpfile" "$REGISTRY"
    release_lock
  else
    rm -f "$tmpfile"
    release_lock
    err "jq 操作失败"
    return 1
  fi
}

gh_timeout() {
  command -v gh &>/dev/null || { err "gh CLI 不可用"; return 1; }
  timeout 10 gh "$@" 2>/dev/null || true
}

now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

action="${1:-help}"
shift || true

case "$action" in
  add)
    task_id="${1:-}"; agent="${2:-}"; model="${3:-}"; description="${4:-}"
    [[ -z "$task_id" || -z "$agent" || -z "$model" || -z "$description" ]] && { err "用法: $0 add <task-id> <agent> <model> <description>"; exit 1; }
    [[ "$task_id" =~ ^[a-zA-Z0-9._-]+$ ]] || { err "task-id 只允许 [a-zA-Z0-9._-]"; exit 1; }
    [[ "$agent" =~ ^(claude-code|codex)$ ]] || { err "agent 必须是 claude-code 或 codex"; exit 1; }

    existing=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .id' "$REGISTRY")
    [[ -n "$existing" ]] && { err "任务已存在: $task_id"; exit 1; }

    worktree_base="$(dirname "$PROJECT_ROOT")"

    atomic_jq '.tasks += [{
      id: $id, branch: $branch, worktree: $wt,
      agent: $agent, model: $model, sessionKey: null,
      description: $desc, relatedDocs: [], ac: [],
      startedAt: $now, completedAt: null,
      status: "running", pr: null,
      checks: { ciPassed: null, codexReview: null, opusReview: null },
      retries: 0, maxRetries: 2, note: null
    }]' \
      --arg id "$task_id" --arg branch "feat/$task_id" \
      --arg wt "$worktree_base/sage-$task_id" \
      --arg agent "$agent" --arg model "$model" \
      --arg desc "$description" --arg now "$(now_iso)"

    log "任务已注册: $task_id ($agent/$model)"
    ;;

  update)
    task_id="${1:-}"; field="${2:-}"; value="${3:-}"
    [[ -z "$task_id" || -z "$field" ]] && { err "用法: $0 update <task-id> <field> <value>"; exit 1; }

    existing=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .id' "$REGISTRY")
    [[ -n "$existing" ]] || { err "任务不存在: $task_id"; exit 1; }

    case "$field" in
      status|sessionKey|note)
        atomic_jq '(.tasks[] | select(.id == $id))[$f] = $v' \
          --arg id "$task_id" --arg f "$field" --arg v "$value"
        # [m1] completedAt on terminal states
        if [[ "$field" == "status" ]] && [[ "$value" == "ready" || "$value" == "merged" || "$value" == "failed" ]]; then
          atomic_jq '(.tasks[] | select(.id == $id)).completedAt = $now' \
            --arg id "$task_id" --arg now "$(now_iso)"
        fi
        ;;
      pr|retries)
        atomic_jq '(.tasks[] | select(.id == $id))[$f] = $v' \
          --arg id "$task_id" --arg f "$field" --argjson v "$value"
        ;;
      ciPassed)
        atomic_jq '(.tasks[] | select(.id == $id)).checks.ciPassed = $v' \
          --arg id "$task_id" --argjson v "$value"
        ;;
      codexReview|opusReview)
        # [C3 fix] 写入 .checks 而非顶层
        atomic_jq '(.tasks[] | select(.id == $id)).checks[$f] = $v' \
          --arg id "$task_id" --arg f "$field" --arg v "$value"
        ;;
      *)
        err "未知字段: $field"; exit 1 ;;
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
      [[ "$total" -gt 0 ]] && jq -r '.tasks[] | "  \(.status | if . == "running" then "🔄" elif . == "ready" then "✅" elif . == "reviewing" then "🔍" elif . == "pr_created" then "📬" elif . == "merged" then "🟣" elif . == "failed" then "❌" else "⬜" end) \(.id) [\(.agent)/\(.model)] — \(.description)"' "$REGISTRY"
    fi
    ;;

  check)
    command -v gh &>/dev/null || { err "gh CLI 不可用"; exit 1; }
    gh auth status &>/dev/null || { err "gh 未登录"; exit 1; }
    info "开始任务状态扫描..."
    cd "$PROJECT_ROOT"

    changes=0
    # [C4+M4] 一次性读快照，含 reviewing
    task_snapshot=$(jq -r '.tasks[] | select(.status == "running" or .status == "pr_created" or .status == "reviewing") | "\(.id)\t\(.branch)\t\(.status)"' "$REGISTRY")

    while IFS=$'\t' read -r tid branch status; do
      [[ -z "$tid" ]] && continue

      # [M3] 过滤 "null"
      pr_num=$(gh_timeout pr list --head "$branch" --json number --jq '.[0].number')
      [[ "$pr_num" == "null" || -z "$pr_num" ]] && pr_num=""

      if [[ -n "$pr_num" && "$status" == "running" ]]; then
        atomic_jq '(.tasks[] | select(.id == $id)) |= (.status = "pr_created" | .pr = $pr)' \
          --arg id "$tid" --argjson pr "$pr_num"
        log "$tid: 发现 PR #$pr_num"; changes=$((changes + 1))
      fi

      if [[ -n "$pr_num" ]]; then
        ci_states=$(gh_timeout pr checks "$pr_num" --json state --jq '.[].state' | sort -u)
        if echo "$ci_states" | grep -q "FAILURE"; then
          atomic_jq '(.tasks[] | select(.id == $id)).checks.ciPassed = false' --arg id "$tid"
          warn "$tid: CI 失败"; changes=$((changes + 1))
        elif [[ -n "$ci_states" ]] && ! echo "$ci_states" | grep -qE "PENDING|QUEUED|IN_PROGRESS"; then
          atomic_jq '(.tasks[] | select(.id == $id)).checks.ciPassed = true' --arg id "$tid"
          log "$tid: CI 通过"; changes=$((changes + 1))
        fi

        # merged 检测
        pr_state=$(gh_timeout pr view "$pr_num" --json state --jq '.state')
        if [[ "$pr_state" == "MERGED" ]]; then
          atomic_jq '(.tasks[] | select(.id == $id)) |= (.status = "merged" | .completedAt = $now)' \
            --arg id "$tid" --arg now "$(now_iso)"
          log "$tid: PR 已 merged"; changes=$((changes + 1)); continue
        fi

        # ready 检测
        all_pass=$(jq -r --arg id "$tid" '.tasks[] | select(.id == $id) | if .checks.ciPassed == true and .checks.codexReview == "pass" and .checks.opusReview == "pass" then "yes" else "no" end' "$REGISTRY")
        if [[ "$all_pass" == "yes" ]]; then
          atomic_jq '(.tasks[] | select(.id == $id)) |= (.status = "ready" | .completedAt = $now)' \
            --arg id "$tid" --arg now "$(now_iso)"
          log "$tid: 全部通过，Ready!"; changes=$((changes + 1))
        fi
      fi
    done <<< "$task_snapshot"

    [[ $changes -eq 0 ]] && echo "无状态变更" || log "扫描完成，$changes 项更新"
    ;;

  remove)
    task_id="${1:-}"
    [[ -n "$task_id" ]] || { err "用法: $0 remove <task-id>"; exit 1; }
    status=$(jq -r --arg id "$task_id" '.tasks[] | select(.id == $id) | .status' "$REGISTRY" 2>/dev/null || echo "")
    [[ "$status" == "running" ]] && warn "任务 $task_id 仍在运行中"
    atomic_jq '.tasks = [.tasks[] | select(.id != $id)]' --arg id "$task_id"
    log "任务已移除: $task_id"
    ;;

  help|*)
    echo "用法: $0 <action> [args...]"
    echo "  add <id> <agent> <model> <desc>   注册任务"
    echo "  update <id> <field> <value>        更新字段"
    echo "  status [id]                        查看状态"
    echo "  check                              cron 扫描"
    echo "  remove <id>                        移除任务"
    ;;
esac
