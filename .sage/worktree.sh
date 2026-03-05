#!/usr/bin/env bash
# .sage/worktree.sh — git worktree 管理脚本
# 用法:
#   ./worktree.sh create <task-id>          创建 worktree + branch
#   ./worktree.sh remove <task-id>          清理 worktree + 删除本地 branch
#   ./worktree.sh list                      列出所有活跃 worktree
#   ./worktree.sh cleanup                   清理所有已 merged 的 worktree

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKTREE_BASE="$(dirname "$PROJECT_ROOT")"

action="${1:-help}"
task_id="${2:-}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }

case "$action" in
  create)
    if [[ -z "$task_id" ]]; then
      err "用法: $0 create <task-id>  (例: feat-memory-system)"
      exit 1
    fi

    branch="feat/${task_id}"
    worktree_path="${WORKTREE_BASE}/sage-${task_id}"

    if [[ -d "$worktree_path" ]]; then
      err "Worktree 已存在: $worktree_path"
      exit 1
    fi

    cd "$PROJECT_ROOT"
    git fetch origin main --quiet

    git worktree add -b "$branch" "$worktree_path" origin/main
    log "Worktree 创建成功: $worktree_path"
    log "Branch: $branch"

    if [[ -f "$worktree_path/app/package.json" ]]; then
      warn "正在安装 app 依赖..."
      cd "$worktree_path/app" && pnpm install --frozen-lockfile --quiet 2>/dev/null || npm install --quiet
      log "app 依赖安装完成"
    fi

    if [[ -f "$worktree_path/worker/package.json" ]]; then
      warn "正在安装 worker 依赖..."
      cd "$worktree_path/worker" && pnpm install --frozen-lockfile --quiet 2>/dev/null || npm install --quiet
      log "worker 依赖安装完成"
    fi

    echo ""
    echo "📋 下一步:"
    echo "   sessions_spawn cwd=$worktree_path task=\"...\""
    ;;

  remove)
    if [[ -z "$task_id" ]]; then
      err "用法: $0 remove <task-id>"
      exit 1
    fi

    branch="feat/${task_id}"
    worktree_path="${WORKTREE_BASE}/sage-${task_id}"

    cd "$PROJECT_ROOT"

    if [[ -d "$worktree_path" ]]; then
      git worktree remove "$worktree_path" --force
      log "Worktree 已删除: $worktree_path"
    else
      warn "Worktree 不存在: $worktree_path"
    fi

    if git branch --list "$branch" | grep -q "$branch"; then
      git branch -D "$branch" 2>/dev/null && log "Branch 已删除: $branch" || warn "Branch 删除失败: $branch"
    fi
    ;;

  list)
    cd "$PROJECT_ROOT"
    echo "📂 活跃 Worktrees:"
    echo ""
    git worktree list
    echo ""
    count=$(git worktree list | grep -c "sage-" || true)
    echo "Agent worktrees: $count"
    ;;

  cleanup)
    cd "$PROJECT_ROOT"
    echo "🧹 清理已 merged 的 worktrees..."
    echo ""

    cleaned=0
    for wt in $(git worktree list --porcelain | grep "^worktree " | awk '{print $2}'); do
      base=$(basename "$wt")
      if [[ "$base" == sage-* ]]; then
        branch=$(git worktree list --porcelain | grep -A2 "^worktree $wt" | grep "^branch " | sed 's|branch refs/heads/||')
        if [[ -n "$branch" ]]; then
          if git branch --merged origin/main | grep -q "$branch"; then
            git worktree remove "$wt" --force
            git branch -D "$branch" 2>/dev/null
            log "已清理: $wt ($branch) — 已 merged"
            ((cleaned++))
          fi
        fi
      fi
    done

    if [[ $cleaned -eq 0 ]]; then
      echo "没有需要清理的 worktree"
    else
      log "共清理 $cleaned 个 worktree"
    fi
    ;;

  help|*)
    echo "用法: $0 <action> [task-id]"
    echo ""
    echo "Actions:"
    echo "  create <task-id>   创建 worktree + branch"
    echo "  remove <task-id>   删除 worktree + branch"
    echo "  list               列出所有活跃 worktree"
    echo "  cleanup            清理所有已 merged 的 worktree"
    ;;
esac
