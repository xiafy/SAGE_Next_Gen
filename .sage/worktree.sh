#!/usr/bin/env bash
# .sage/worktree.sh — git worktree 管理脚本 (v2, post-review)
# 用法:
#   ./worktree.sh create <task-id>
#   ./worktree.sh remove <task-id>
#   ./worktree.sh list
#   ./worktree.sh cleanup

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKTREE_BASE="$(dirname "$PROJECT_ROOT")"

action="${1:-help}"
task_id="${2:-}"

# 颜色（TTY 检测）
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
else
  GREEN=''; YELLOW=''; RED=''; NC=''
fi

log()  { printf "%b✓%b %s\n" "$GREEN" "$NC" "$*"; }
warn() { printf "%b⚠%b %s\n" "$YELLOW" "$NC" "$*"; }
err()  { printf "%b✗%b %s\n" "$RED" "$NC" "$*" >&2; }

# [C1 fix] task-id 输入校验
validate_task_id() {
  local id="$1"
  if [[ -z "$id" ]]; then
    err "task-id 不能为空"
    return 1
  fi
  if [[ ! "$id" =~ ^[a-zA-Z0-9._-]+$ ]]; then
    err "task-id 只允许 [a-zA-Z0-9._-]，收到: '$id'"
    return 1
  fi
}

# [C2 fix] 依赖安装函数，隔离错误处理
install_deps() {
  local dir="$1"
  local name="$2"
  warn "正在安装 ${name} 依赖..."
  if command -v pnpm &>/dev/null; then
    if pnpm install --no-frozen-lockfile --quiet -C "$dir" 2>&1; then
      log "${name} 依赖安装完成 (pnpm)"
      return 0
    fi
    warn "pnpm 失败，fallback npm..."
  fi
  if npm install --quiet --prefix "$dir"; then
    log "${name} 依赖安装完成 (npm)"
    return 0
  fi
  err "${name} 依赖安装失败"
  return 1
}

# [C3 fix] 解析 porcelain 输出为 worktree→branch 映射
# 输出格式: /path/to/worktree<TAB>branch_name (每行一个)
parse_worktree_branches() {
  git worktree list --porcelain | awk '
    /^worktree / { wt = substr($0, 10) }
    /^branch /   { br = substr($0, 8); sub(/refs\/heads\//, "", br) }
    /^$/         { if (wt != "" && br != "") print wt "\t" br; wt=""; br="" }
    END          { if (wt != "" && br != "") print wt "\t" br }
  '
}

# 前置环境检查
check_env() {
  cd "$PROJECT_ROOT" 2>/dev/null || { err "项目目录不存在: $PROJECT_ROOT"; exit 1; }
  git rev-parse --git-dir &>/dev/null || { err "不在 git 仓库中"; exit 1; }
}

case "$action" in
  create)
    validate_task_id "$task_id" || exit 1
    check_env

    branch="feat/${task_id}"
    worktree_path="${WORKTREE_BASE}/sage-${task_id}"

    if [[ -d "$worktree_path" ]]; then
      err "Worktree 已存在: $worktree_path"
      exit 1
    fi

    # [M: create 原子性] trap 回滚
    rollback() {
      warn "创建失败，回滚中..."
      git worktree remove "$worktree_path" --force 2>/dev/null || true
      git branch -D "$branch" 2>/dev/null || true
      err "已回滚 worktree 和 branch"
    }
    trap rollback ERR

    git fetch origin main --quiet
    git worktree add -b "$branch" "$worktree_path" origin/main
    log "Worktree 创建成功: $worktree_path"
    log "Branch: $branch"

    # 安装依赖（失败会触发 rollback）
    if [[ -f "$worktree_path/app/package.json" ]]; then
      install_deps "$worktree_path/app" "app"
    fi

    if [[ -f "$worktree_path/worker/package.json" ]]; then
      install_deps "$worktree_path/worker" "worker"
    fi

    trap - ERR  # 清除 trap

    echo ""
    echo "📋 下一步:"
    echo "   sessions_spawn cwd=$worktree_path task=\"...\""
    ;;

  remove)
    validate_task_id "$task_id" || exit 1
    check_env

    branch="feat/${task_id}"
    worktree_path="${WORKTREE_BASE}/sage-${task_id}"

    # [M2 fix] 用 if/else 替代 && || 链
    if [[ -d "$worktree_path" ]]; then
      git worktree remove "$worktree_path" --force
      log "Worktree 已删除: $worktree_path"
    else
      warn "Worktree 不存在: $worktree_path"
    fi

    if git branch --list "$branch" | grep -qF "$branch"; then
      git branch -D "$branch" 2>/dev/null && log "Branch 已删除: $branch" || warn "Branch 删除失败: $branch"
    fi
    ;;

  list)
    check_env
    echo "📂 活跃 Worktrees:"
    echo ""
    git worktree list
    echo ""
    count=$(git worktree list | grep -c "sage-" || true)
    echo "Agent worktrees: $count"
    ;;

  cleanup)
    check_env

    # [M: cleanup 先 fetch]
    git fetch origin main --quiet || warn "fetch 失败，使用本地 origin/main 状态"

    echo "🧹 清理已 merged 的 worktrees..."
    echo ""
    cleaned=0

    # [C3 fix + M3 fix] 一次性解析，缓存结果
    while IFS=$'\t' read -r wt branch; do
      base=$(basename "$wt")
      if [[ "$base" == sage-* ]]; then
        if git branch --merged origin/main | grep -qF "$branch"; then
          git worktree remove "$wt" --force
          git branch -D "$branch" 2>/dev/null || true
          log "已清理: $wt ($branch) — 已 merged"
          cleaned=$((cleaned + 1))  # [M1 fix] 避免 (( )) set -e 地雷
        fi
      fi
    done < <(parse_worktree_branches)

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
    echo "  create <task-id>   创建 worktree + branch + 安装依赖"
    echo "  remove <task-id>   删除 worktree + branch"
    echo "  list               列出所有活跃 worktree"
    echo "  cleanup            清理所有已 merged 的 worktree"
    echo ""
    echo "task-id 规则: 只允许 [a-zA-Z0-9._-]"
    ;;
esac
