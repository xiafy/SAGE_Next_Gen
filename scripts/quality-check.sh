#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo -e "${GREEN}═══ SAGE 质量扫描 $(date '+%Y-%m-%d %H:%M') ═══${NC}\n"

# 1. 编译状态
echo -e "${YELLOW}▶ TypeScript 编译${NC}"
APP_TSC=0; WORKER_TSC=0
( cd app && npx tsc --noEmit 2>&1 ) && echo -e "${GREEN}  ✓ app/ 通过${NC}" || { echo -e "${RED}  ✗ app/ 失败${NC}"; APP_TSC=1; }
( cd worker && npx tsc --noEmit 2>&1 ) && echo -e "${GREEN}  ✓ worker/ 通过${NC}" || { echo -e "${RED}  ✗ worker/ 失败${NC}"; WORKER_TSC=1; }

# 2. 测试状态
echo -e "\n${YELLOW}▶ 测试${NC}"
TEST_RESULT=0
( cd app && npx vitest run --reporter=dot 2>&1 ) || TEST_RESULT=1
if [ "$TEST_RESULT" -eq 0 ]; then
  echo -e "${GREEN}  ✓ 全部通过${NC}"
else
  echo -e "${RED}  ✗ 有测试失败${NC}"
fi

# 3. 技术债
echo -e "\n${YELLOW}▶ 技术债扫描${NC}"
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" app/src/ worker/handlers/ worker/prompts/ worker/utils/ worker/schemas/ worker/middleware/ 2>/dev/null | wc -l | tr -d ' ')
echo "  TODO/FIXME/HACK: $TODO_COUNT 处"
if [ "$TODO_COUNT" -gt 0 ]; then
  grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" app/src/ worker/handlers/ worker/prompts/ worker/utils/ worker/schemas/ worker/middleware/ 2>/dev/null | head -10
fi

# 4. Git 状态
echo -e "\n${YELLOW}▶ Git 状态${NC}"
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
echo "  未推送 commits: $UNPUSHED"
echo "  未提交变更: $UNCOMMITTED"

# 5. 测试覆盖率摘要
echo -e "\n${YELLOW}▶ 文件统计${NC}"
TEST_FILES=$(find app/src -name "*.test.*" | wc -l | tr -d ' ')
SRC_FILES=$(find app/src -name "*.ts" -o -name "*.tsx" | grep -v test | grep -v __tests__ | wc -l | tr -d ' ')
echo "  源文件: $SRC_FILES / 测试文件: $TEST_FILES"

# 汇总
echo -e "\n${GREEN}═══ 汇总 ═══${NC}"
SCORE=0
[ "$APP_TSC" -eq 0 ] && SCORE=$((SCORE+1))
[ "$WORKER_TSC" -eq 0 ] && SCORE=$((SCORE+1))
[ "$TEST_RESULT" -eq 0 ] && SCORE=$((SCORE+1))
[ "$UNPUSHED" -eq 0 ] && SCORE=$((SCORE+1))
echo "  质量评分: $SCORE/4"
[ "$SCORE" -eq 4 ] && echo -e "${GREEN}  ✅ 全绿${NC}" || echo -e "${YELLOW}  ⚠️  有待修复项${NC}"
