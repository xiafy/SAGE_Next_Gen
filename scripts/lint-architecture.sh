#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

WARN_LIMIT=500
BLOCK_LIMIT=800
ERRORS=0
WARNINGS=0

echo -e "${GREEN}▶ 架构约束检查${NC}"

# ── Rule 1: 文件行数限制 ──
echo -e "\n${YELLOW}[1/4] 文件行数检查 (警告>${WARN_LIMIT}, 阻断>${BLOCK_LIMIT})${NC}"
for f in $(find app/src worker/handlers worker/prompts worker/utils worker/schemas worker/middleware shared -name '*.ts' -o -name '*.tsx' 2>/dev/null | grep -v node_modules | grep -v '__tests__' | grep -v '.test.'); do
  [ -f "$f" ] || continue
  LINES=$(wc -l < "$f" | tr -d ' ')

  # 检查豁免列表
  if [ -f "$REPO_ROOT/.lint-ignore" ] && grep -q "^${f}" "$REPO_ROOT/.lint-ignore" 2>/dev/null; then
    if [ "$LINES" -gt "$WARN_LIMIT" ]; then
      echo -e "${YELLOW}  ⚠ EXEMPT: $f ($LINES 行, 已豁免 — 见 .lint-ignore)${NC}"
      WARNINGS=$((WARNINGS + 1))
    fi
    continue
  fi

  if [ "$LINES" -gt "$BLOCK_LIMIT" ]; then
    echo -e "${RED}  ✗ BLOCK: $f ($LINES 行 > $BLOCK_LIMIT)${NC}"
    echo -e "${RED}    修复: 将此文件拆分为更小的模块。参考 docs/architecture.md${NC}"
    echo -e "${RED}    如需临时豁免，添加到 .lint-ignore 并注明计划修复的 Sprint${NC}"
    ERRORS=$((ERRORS + 1))
  elif [ "$LINES" -gt "$WARN_LIMIT" ]; then
    echo -e "${YELLOW}  ⚠ WARN: $f ($LINES 行 > $WARN_LIMIT)${NC}"
    echo -e "${YELLOW}    建议: 考虑提取子组件/工具函数，降低单文件复杂度${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
done
[ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ] && echo -e "${GREEN}  ✓ 所有文件行数合规${NC}"

# ── Rule 2: 分层依赖检查 ──
echo -e "\n${YELLOW}[2/4] 分层依赖检查 (app/ ✗→ worker/, worker/ ✗→ app/)${NC}"

APP_IMPORTS_WORKER=$(grep -rn "from.*['\"].*worker/" app/src/ --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v node_modules | grep -v '// lint-ignore' || true)
if [ -n "$APP_IMPORTS_WORKER" ]; then
  echo -e "${RED}  ✗ app/ 直接导入了 worker/ (违反分层架构):${NC}"
  echo "$APP_IMPORTS_WORKER" | head -5
  echo -e "${RED}    修复: app/ 只能通过 shared/types.ts 共享类型，不能直接导入 worker 代码${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}  ✓ app/ → worker/ 无违规${NC}"
fi

WORKER_IMPORTS_APP=$(grep -rn "from.*['\"].*app/" worker/ --include='*.ts' 2>/dev/null | grep -v node_modules | grep -v '// lint-ignore' || true)
if [ -n "$WORKER_IMPORTS_APP" ]; then
  echo -e "${RED}  ✗ worker/ 直接导入了 app/ (违反分层架构):${NC}"
  echo "$WORKER_IMPORTS_APP" | head -5
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}  ✓ worker/ → app/ 无违规${NC}"
fi

# ── Rule 3: 假测试检测 ──
echo -e "\n${YELLOW}[3/4] 假测试检测${NC}"

FAKE_TESTS=$(grep -rln \
  -e "Simulates\|simulates" \
  -e "模拟.*实现\|模拟.*函数\|模拟.*逻辑" \
  -e "stub.*entire\|mock.*entire.*module" \
  -e "placeholder.*test\|TODO.*test\|skip.*real" \
  --include='*.test.ts' --include='*.test.tsx' \
  app/src/ 2>/dev/null || true)

if [ -n "$FAKE_TESTS" ]; then
  COUNT=$(echo "$FAKE_TESTS" | wc -l | tr -d ' ')
  echo -e "${YELLOW}  ⚠ 发现 $COUNT 个可疑测试文件:${NC}"
  echo "$FAKE_TESTS" | while read -r f; do
    MATCH=$(grep -n -m1 "Simulates\|simulates\|模拟.*实现\|stub.*entire\|placeholder.*test" "$f" 2>/dev/null || true)
    echo -e "${YELLOW}    $f: $MATCH${NC}"
  done
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}  ✓ 未发现假测试${NC}"
fi

# ── Rule 4: API Key 泄露检测 ──
echo -e "\n${YELLOW}[4/4] API Key / Secret 泄露检测${NC}"

LEAKED=$(grep -rn \
  -e "AIzaSy[A-Za-z0-9_-]\{30,\}" \
  -e "sk-[A-Za-z0-9]\{40,\}" \
  -e "BAILIAN_API_KEY\s*=\s*['\"]" \
  --include='*.ts' --include='*.tsx' --include='*.js' \
  app/src/ worker/ shared/ 2>/dev/null | grep -v '\.test\.' | grep -v 'process\.env' | grep -v 'env\.' || true)

if [ -n "$LEAKED" ]; then
  echo -e "${RED}  ✗ 可能的 API Key 泄露:${NC}"
  echo "$LEAKED" | head -5
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}  ✓ 未发现 API Key 泄露${NC}"
fi

# ── 汇总 ──
echo -e "\n${GREEN}═══ 架构检查汇总 ═══${NC}"
echo "  错误 (阻断): $ERRORS"
echo "  警告: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}  ✗ 架构检查未通过${NC}"
  exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}  ⚠ 有警告但不阻断${NC}"
else
  echo -e "${GREEN}  ✓ 全部通过${NC}"
fi
